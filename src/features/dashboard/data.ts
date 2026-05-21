import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, transactions } from "@/db/schema";
import type { Currency } from "@/domain/finance";

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    start: start.toISOString().slice(0, 10),
    next: next.toISOString().slice(0, 10),
  };
}

export async function getDashboardSummary() {
  const { start, next } = monthBounds();

  const [incomeRows, expenseRows, assetRows] = await Promise.all([
    db
      .select({
        currency: transactions.currency,
        totalMinor: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "income"),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, next),
        ),
      )
      .groupBy(transactions.currency),
    db
      .select({
        currency: transactions.currency,
        totalMinor: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          eq(transactions.includeInExpenseStats, true),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, next),
        ),
      )
      .groupBy(transactions.currency),
    db
      .select({
        currency: accounts.currency,
        totalMinor: sql<number>`coalesce(sum(${accounts.balanceMinor}), 0)`,
      })
      .from(accounts)
      .where(eq(accounts.includeInNetWorth, true))
      .groupBy(accounts.currency),
  ]);

  return {
    income: totalsByCurrency(incomeRows),
    expense: totalsByCurrency(expenseRows),
    assets: totalsByCurrency(assetRows),
  };
}

function totalsByCurrency(
  rows: Array<{ currency: Currency; totalMinor: number }>,
): Record<Currency, number> {
  return {
    JPY: rows.find((row) => row.currency === "JPY")?.totalMinor ?? 0,
    CNY: rows.find((row) => row.currency === "CNY")?.totalMinor ?? 0,
  };
}
