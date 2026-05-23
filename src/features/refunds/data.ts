import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, refundTrackers, transactions } from "@/db/schema";
import type { RefundStatus } from "@/domain/refund";

type RefundTrackerRow = typeof refundTrackers.$inferSelect;
type TransactionRow = typeof transactions.$inferSelect;
type AccountRow = typeof accounts.$inferSelect;

export type HydratedRefundTracker = RefundTrackerRow & {
  originalTransaction: TransactionRow | null;
  expectedAccount: AccountRow | null;
};

export type RefundReceipt = TransactionRow & {
  account: AccountRow | null;
};

export async function listRefundTrackers(): Promise<HydratedRefundTracker[]> {
  const rows = await db.select().from(refundTrackers).orderBy(desc(refundTrackers.createdAt));
  return hydrate(rows);
}

export async function getRefundTracker(id: string): Promise<HydratedRefundTracker | null> {
  const rows = await db.select().from(refundTrackers).where(eq(refundTrackers.id, id)).limit(1);
  const [tracker] = await hydrate(rows);
  return tracker ?? null;
}

export async function listRefundReceipts(trackerId: string): Promise<RefundReceipt[]> {
  const receiptRows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.refundTrackerId, trackerId))
    .orderBy(asc(transactions.occurredOn));

  const accountIds = new Set<string>();
  for (const row of receiptRows) {
    if (row.targetAccountId) accountIds.add(row.targetAccountId);
  }

  const accountRows =
    accountIds.size > 0
      ? await db
          .select()
          .from(accounts)
          .where(inArray(accounts.id, [...accountIds]))
      : [];
  const accountById = new Map(accountRows.map((account) => [account.id, account]));

  return receiptRows.map((row) => ({
    ...row,
    account: row.targetAccountId ? (accountById.get(row.targetAccountId) ?? null) : null,
  }));
}

export async function countPendingRefunds(): Promise<number> {
  // 待退款 + 部分到账都算"未完成"
  const rows = await db
    .select({ id: refundTrackers.id })
    .from(refundTrackers)
    .where(
      and(
        ne(refundTrackers.status, "received" satisfies RefundStatus),
        ne(refundTrackers.status, "cancelled" satisfies RefundStatus),
      ),
    );
  return rows.length;
}

async function hydrate(rows: RefundTrackerRow[]): Promise<HydratedRefundTracker[]> {
  const txIds = new Set<string>();
  const accountIds = new Set<string>();

  for (const row of rows) {
    if (row.originalTransactionId) txIds.add(row.originalTransactionId);
    if (row.expectedAccountId) accountIds.add(row.expectedAccountId);
  }

  const [txRows, accountRows] = await Promise.all([
    txIds.size > 0
      ? db
          .select()
          .from(transactions)
          .where(inArray(transactions.id, [...txIds]))
      : [],
    accountIds.size > 0
      ? db
          .select()
          .from(accounts)
          .where(inArray(accounts.id, [...accountIds]))
      : [],
  ]);

  const txById = new Map(txRows.map((row) => [row.id, row]));
  const accountById = new Map(accountRows.map((account) => [account.id, account]));

  return rows.map((row) => ({
    ...row,
    originalTransaction: row.originalTransactionId
      ? (txById.get(row.originalTransactionId) ?? null)
      : null,
    expectedAccount: row.expectedAccountId
      ? (accountById.get(row.expectedAccountId) ?? null)
      : null,
  }));
}
