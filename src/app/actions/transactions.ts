"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts } from "@/db/schema";
import {
  currencies,
  formatMinorForInput,
  parseMoneyToMinor,
  transactionTypes,
  type Currency,
  type Transaction,
} from "@/domain/finance";
import { getQuickEntryTemplate, getTemporaryEntryDefaults } from "@/features/quick-entry/data";
import { bumpQuickEntryTemplateUsage } from "@/features/quick-entry/service";
import {
  createTransactionRecord,
  deleteTransactionRecord,
  loadTransaction,
  replaceTransactionRecord,
} from "@/features/transactions/service";
import { todayIsoDate } from "@/lib/dates";
import { normalize, stringField } from "@/lib/form";
import { revalidatePaths, transactionPaths } from "@/lib/revalidate";

const transactionSchema = z.object({
  occurredOn: z.string().trim().min(1),
  type: z.enum(transactionTypes),
  amount: z.string().trim().min(1, "请输入金额"),
  currency: z.enum(currencies),
  categoryId: z.string().trim().optional(),
  sourceAccountId: z.string().trim().optional(),
  targetAccountId: z.string().trim().optional(),
  paymentMethodId: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type TransactionFormValues = {
  occurredOn?: string;
  type?: string;
  amount?: string;
  currency?: string;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
};

export type TransactionActionState = {
  error?: string;
  values?: TransactionFormValues;
};

function extractValues(formData: FormData): TransactionFormValues {
  return {
    occurredOn: stringField(formData, "occurredOn"),
    type: stringField(formData, "type"),
    amount: stringField(formData, "amount"),
    currency: stringField(formData, "currency"),
    categoryId: stringField(formData, "categoryId"),
    sourceAccountId: stringField(formData, "sourceAccountId"),
    targetAccountId: stringField(formData, "targetAccountId"),
    paymentMethodId: stringField(formData, "paymentMethodId"),
    note: stringField(formData, "note"),
  };
}

export async function createTransaction(
  _prev: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const result = await buildTransactionFromForm(formData, crypto.randomUUID());
  if (!result.ok) return { error: result.error, values: result.values };

  await createTransactionRecord(result.transaction);
  revalidatePaths(transactionPaths(result.transaction.id));
  redirect("/transactions");
}

export async function updateTransaction(
  id: string,
  _prev: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const previous = await loadTransaction(id);
  if (!previous) {
    return { error: "交易不存在或已被删除", values: extractValues(formData) };
  }

  const result = await buildTransactionFromForm(formData, id);
  if (!result.ok) return { error: result.error, values: result.values };

  await replaceTransactionRecord(id, previous, result.transaction);
  revalidatePaths(transactionPaths(id));
  redirect("/transactions");
}

export async function deleteTransaction(id: string) {
  const previous = await loadTransaction(id);
  if (!previous) return;

  await deleteTransactionRecord(previous);
  revalidatePaths(transactionPaths(id));
  redirect("/transactions");
}

export async function createQuickEntryTransaction(
  templateId: string,
  _prev: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const template = await getQuickEntryTemplate(templateId);
  if (!template) {
    return { error: "快捷模板不存在或已停用", values: extractValues(formData) };
  }

  const amount = normalize(stringField(formData, "amount"));
  if (!amount && template.amountMinor === null) {
    return { error: "请输入金额", values: extractValues(formData) };
  }

  const synthetic = new FormData();
  synthetic.set("occurredOn", normalize(stringField(formData, "occurredOn")) ?? todayIsoDate());
  synthetic.set("type", template.type);
  synthetic.set(
    "amount",
    amount ??
      formatMinorForInput({
        amountMinor: template.amountMinor ?? 0,
        currency: template.currency,
      }),
  );
  synthetic.set("currency", template.currency);
  setOptionalFormValue(synthetic, "categoryId", template.categoryId);
  setOptionalFormValue(synthetic, "sourceAccountId", template.sourceAccountId);
  setOptionalFormValue(synthetic, "targetAccountId", template.targetAccountId);
  setOptionalFormValue(synthetic, "paymentMethodId", template.paymentMethodId);
  setOptionalFormValue(
    synthetic,
    "note",
    normalize(stringField(formData, "note")) ?? template.note,
  );

  const result = await buildTransactionFromForm(synthetic, crypto.randomUUID());
  if (!result.ok) return { error: result.error, values: extractValues(formData) };

  await createTransactionRecord(result.transaction);
  await bumpQuickEntryTemplateUsage(template.id);
  revalidatePaths(transactionPaths(result.transaction.id));
  redirect("/?saved=quick-entry");
}

export async function createTemporaryTransaction(
  _prev: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const defaults = await getTemporaryEntryDefaults();
  if (!defaults) {
    return {
      error: "需要先创建一个 JPY 账户才能保存临时记录",
      values: extractValues(formData),
    };
  }

  const userNote = normalize(stringField(formData, "note"));
  const synthetic = new FormData();
  synthetic.set("occurredOn", normalize(stringField(formData, "occurredOn")) ?? todayIsoDate());
  synthetic.set("type", "expense");
  synthetic.set("amount", normalize(stringField(formData, "amount")) ?? "");
  synthetic.set("currency", "JPY");
  setOptionalFormValue(synthetic, "categoryId", defaults.categoryId);
  setOptionalFormValue(synthetic, "sourceAccountId", defaults.sourceAccountId);
  setOptionalFormValue(synthetic, "paymentMethodId", defaults.paymentMethodId);
  synthetic.set("note", userNote ? `临时记录，待补全：${userNote}` : "临时记录，待补全");

  const result = await buildTransactionFromForm(synthetic, crypto.randomUUID());
  if (!result.ok) return { error: result.error, values: extractValues(formData) };

  await createTransactionRecord(result.transaction);
  revalidatePaths(transactionPaths(result.transaction.id));
  redirect("/?saved=temporary");
}

// ── 内部：表单 → Transaction 的解析 + 业务校验 ────────────────────────────

type BuildResult =
  | { ok: true; transaction: Transaction }
  | { ok: false; error: string; values: TransactionFormValues };

async function buildTransactionFromForm(formData: FormData, id: string): Promise<BuildResult> {
  const values = extractValues(formData);

  const result = transactionSchema.safeParse({
    occurredOn: values.occurredOn || todayIsoDate(),
    type: values.type,
    amount: values.amount,
    currency: values.currency,
    categoryId: normalize(values.categoryId),
    sourceAccountId: normalize(values.sourceAccountId),
    targetAccountId: normalize(values.targetAccountId),
    paymentMethodId: normalize(values.paymentMethodId),
    note: normalize(values.note),
  });

  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues[0]?.message ?? "交易内容不完整",
      values,
    };
  }

  const parsed = result.data;
  let rawAmountMinor: number;

  try {
    rawAmountMinor = parseMoneyToMinor(parsed.amount, parsed.currency);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "金额格式不正确",
      values,
    };
  }

  const amountMinor = parsed.type === "adjustment" ? rawAmountMinor : Math.abs(rawAmountMinor);
  if (amountMinor === 0) {
    return { ok: false, error: "金额不能为 0", values };
  }

  try {
    assertRequiredAccounts(parsed);
    await assertAccountCurrencies(parsed.sourceAccountId, parsed.targetAccountId, parsed.currency);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "交易账户不正确",
      values,
    };
  }

  return {
    ok: true,
    transaction: {
      id,
      occurredOn: parsed.occurredOn,
      type: parsed.type,
      money: { amountMinor, currency: parsed.currency },
      categoryId: parsed.categoryId,
      sourceAccountId: parsed.sourceAccountId,
      targetAccountId: parsed.targetAccountId,
      paymentMethodId: parsed.paymentMethodId,
      note: parsed.note,
    },
  };
}

function setOptionalFormValue(formData: FormData, name: string, value: string | null | undefined) {
  if (value) formData.set(name, value);
}

function assertRequiredAccounts(transaction: z.infer<typeof transactionSchema>) {
  if (transaction.type === "income" && !transaction.targetAccountId) {
    throw new Error("收入需要选择入账账户");
  }
  if (transaction.type === "expense" && !transaction.sourceAccountId) {
    throw new Error("支出需要选择付款账户");
  }
  if (
    transaction.type === "transfer" &&
    (!transaction.sourceAccountId || !transaction.targetAccountId)
  ) {
    throw new Error("转账需要选择转出账户和转入账户");
  }
  if (
    transaction.type === "transfer" &&
    transaction.sourceAccountId === transaction.targetAccountId
  ) {
    throw new Error("转出账户和转入账户不能相同");
  }
  if (transaction.type === "adjustment" && !transaction.targetAccountId) {
    throw new Error("调整需要选择校准账户");
  }
}

async function assertAccountCurrencies(
  sourceAccountId: string | undefined,
  targetAccountId: string | undefined,
  currency: Currency,
) {
  const ids = [sourceAccountId, targetAccountId].filter((id): id is string => Boolean(id));
  if (ids.length === 0) return;

  const accountRows = await db.select().from(accounts).where(inArray(accounts.id, ids));
  const accountById = new Map(accountRows.map((account) => [account.id, account]));

  for (const id of ids) {
    const account = accountById.get(id);
    if (!account) throw new Error("选择的账户不存在");
    if (account.currency !== currency) throw new Error("交易币种必须和所选账户币种一致");
  }
}
