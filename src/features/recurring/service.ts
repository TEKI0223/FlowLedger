import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recurringItems, transactions } from "@/db/schema";
import { getTransactionBalanceImpacts, type Currency, type Transaction } from "@/domain/finance";
import { getNextOccurrence, type RecurringFrequency } from "@/domain/recurring";
import { applyBalanceImpacts } from "@/features/transactions/service";
import { getCurrentUserId } from "@/lib/auth";
import { nowIso } from "@/lib/dates";

export type RecurringInput = {
  name: string;
  type: "income" | "expense" | "transfer";
  amountMinor: number | null;
  amountFixed: boolean;
  currency: Currency;
  frequency: RecurringFrequency;
  nextDate: string;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
  enabled: boolean;
};

export async function createRecurringItemRecord(input: RecurringInput): Promise<string> {
  const ownerUserId = await getCurrentUserId();
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  await db
    .insert(recurringItems)
    .values({
      id,
      ownerUserId,
      name: input.name,
      type: input.type,
      amountMinor: input.amountMinor,
      amountFixed: input.amountFixed,
      currency: input.currency,
      frequency: input.frequency,
      nextDate: input.nextDate,
      categoryId: input.categoryId,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      paymentMethodId: input.paymentMethodId,
      note: input.note,
      enabled: input.enabled,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return id;
}

export async function updateRecurringItemRecord(id: string, input: RecurringInput): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  await db
    .update(recurringItems)
    .set({
      name: input.name,
      type: input.type,
      amountMinor: input.amountMinor,
      amountFixed: input.amountFixed,
      currency: input.currency,
      frequency: input.frequency,
      nextDate: input.nextDate,
      categoryId: input.categoryId,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      paymentMethodId: input.paymentMethodId,
      note: input.note,
      enabled: input.enabled,
      updatedAt: nowIso(),
    })
    .where(and(eq(recurringItems.id, id), eq(recurringItems.ownerUserId, ownerUserId)))
    .run();
}

export async function deleteRecurringItemRecord(id: string): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  await db
    .delete(recurringItems)
    .where(and(eq(recurringItems.id, id), eq(recurringItems.ownerUserId, ownerUserId)))
    .run();
}

/** 跳过：仅推进 nextDate，不写交易。 */
export async function skipRecurringItemRecord(id: string): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  const [row] = await db
    .select()
    .from(recurringItems)
    .where(and(eq(recurringItems.id, id), eq(recurringItems.ownerUserId, ownerUserId)))
    .limit(1);
  if (!row) return;

  const nextDate = getNextOccurrence(row.nextDate, row.frequency);
  await db
    .update(recurringItems)
    .set({ nextDate, updatedAt: nowIso() })
    .where(and(eq(recurringItems.id, row.id), eq(recurringItems.ownerUserId, ownerUserId)))
    .run();
}

/**
 * 在同一事务里：写一笔交易 + 应用账户余额影响 + 推进 nextDate。
 * 用于确认周期项。
 */
export async function confirmRecurringItemAtomic(params: {
  recurringItemId: string;
  recurringNextDate: string;
  recurringFrequency: RecurringFrequency;
  transaction: Transaction;
}): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  const { recurringItemId, recurringNextDate, recurringFrequency, transaction } = params;
  const timestamp = nowIso();
  const newNextDate = getNextOccurrence(recurringNextDate, recurringFrequency);

  await db.transaction(async (tx) => {
    await tx
      .insert(transactions)
      .values({
        id: transaction.id,
        ownerUserId,
        occurredOn: transaction.occurredOn,
        type: transaction.type,
        amountMinor: transaction.money.amountMinor,
        currency: transaction.money.currency,
        categoryId: transaction.categoryId,
        sourceAccountId: transaction.sourceAccountId,
        targetAccountId: transaction.targetAccountId,
        paymentMethodId: transaction.paymentMethodId,
        recurringItemId,
        includeInExpenseStats: transaction.type === "expense",
        includeInCashflowStats: true,
        note: transaction.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    await applyBalanceImpacts(tx, getTransactionBalanceImpacts(transaction), timestamp);

    await tx
      .update(recurringItems)
      .set({ nextDate: newNextDate, updatedAt: timestamp })
      .where(
        and(eq(recurringItems.id, recurringItemId), eq(recurringItems.ownerUserId, ownerUserId)),
      )
      .run();
  });
}
