import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods, recurringItems, transactions } from "@/db/schema";
import { todayIsoDate } from "@/lib/dates";

type AccountRow = typeof accounts.$inferSelect;

export async function listAccounts() {
  return db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.currency), asc(accounts.type), asc(accounts.name));
}

export async function getAccount(id: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);

  return account ?? null;
}

export type AccountTransactionRow = {
  id: string;
  occurredOn: string;
  type: typeof transactions.$inferSelect.type;
  amountMinor: number;
  currency: typeof transactions.$inferSelect.currency;
  note: string | null;
  direction: "in" | "out";
  category: { id: string; name: string } | null;
  counterpart: { id: string; name: string } | null;
  paymentMethod: { id: string; name: string } | null;
};

export type AccountMonthlySummary = {
  inMinor: number;
  outMinor: number;
};

export type AccountPendingRecurring = {
  id: string;
  name: string;
  type: typeof recurringItems.$inferSelect.type;
  nextDate: string;
  amountMinor: number | null;
  currency: typeof recurringItems.$inferSelect.currency;
  /** "in" 表示对该账户是流入，"out" 是流出 */
  direction: "in" | "out";
};

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    start: start.toISOString().slice(0, 10),
    next: next.toISOString().slice(0, 10),
  };
}

export async function getAccountDetail(id: string) {
  const account = await getAccount(id);
  if (!account) return null;

  const { start, next } = monthBounds();
  const today = todayIsoDate();

  const [monthlyRows, recentRows, pendingRows] = await Promise.all([
    db
      .select({
        direction: sql<string>`case
          when ${transactions.type} = 'adjustment' and ${transactions.amountMinor} < 0 then 'out'
          when ${transactions.type} = 'adjustment' then 'in'
          when ${transactions.targetAccountId} = ${id} then 'in'
          else 'out'
        end`,
        totalMinor: sql<number>`coalesce(sum(abs(${transactions.amountMinor})), 0)`,
      })
      .from(transactions)
      .where(
        and(
          or(eq(transactions.sourceAccountId, id), eq(transactions.targetAccountId, id)),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, next),
        ),
      )
      .groupBy(sql`case
        when ${transactions.type} = 'adjustment' and ${transactions.amountMinor} < 0 then 'out'
        when ${transactions.type} = 'adjustment' then 'in'
        when ${transactions.targetAccountId} = ${id} then 'in'
        else 'out'
      end`),
    db
      .select()
      .from(transactions)
      .where(or(eq(transactions.sourceAccountId, id), eq(transactions.targetAccountId, id)))
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
      .limit(20),
    db
      .select()
      .from(recurringItems)
      .where(
        and(
          eq(recurringItems.enabled, true),
          or(eq(recurringItems.sourceAccountId, id), eq(recurringItems.targetAccountId, id)),
          lte(recurringItems.nextDate, today),
        ),
      )
      .orderBy(asc(recurringItems.nextDate)),
  ]);

  const monthly: AccountMonthlySummary = {
    inMinor: Number(monthlyRows.find((row) => row.direction === "in")?.totalMinor ?? 0),
    outMinor: Number(monthlyRows.find((row) => row.direction === "out")?.totalMinor ?? 0),
  };

  // Hydrate lookups for recent transactions
  const accountIds = new Set<string>();
  const categoryIds = new Set<string>();
  const paymentMethodIds = new Set<string>();

  for (const tx of recentRows) {
    if (tx.sourceAccountId) accountIds.add(tx.sourceAccountId);
    if (tx.targetAccountId) accountIds.add(tx.targetAccountId);
    if (tx.categoryId) categoryIds.add(tx.categoryId);
    if (tx.paymentMethodId) paymentMethodIds.add(tx.paymentMethodId);
  }

  const [accountRows, categoryRows, paymentMethodRows] = await Promise.all([
    accountIds.size > 0
      ? db
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(inArray(accounts.id, [...accountIds]))
      : [],
    categoryIds.size > 0
      ? db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, [...categoryIds]))
      : [],
    paymentMethodIds.size > 0
      ? db
          .select({ id: paymentMethods.id, name: paymentMethods.name })
          .from(paymentMethods)
          .where(inArray(paymentMethods.id, [...paymentMethodIds]))
      : [],
  ]);

  const accountById = new Map(accountRows.map((row) => [row.id, row]));
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));
  const paymentMethodById = new Map(paymentMethodRows.map((row) => [row.id, row]));

  const recent: AccountTransactionRow[] = recentRows.map((tx) => {
    const direction: "in" | "out" = tx.targetAccountId === id ? "in" : "out";
    const counterpartId =
      direction === "in" ? tx.sourceAccountId : tx.targetAccountId;
    return {
      id: tx.id,
      occurredOn: tx.occurredOn,
      type: tx.type,
      amountMinor: tx.amountMinor,
      currency: tx.currency,
      note: tx.note,
      direction,
      category: tx.categoryId ? (categoryById.get(tx.categoryId) ?? null) : null,
      counterpart: counterpartId ? (accountById.get(counterpartId) ?? null) : null,
      paymentMethod: tx.paymentMethodId
        ? (paymentMethodById.get(tx.paymentMethodId) ?? null)
        : null,
    };
  });

  const pending: AccountPendingRecurring[] = pendingRows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    nextDate: row.nextDate,
    amountMinor: row.amountMinor,
    currency: row.currency,
    direction: row.targetAccountId === id ? "in" : "out",
  }));

  return {
    account,
    monthly,
    recent,
    pending,
  };
}

export type { AccountRow };
