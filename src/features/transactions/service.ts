import { and, eq, sql } from "drizzle-orm";
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
import { getCurrentUserId } from "@/lib/auth";

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
  return createTransactionRecords([{ transaction, extras }]);
}

/**
 * 批量写多笔交易：所有写操作放在同一个 DB 事务里，全部成功或全部回滚。
 * 用于拆分场景（一张小票一次性写 N 笔）。
 */
export async function createTransactionRecords(
  items: Array<{ transaction: Transaction; extras?: CreateTransactionExtras }>,
): Promise<void> {
  if (items.length === 0) return;
  const ownerUserId = await getCurrentUserId();
  const timestamp = nowIso();

  await db.transaction(async (tx) => {
    for (const { transaction, extras = {} } of items) {
      const includeInExpenseStats = extras.includeInExpenseStats ?? transaction.type === "expense";
      const includeInCashflowStats =
        extras.includeInCashflowStats ?? transaction.type !== "adjustment";

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
          recurringItemId: extras.recurringItemId ?? null,
          refundTrackerId: extras.refundTrackerId ?? null,
          creditCardStatementOverride: transaction.creditCardStatementOverride ?? null,
          includeInExpenseStats,
          includeInCashflowStats,
          note: transaction.note,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();

      await applyBalanceImpacts(tx, getTransactionBalanceImpacts(transaction), timestamp);
    }
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
  const ownerUserId = await getCurrentUserId();
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
        creditCardStatementOverride: next.creditCardStatementOverride ?? null,
        includeInExpenseStats: next.type === "expense",
        includeInCashflowStats: next.type !== "adjustment",
        note: next.note,
        updatedAt: timestamp,
      })
      .where(and(eq(transactions.id, id), eq(transactions.ownerUserId, ownerUserId)))
      .run();

    await applyBalanceImpacts(tx, getTransactionBalanceImpacts(next), timestamp);
  });
}

/**
 * 删除交易：回滚余额影响，再删除行。
 */
export async function deleteTransactionRecord(previous: Transaction): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  const timestamp = nowIso();

  await db.transaction(async (tx) => {
    await applyBalanceImpacts(tx, invertImpacts(getTransactionBalanceImpacts(previous)), timestamp);
    await tx
      .delete(transactions)
      .where(and(eq(transactions.id, previous.id), eq(transactions.ownerUserId, ownerUserId)))
      .run();
  });
}

export async function loadTransaction(id: string): Promise<Transaction | null> {
  const ownerUserId = await getCurrentUserId();
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.ownerUserId, ownerUserId)))
    .limit(1);
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
  creditCardStatementOverride?: string | null;
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
    creditCardStatementOverride: row.creditCardStatementOverride ?? undefined,
  };
}

// categories.usage_count / last_used_at 已废弃，改为按 ownerUserId 从 transactions 表
// 实时聚合（见 features/categories/data.ts 的 listCategories）。先前的 applyCategoryUsageDelta /
// syncCategoryUsage 维护逻辑已移除。
