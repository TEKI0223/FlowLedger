"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, recurringItems, transactions } from "@/db/schema";
import {
  currencies,
  getTransactionBalanceImpacts,
  parseMoneyToMinor,
  type Currency,
  type Transaction,
} from "@/domain/finance";
import { getNextOccurrence, recurringFrequencies } from "@/domain/recurring";
import { nowIso } from "@/lib/dates";

const recurringSchema = z
  .object({
    name: z.string().trim().min(1, "请输入名称"),
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.string().trim().optional(),
    amountFixed: z.boolean(),
    currency: z.enum(currencies),
    frequency: z.enum(recurringFrequencies),
    nextDate: z.string().trim().min(1, "请选择下次发生日期"),
    categoryId: z.string().trim().optional(),
    sourceAccountId: z.string().trim().optional(),
    targetAccountId: z.string().trim().optional(),
    paymentMethodId: z.string().trim().optional(),
    note: z.string().trim().optional(),
    enabled: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.amountFixed && (!data.amount || data.amount.trim() === "")) {
        return false;
      }
      return true;
    },
    { message: "固定金额时需要填写金额", path: ["amount"] },
  );

export type RecurringFormValues = {
  name?: string;
  type?: string;
  amount?: string;
  amountFixed?: boolean;
  currency?: string;
  frequency?: string;
  nextDate?: string;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
  enabled?: boolean;
};

export type RecurringActionState = {
  error?: string;
  values?: RecurringFormValues;
};

function field(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extract(formData: FormData): RecurringFormValues {
  return {
    name: field(formData, "name"),
    type: field(formData, "type"),
    amount: field(formData, "amount"),
    amountFixed: formData.get("amountFixed") === "on",
    currency: field(formData, "currency"),
    frequency: field(formData, "frequency"),
    nextDate: field(formData, "nextDate"),
    categoryId: field(formData, "categoryId"),
    sourceAccountId: field(formData, "sourceAccountId"),
    targetAccountId: field(formData, "targetAccountId"),
    paymentMethodId: field(formData, "paymentMethodId"),
    note: field(formData, "note"),
    // 未传 enabled 时（例如表单未渲染该复选框）默认启用
    enabled: formData.has("enabled") ? formData.get("enabled") === "on" : true,
  };
}

function parseAmount(
  rawAmount: string | undefined,
  amountFixed: boolean,
  currency: "JPY" | "CNY",
): { ok: true; amountMinor: number | null } | { ok: false; error: string } {
  if (!rawAmount || rawAmount.trim() === "") {
    if (amountFixed) {
      return { ok: false, error: "固定金额时需要填写金额" };
    }
    return { ok: true, amountMinor: null };
  }

  try {
    const minor = Math.abs(parseMoneyToMinor(rawAmount, currency));
    return { ok: true, amountMinor: minor };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "金额格式不正确" };
  }
}

export async function createRecurringItem(
  _prev: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const values = extract(formData);

  const result = recurringSchema.safeParse({
    name: values.name,
    type: values.type,
    amount: values.amount,
    amountFixed: values.amountFixed,
    currency: values.currency,
    frequency: values.frequency,
    nextDate: values.nextDate,
    categoryId: normalize(values.categoryId),
    sourceAccountId: normalize(values.sourceAccountId),
    targetAccountId: normalize(values.targetAccountId),
    paymentMethodId: normalize(values.paymentMethodId),
    note: normalize(values.note),
    enabled: values.enabled,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "周期项内容不完整", values };
  }

  const parsed = result.data;
  const amountResult = parseAmount(parsed.amount, parsed.amountFixed, parsed.currency);

  if (!amountResult.ok) {
    return { error: amountResult.error, values };
  }

  const timestamp = nowIso();

  await db
    .insert(recurringItems)
    .values({
      id: crypto.randomUUID(),
      name: parsed.name,
      type: parsed.type,
      amountMinor: amountResult.amountMinor,
      amountFixed: parsed.amountFixed,
      currency: parsed.currency,
      frequency: parsed.frequency,
      nextDate: parsed.nextDate,
      categoryId: parsed.categoryId,
      sourceAccountId: parsed.sourceAccountId,
      targetAccountId: parsed.targetAccountId,
      paymentMethodId: parsed.paymentMethodId,
      note: parsed.note,
      enabled: parsed.enabled,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function updateRecurringItem(
  id: string,
  _prev: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const values = extract(formData);

  const result = recurringSchema.safeParse({
    name: values.name,
    type: values.type,
    amount: values.amount,
    amountFixed: values.amountFixed,
    currency: values.currency,
    frequency: values.frequency,
    nextDate: values.nextDate,
    categoryId: normalize(values.categoryId),
    sourceAccountId: normalize(values.sourceAccountId),
    targetAccountId: normalize(values.targetAccountId),
    paymentMethodId: normalize(values.paymentMethodId),
    note: normalize(values.note),
    enabled: values.enabled,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "周期项内容不完整", values };
  }

  const parsed = result.data;
  const amountResult = parseAmount(parsed.amount, parsed.amountFixed, parsed.currency);

  if (!amountResult.ok) {
    return { error: amountResult.error, values };
  }

  await db
    .update(recurringItems)
    .set({
      name: parsed.name,
      type: parsed.type,
      amountMinor: amountResult.amountMinor,
      amountFixed: parsed.amountFixed,
      currency: parsed.currency,
      frequency: parsed.frequency,
      nextDate: parsed.nextDate,
      categoryId: parsed.categoryId,
      sourceAccountId: parsed.sourceAccountId,
      targetAccountId: parsed.targetAccountId,
      paymentMethodId: parsed.paymentMethodId,
      note: parsed.note,
      enabled: parsed.enabled,
      updatedAt: nowIso(),
    })
    .where(eq(recurringItems.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/recurring");
  revalidatePath(`/recurring/${id}`);
  redirect("/recurring");
}

export async function deleteRecurringItem(id: string) {
  await db.delete(recurringItems).where(eq(recurringItems.id, id)).run();

  revalidatePath("/");
  revalidatePath("/recurring");
  redirect("/recurring");
}

// ── 确认与跳过 ───────────────────────────────────────────────────────────

export type ConfirmFormValues = {
  amount?: string;
  occurredOn?: string;
  note?: string;
};

export type ConfirmActionState = {
  error?: string;
  values?: ConfirmFormValues;
};

export async function confirmRecurringItem(
  id: string,
  _prev: ConfirmActionState,
  formData: FormData,
): Promise<ConfirmActionState> {
  const values: ConfirmFormValues = {
    amount: field(formData, "amount"),
    occurredOn: field(formData, "occurredOn"),
    note: field(formData, "note"),
  };

  const [row] = await db.select().from(recurringItems).where(eq(recurringItems.id, id)).limit(1);

  if (!row) {
    return { error: "周期项不存在或已被删除", values };
  }

  // 解析金额：固定则用模板自带，可由用户覆盖；变动金额必填
  const userAmountRaw = normalize(values.amount);
  let amountMinor: number;

  try {
    if (userAmountRaw) {
      amountMinor = Math.abs(parseMoneyToMinor(userAmountRaw, row.currency));
    } else if (row.amountMinor !== null && row.amountMinor !== undefined) {
      amountMinor = row.amountMinor;
    } else {
      return { error: "请输入金额", values };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "金额格式不正确", values };
  }

  if (amountMinor === 0) {
    return { error: "金额不能为 0", values };
  }

  const occurredOn = normalize(values.occurredOn) ?? row.nextDate;
  const noteFromUser = normalize(values.note);
  const noteFromTemplate = row.note ?? undefined;
  const note = noteFromUser ?? noteFromTemplate;

  // 账户币种校验
  try {
    await assertAccountCurrencies(
      row.sourceAccountId,
      row.targetAccountId,
      row.currency as Currency,
    );
    assertRequiredAccountsForRecurring(row);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "账户配置不完整", values };
  }

  const transaction: Transaction = {
    id: crypto.randomUUID(),
    occurredOn,
    type: row.type,
    money: { amountMinor, currency: row.currency as Currency },
    categoryId: row.categoryId ?? undefined,
    sourceAccountId: row.sourceAccountId ?? undefined,
    targetAccountId: row.targetAccountId ?? undefined,
    paymentMethodId: row.paymentMethodId ?? undefined,
    note,
  };

  const nextDate = getNextOccurrence(row.nextDate, row.frequency);
  const timestamp = nowIso();

  await db.transaction(async (tx) => {
    await tx
      .insert(transactions)
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
        recurringItemId: row.id,
        includeInExpenseStats: transaction.type === "expense",
        includeInCashflowStats: true,
        note: transaction.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    for (const impact of getTransactionBalanceImpacts(transaction)) {
      await tx
        .update(accounts)
        .set({
          balanceMinor: sql`${accounts.balanceMinor} + ${impact.amountMinor}`,
          updatedAt: timestamp,
        })
        .where(eq(accounts.id, impact.accountId))
        .run();
    }

    await tx
      .update(recurringItems)
      .set({ nextDate, updatedAt: timestamp })
      .where(eq(recurringItems.id, row.id))
      .run();
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
  revalidatePath("/recurring/pending");
  redirect("/recurring/pending?confirmed=1");
}

export async function skipRecurringItem(id: string) {
  const [row] = await db.select().from(recurringItems).where(eq(recurringItems.id, id)).limit(1);

  if (!row) {
    return;
  }

  const nextDate = getNextOccurrence(row.nextDate, row.frequency);

  await db
    .update(recurringItems)
    .set({ nextDate, updatedAt: nowIso() })
    .where(eq(recurringItems.id, row.id))
    .run();

  revalidatePath("/");
  revalidatePath("/recurring");
  revalidatePath("/recurring/pending");
  redirect("/recurring/pending?skipped=1");
}

async function assertAccountCurrencies(
  sourceAccountId: string | null,
  targetAccountId: string | null,
  currency: Currency,
) {
  const ids = [sourceAccountId, targetAccountId].filter((value): value is string => Boolean(value));
  if (ids.length === 0) return;

  const rows = await db.select().from(accounts).where(inArray(accounts.id, ids));
  const map = new Map(rows.map((account) => [account.id, account]));

  for (const id of ids) {
    const account = map.get(id);
    if (!account) throw new Error("周期项使用的账户不存在");
    if (account.currency !== currency) throw new Error("交易币种必须和所选账户币种一致");
  }
}

function assertRequiredAccountsForRecurring(row: {
  type: "income" | "expense" | "transfer";
  sourceAccountId: string | null;
  targetAccountId: string | null;
}) {
  if (row.type === "income" && !row.targetAccountId) {
    throw new Error("收入需要在周期项里设置入账账户");
  }
  if (row.type === "expense" && !row.sourceAccountId) {
    throw new Error("支出需要在周期项里设置付款账户");
  }
  if (row.type === "transfer" && (!row.sourceAccountId || !row.targetAccountId)) {
    throw new Error("转账需要同时设置转出账户和转入账户");
  }
  if (
    row.type === "transfer" &&
    row.sourceAccountId &&
    row.sourceAccountId === row.targetAccountId
  ) {
    throw new Error("转出账户和转入账户不能相同");
  }
}

