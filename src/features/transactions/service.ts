import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, transactions } from "@/db/schema";
import {
  getTransactionBalanceImpacts,
  type AccountBalanceImpact,
  type Currency,
  type Transaction,
  type TransactionType,
} from "@/domain/finance";
import { nowIso } from "@/lib/dates";

/**
 * 把一组余额变动写到 accounts 表。在 tx 内调用时确保事务原子性。
 * 多笔交易场景（如周期项确认）也复用。
 */
export async function applyBalanceImpacts(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  impacts: AccountBalanceImpact[],
  timestamp: string,
): Promise<void> {
  for (const impact of impacts) {
    await tx
      .update(accounts)
      .set({
        balanceMinor: sql`${accounts.balanceMinor} + ${impact.amountMinor}`,
        updatedAt: timestamp,
      })
      .where(eq(accounts.id, impact.accountId))
      .run();
  }
}

export function invertImpacts(impacts: AccountBalanceImpact[]): AccountBalanceImpact[] {
  return impacts.map((impact) => ({ ...impact, amountMinor: -impact.amountMinor }));
}

export type CreateTransactionExtras = {
  /** 关联的周期项 id（来自 confirmRecurringItem） */
  recurringItemId?: string | null;
  /** 关联的退款追踪 id（来自 recordRefundReceipt） */
  refundTrackerId?: string | null;
  /** 强制覆盖默认的 includeInExpenseStats（默认按 type 推算） */
  includeInExpenseStats?: boolean;
  /** 强制覆盖默认的 includeInCashflowStats */
  includeInCashflowStats?: boolean;
};

/**
 * 写一笔新交易 + 同步账户余额。整个操作放在事务里保证原子性。
 */
export async function createTransactionRecord(
  transaction: Transaction,
  extras: CreateTransactionExtras = {},
): Promise<void> {
  const timestamp = nowIso();
  const includeInExpenseStats = extras.includeInExpenseStats ?? transaction.type === "expense";
  const includeInCashflowStats = extras.includeInCashflowStats ?? transaction.type !== "adjustment";

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
        recurringItemId: extras.recurringItemId ?? null,
        refundTrackerId: extras.refundTrackerId ?? null,
        includeInExpenseStats,
        includeInCashflowStats,
        note: transaction.note,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    await applyBalanceImpacts(tx, getTransactionBalanceImpacts(transaction), timestamp);
  });
}

/**
 * 替换已有交易：先回滚旧的余额影响，再写新值并应用新影响。
 */
export async function replaceTransactionRecord(
  id: string,
  previous: Transaction,
  next: Transaction,
): Promise<void> {
  const timestamp = nowIso();

  await db.transaction(async (tx) => {
    await applyBalanceImpacts(tx, invertImpacts(getTransactionBalanceImpacts(previous)), timestamp);

    await tx
      .update(transactions)
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

    await applyBalanceImpacts(tx, getTransactionBalanceImpacts(next), timestamp);
  });
}

/**
 * 删除交易：回滚余额影响，再删除行。
 */
export async function deleteTransactionRecord(previous: Transaction): Promise<void> {
  const timestamp = nowIso();

  await db.transaction(async (tx) => {
    await applyBalanceImpacts(tx, invertImpacts(getTransactionBalanceImpacts(previous)), timestamp);
    await tx.delete(transactions).where(eq(transactions.id, previous.id)).run();
  });
}

export async function loadTransaction(id: string): Promise<Transaction | null> {
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!row) return null;
  return rowToTransaction(row);
}

export function rowToTransaction(row: {
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
    money: { amountMinor: row.amountMinor, currency: row.currency },
    categoryId: row.categoryId ?? undefined,
    sourceAccountId: row.sourceAccountId ?? undefined,
    targetAccountId: row.targetAccountId ?? undefined,
    paymentMethodId: row.paymentMethodId ?? undefined,
    note: row.note ?? undefined,
  };
}
