import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, refundTrackers, transactions } from "@/db/schema";
import type { Currency } from "@/domain/finance";
import { computeRefundStatus, type RefundStatus } from "@/domain/refund";
import { getCurrentUserId } from "@/lib/auth";
import { nowIso } from "@/lib/dates";

export type CreateTrackerInput = {
  originalTransactionId: string;
  amountMinor: number;
  currency: Currency;
  expectedAccountId?: string;
  expectedOn?: string;
  note?: string;
};

export async function createRefundTrackerRecord(input: CreateTrackerInput): Promise<string> {
  const ownerUserId = await getCurrentUserId();
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  await db
    .insert(refundTrackers)
    .values({
      id,
      ownerUserId,
      originalTransactionId: input.originalTransactionId,
      amountMinor: input.amountMinor,
      receivedAmountMinor: 0,
      currency: input.currency,
      expectedAccountId: input.expectedAccountId,
      expectedOn: input.expectedOn,
      receivedOn: null,
      status: "pending",
      note: input.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return id;
}

export type UpdateTrackerInput = {
  amountMinor: number;
  currency: Currency;
  expectedAccountId?: string;
  expectedOn?: string;
  note?: string;
  status: RefundStatus;
};

export async function updateRefundTrackerRecord(
  id: string,
  input: UpdateTrackerInput,
): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  await db
    .update(refundTrackers)
    .set({
      amountMinor: input.amountMinor,
      currency: input.currency,
      expectedAccountId: input.expectedAccountId,
      expectedOn: input.expectedOn,
      note: input.note,
      status: input.status,
      updatedAt: nowIso(),
    })
    .where(and(eq(refundTrackers.id, id), eq(refundTrackers.ownerUserId, ownerUserId)))
    .run();
}

export async function setRefundTrackerStatus(id: string, status: RefundStatus): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  await db
    .update(refundTrackers)
    .set({ status, updatedAt: nowIso() })
    .where(and(eq(refundTrackers.id, id), eq(refundTrackers.ownerUserId, ownerUserId)))
    .run();
}

export async function deleteRefundTrackerRecord(id: string): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  await db
    .delete(refundTrackers)
    .where(and(eq(refundTrackers.id, id), eq(refundTrackers.ownerUserId, ownerUserId)))
    .run();
}

export type RecordReceiptInput = {
  tracker: typeof refundTrackers.$inferSelect;
  amountMinor: number;
  occurredOn: string;
  targetAccountId: string;
  note: string;
};

/**
 * 在同一事务里：写一笔 type=income / category=refund 的到账交易 + 加目标账户余额 +
 * 更新 tracker 的 receivedAmountMinor / status / receivedOn。返回新建的交易 id。
 */
export async function recordRefundReceiptAtomic(input: RecordReceiptInput): Promise<string> {
  const ownerUserId = await getCurrentUserId();
  const { tracker, amountMinor, occurredOn, targetAccountId, note } = input;
  const newReceivedMinor = tracker.receivedAmountMinor + amountMinor;
  const newStatus = computeRefundStatus(tracker.amountMinor, newReceivedMinor, false);
  const timestamp = nowIso();
  const transactionId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx
      .insert(transactions)
      .values({
        id: transactionId,
        ownerUserId,
        occurredOn,
        type: "income",
        amountMinor,
        currency: tracker.currency,
        categoryId: "refund",
        sourceAccountId: null,
        targetAccountId,
        paymentMethodId: null,
        recurringItemId: null,
        refundTrackerId: tracker.id,
        includeInExpenseStats: false,
        includeInCashflowStats: true,
        note,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    await tx
      .update(accounts)
      .set({
        balanceMinor: sql`${accounts.balanceMinor} + ${amountMinor}`,
        updatedAt: timestamp,
      })
      .where(and(eq(accounts.id, targetAccountId), eq(accounts.ownerUserId, ownerUserId)))
      .run();

    await tx
      .update(refundTrackers)
      .set({
        receivedAmountMinor: newReceivedMinor,
        status: newStatus,
        receivedOn: newStatus === "received" ? occurredOn : tracker.receivedOn,
        updatedAt: timestamp,
      })
      .where(and(eq(refundTrackers.id, tracker.id), eq(refundTrackers.ownerUserId, ownerUserId)))
      .run();
  });

  return transactionId;
}

/**
 * 在同一事务里：回滚账户余额 + 删除到账交易 + 回退 tracker 状态。
 */
export async function deleteRefundReceiptAtomic(receiptTransactionId: string): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  const [receipt] = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.id, receiptTransactionId), eq(transactions.ownerUserId, ownerUserId)),
    )
    .limit(1);
  if (!receipt || !receipt.refundTrackerId) return;

  const [tracker] = await db
    .select()
    .from(refundTrackers)
    .where(
      and(
        eq(refundTrackers.id, receipt.refundTrackerId),
        eq(refundTrackers.ownerUserId, ownerUserId),
      ),
    )
    .limit(1);
  if (!tracker) return;

  const newReceivedMinor = Math.max(0, tracker.receivedAmountMinor - receipt.amountMinor);
  const newStatus = computeRefundStatus(
    tracker.amountMinor,
    newReceivedMinor,
    tracker.status === "cancelled",
  );
  const timestamp = nowIso();

  await db.transaction(async (tx) => {
    if (receipt.targetAccountId) {
      await tx
        .update(accounts)
        .set({
          balanceMinor: sql`${accounts.balanceMinor} - ${receipt.amountMinor}`,
          updatedAt: timestamp,
        })
        .where(and(eq(accounts.id, receipt.targetAccountId), eq(accounts.ownerUserId, ownerUserId)))
        .run();
    }

    await tx
      .delete(transactions)
      .where(and(eq(transactions.id, receipt.id), eq(transactions.ownerUserId, ownerUserId)))
      .run();

    await tx
      .update(refundTrackers)
      .set({
        receivedAmountMinor: newReceivedMinor,
        status: newStatus,
        receivedOn: newStatus === "received" ? tracker.receivedOn : null,
        updatedAt: timestamp,
      })
      .where(and(eq(refundTrackers.id, tracker.id), eq(refundTrackers.ownerUserId, ownerUserId)))
      .run();
  });
}
