import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, transactions } from "@/db/schema";
import { convertToCurrency, type Currency } from "@/domain/finance";
import { getExchangeRate } from "@/features/exchange-rates/data";
import { getCurrentUserId } from "@/lib/auth";

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    start: start.toISOString().slice(0, 10),
    next: next.toISOString().slice(0, 10),
  };
}

export type DashboardSummary = {
  income: Record<Currency, number>;
  expense: Record<Currency, number>;
  assets: Record<Currency, number>;
  netWorth: {
    baseCurrency: Currency;
    amountMinor: number;
    rateCnyToJpy: number | null;
  };
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const ownerUserId = await getCurrentUserId();
  const { start, next } = monthBounds();

  const [incomeRows, expenseRows, assetRows, rateCnyToJpy] = await Promise.all([
    db
      .select({
        currency: transactions.currency,
        totalMinor: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "income"),
          eq(transactions.ownerUserId, ownerUserId),
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
          eq(transactions.ownerUserId, ownerUserId),
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
      .where(and(eq(accounts.includeInNetWorth, true), eq(accounts.ownerUserId, ownerUserId)))
      .groupBy(accounts.currency),
    getExchangeRate("CNY", "JPY"),
  ]);

  const assets = totalsByCurrency(assetRows);
  const cnyAsJpyMinor =
    rateCnyToJpy === null
      ? 0
      : convertToCurrency({ amountMinor: assets.CNY, currency: "CNY" }, "JPY", rateCnyToJpy);

  return {
    income: totalsByCurrency(incomeRows),
    expense: totalsByCurrency(expenseRows),
    assets,
    netWorth: {
      baseCurrency: "JPY",
      amountMinor: assets.JPY + cnyAsJpyMinor,
      rateCnyToJpy,
    },
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

export type PriorMonthTotals = {
  income: Record<Currency, number>;
  expense: Record<Currency, number>;
};

export async function getPriorMonthTotals(now = new Date()): Promise<PriorMonthTotals> {
  const ownerUserId = await getCurrentUserId();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 10);
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  const [incomeRows, expenseRows] = await Promise.all([
    db
      .select({
        currency: transactions.currency,
        totalMinor: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "income"),
          eq(transactions.ownerUserId, ownerUserId),
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
          eq(transactions.ownerUserId, ownerUserId),
          eq(transactions.includeInExpenseStats, true),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, next),
        ),
      )
      .groupBy(transactions.currency),
  ]);

  return {
    income: totalsByCurrency(incomeRows),
    expense: totalsByCurrency(expenseRows),
  };
}
