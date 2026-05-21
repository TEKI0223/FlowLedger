"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, transactions } from "@/db/schema";
import {
  currencies,
  formatMinorForInput,
  getTransactionBalanceImpacts,
  parseMoneyToMinor,
  transactionTypes,
  type Currency,
  type Transaction,
  type TransactionType,
} from "@/domain/finance";
import { getQuickEntryTemplate, getTemporaryEntryDefaults } from "@/features/quick-entry/data";
import { nowIso, todayIsoDate } from "@/lib/dates";

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

export async function createTransaction(formData: FormData) {
  const transaction = await parseTransactionForm(formData, crypto.randomUUID(), "/transactions");

  createTransactionRecord(transaction);

  revalidateTransactionPaths(transaction.id);
  redirect("/transactions");
}

export async function createQuickEntryTransaction(templateId: string, formData: FormData) {
  const template = await getQuickEntryTemplate(templateId);

  if (!template) {
    redirectWithError("/", "快捷模板不存在或已停用");
  }

  const quickFormData = new FormData();
  const amount = normalizeOptional(formData.get("amount"));

  if (!amount && template.amountMinor === null) {
    redirectWithError(`/quick-entry/${templateId}`, "请输入金额");
  }

  quickFormData.set("occurredOn", normalizeOptional(formData.get("occurredOn")) ?? todayIsoDate());
  quickFormData.set("type", template.type);
  quickFormData.set(
    "amount",
    amount ??
      formatMinorForInput({
        amountMinor: template.amountMinor ?? 0,
        currency: template.currency,
      }),
  );
  quickFormData.set("currency", template.currency);
  setOptionalFormValue(quickFormData, "categoryId", template.categoryId);
  setOptionalFormValue(quickFormData, "sourceAccountId", template.sourceAccountId);
  setOptionalFormValue(quickFormData, "targetAccountId", template.targetAccountId);
  setOptionalFormValue(quickFormData, "paymentMethodId", template.paymentMethodId);
  setOptionalFormValue(
    quickFormData,
    "note",
    normalizeOptional(formData.get("note")) ?? template.note,
  );

  const transaction = await parseTransactionForm(
    quickFormData,
    crypto.randomUUID(),
    `/quick-entry/${templateId}`,
  );

  createTransactionRecord(transaction);

  revalidateTransactionPaths(transaction.id);
  redirect("/?saved=quick-entry");
}

export async function createTemporaryTransaction(formData: FormData) {
  const defaults = await getTemporaryEntryDefaults();

  if (!defaults) {
    redirectWithError("/quick-entry/temp", "需要先创建一个 JPY 账户才能保存临时记录");
  }

  const quickFormData = new FormData();
  const userNote = normalizeOptional(formData.get("note"));

  quickFormData.set("occurredOn", normalizeOptional(formData.get("occurredOn")) ?? todayIsoDate());
  quickFormData.set("type", "expense");
  quickFormData.set("amount", normalizeOptional(formData.get("amount")) ?? "");
  quickFormData.set("currency", "JPY");
  setOptionalFormValue(quickFormData, "categoryId", defaults.categoryId);
  setOptionalFormValue(quickFormData, "sourceAccountId", defaults.sourceAccountId);
  setOptionalFormValue(quickFormData, "paymentMethodId", defaults.paymentMethodId);
  quickFormData.set("note", userNote ? `临时记录，待补全：${userNote}` : "临时记录，待补全");

  const transaction = await parseTransactionForm(
    quickFormData,
    crypto.randomUUID(),
    "/quick-entry/temp",
  );

  createTransactionRecord(transaction);

  revalidateTransactionPaths(transaction.id);
  redirect("/?saved=temporary");
}

function createTransactionRecord(transaction: Transaction) {
  const timestamp = nowIso();

  db.transaction((tx) => {
    tx.insert(transactions)
      .values({
        id: transaction.id,
        occurredOn: transaction.occurredOn,
        type: transaction.type,
        amountMinor: transaction.money.amountMinor,
        currency: transaction.money.currency,
        categoryId: transaction.categoryId,
        sourceAccountId: transaction.sourceAccountId,
        targetAccountId: transaction.targetAccountId,
        paymentMethodId: transaction.paymentMethodId,
        includeInExpenseStats: transaction.type === "expense",
        includeInCashflowStats: transaction.type !== "adjustment",
        note: transaction.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    applyBalanceImpacts(tx, getTransactionBalanceImpacts(transaction), timestamp);
  });
}

export async function updateTransaction(id: string, formData: FormData) {
  const previous = await getExistingTransaction(id, `/transactions/${id}`);
  const next = await parseTransactionForm(formData, id, `/transactions/${id}`);
  const timestamp = nowIso();

  db.transaction((tx) => {
    applyBalanceImpacts(tx, invertImpacts(getTransactionBalanceImpacts(previous)), timestamp);

    tx.update(transactions)
      .set({
        occurredOn: next.occurredOn,
        type: next.type,
        amountMinor: next.money.amountMinor,
        currency: next.money.currency,
        categoryId: next.categoryId,
        sourceAccountId: next.sourceAccountId,
        targetAccountId: next.targetAccountId,
        paymentMethodId: next.paymentMethodId,
        includeInExpenseStats: next.type === "expense",
        includeInCashflowStats: next.type !== "adjustment",
        note: next.note,
        updatedAt: timestamp,
      })
      .where(eq(transactions.id, id))
      .run();

    applyBalanceImpacts(tx, getTransactionBalanceImpacts(next), timestamp);
  });

  revalidateTransactionPaths(id);
  redirect("/transactions");
}

export async function deleteTransaction(id: string) {
  const previous = await getExistingTransaction(id, "/transactions");
  const timestamp = nowIso();

  db.transaction((tx) => {
    applyBalanceImpacts(tx, invertImpacts(getTransactionBalanceImpacts(previous)), timestamp);
    tx.delete(transactions).where(eq(transactions.id, id)).run();
  });

  revalidateTransactionPaths(id);
  redirect("/transactions");
}

function normalizeOptional(value: FormDataEntryValue | null) {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized.length > 0 ? normalized : undefined;
}

function setOptionalFormValue(formData: FormData, name: string, value: string | null | undefined) {
  if (value) {
    formData.set(name, value);
  }
}

async function parseTransactionForm(
  formData: FormData,
  id: string,
  errorPath: string,
): Promise<Transaction> {
  const result = transactionSchema.safeParse({
    occurredOn: formData.get("occurredOn") || todayIsoDate(),
    type: formData.get("type"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    categoryId: normalizeOptional(formData.get("categoryId")),
    sourceAccountId: normalizeOptional(formData.get("sourceAccountId")),
    targetAccountId: normalizeOptional(formData.get("targetAccountId")),
    paymentMethodId: normalizeOptional(formData.get("paymentMethodId")),
    note: normalizeOptional(formData.get("note")),
  });

  if (!result.success) {
    redirectWithError(errorPath, result.error.issues[0]?.message ?? "交易内容不完整");
  }

  const parsed = result.data;
  let rawAmountMinor: number;

  try {
    rawAmountMinor = parseMoneyToMinor(parsed.amount, parsed.currency);
  } catch (error) {
    redirectWithError(errorPath, error instanceof Error ? error.message : "金额格式不正确");
  }

  const amountMinor = parsed.type === "adjustment" ? rawAmountMinor : Math.abs(rawAmountMinor);

  if (amountMinor === 0) {
    redirectWithError(errorPath, "金额不能为 0");
  }

  try {
    assertRequiredAccounts(parsed);
    await assertAccountCurrencies(parsed.sourceAccountId, parsed.targetAccountId, parsed.currency);
  } catch (error) {
    redirectWithError(errorPath, error instanceof Error ? error.message : "交易账户不正确");
  }

  return {
    id,
    occurredOn: parsed.occurredOn,
    type: parsed.type,
    money: {
      amountMinor,
      currency: parsed.currency,
    },
    categoryId: parsed.categoryId,
    sourceAccountId: parsed.sourceAccountId,
    targetAccountId: parsed.targetAccountId,
    paymentMethodId: parsed.paymentMethodId,
    note: parsed.note,
  };
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

  if (ids.length === 0) {
    return;
  }

  const accountRows = await db.select().from(accounts).where(inArray(accounts.id, ids));
  const accountById = new Map(accountRows.map((account) => [account.id, account]));

  for (const id of ids) {
    const account = accountById.get(id);

    if (!account) {
      throw new Error("选择的账户不存在");
    }

    if (account.currency !== currency) {
      throw new Error("交易币种必须和所选账户币种一致");
    }
  }
}

async function getExistingTransaction(id: string, errorPath: string): Promise<Transaction> {
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);

  if (!row) {
    redirectWithError(errorPath, "交易不存在或已被删除");
  }

  return rowToTransaction(row);
}

function rowToTransaction(row: {
  id: string;
  occurredOn: string;
  postedOn: string | null;
  type: TransactionType;
  amountMinor: number;
  currency: Currency;
  categoryId: string | null;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  paymentMethodId: string | null;
  note: string | null;
}): Transaction {
  return {
    id: row.id,
    occurredOn: row.occurredOn,
    postedOn: row.postedOn ?? undefined,
    type: row.type,
    money: {
      amountMinor: row.amountMinor,
      currency: row.currency,
    },
    categoryId: row.categoryId ?? undefined,
    sourceAccountId: row.sourceAccountId ?? undefined,
    targetAccountId: row.targetAccountId ?? undefined,
    paymentMethodId: row.paymentMethodId ?? undefined,
    note: row.note ?? undefined,
  };
}

function applyBalanceImpacts(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  impacts: Array<{ accountId: string; amountMinor: number }>,
  timestamp: string,
) {
  for (const impact of impacts) {
    tx.update(accounts)
      .set({
        balanceMinor: sql`${accounts.balanceMinor} + ${impact.amountMinor}`,
        updatedAt: timestamp,
      })
      .where(eq(accounts.id, impact.accountId))
      .run();
  }
}

function invertImpacts(impacts: Array<{ accountId: string; amountMinor: number }>) {
  return impacts.map((impact) => ({
    ...impact,
    amountMinor: -impact.amountMinor,
  }));
}

function revalidateTransactionPaths(id: string) {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath(`/transactions/${id}`);
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
