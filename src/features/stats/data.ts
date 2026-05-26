import dayjs from "dayjs";
import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, transactions } from "@/db/schema";
import {
  convertToCurrency,
  formatMoney,
  getTransactionBalanceImpacts,
  type Currency,
  type Transaction,
} from "@/domain/finance";
import { buildCategoryOptions } from "@/features/categories/data";
import { buildResolvedCategoryIconKeyMap } from "@/features/categories/icon-utils";
import { getExchangeRate } from "@/features/exchange-rates/data";
import { listCardStatements, listCreditCards } from "@/features/credit-cards/data";
import { ISO_DATE, todayIsoDate } from "@/lib/dates";

export const statsRangeOptions = [
  { value: "month", label: "本月" },
  { value: "3m", label: "近 3 月" },
  { value: "12m", label: "近 12 月" },
  { value: "all", label: "全部" },
] as const;

export type StatsRange = (typeof statsRangeOptions)[number]["value"];

export type StatsSummary = Awaited<ReturnType<typeof getStatsSummary>>;

type MonthMetric = {
  JPY: CurrencyMonthMetric;
  CNY: CurrencyMonthMetric;
};

type CurrencyMonthMetric = {
  incomeMinor: number;
  expenseMinor: number;
  balanceMinor: number;
};

export async function getStatsSummary(params: { range: StatsRange; categoryMonth?: string }) {
  const today = todayIsoDate();
  const rateCnyToJpy = await getExchangeRate("CNY", "JPY");
  const currentMonth = today.slice(0, 7);
  const rankingMonth = validMonthKey(params.categoryMonth) ?? currentMonth;

  const [comparison, categoryRanking, monthlyTrend, netWorth, creditCardOverview, availableMonths] =
    await Promise.all([
      getMonthlyComparison(),
      getCategoryRanking({ range: params.range, month: rankingMonth, rateCnyToJpy }),
      getMonthlyTrend(),
      getNetWorthStats(rateCnyToJpy),
      getCreditCardOverview(),
      getAvailableTransactionMonths(),
    ]);

  return {
    rateCnyToJpy,
    selectedRange: params.range,
    categoryMonth: rankingMonth,
    comparison,
    categoryRanking,
    monthlyTrend,
    netWorth,
    creditCardOverview,
    availableMonths,
  };
}

async function getMonthlyComparison() {
  const thisMonth = dayjs().startOf("month");
  const months = [0, 1, 2].map((offset) => thisMonth.subtract(offset, "month"));
  const rows = await getTransactionRowsBetween(
    months[2].format(ISO_DATE),
    thisMonth.add(1, "month").startOf("month").format(ISO_DATE),
  );
  const metrics = months.map((month) => monthMetric(rows, month.format("YYYY-MM")));
  const average: MonthMetric = {
    JPY: averageMetric(metrics.map((metric) => metric.JPY)),
    CNY: averageMetric(metrics.map((metric) => metric.CNY)),
  };

  return {
    thisMonth: metrics[0],
    lastMonth: metrics[1],
    threeMonthAverage: average,
  };
}

async function getCategoryRanking({
  range,
  month,
  rateCnyToJpy,
}: {
  range: StatsRange;
  month: string;
  rateCnyToJpy: number | null;
}) {
  const bounds = categoryRangeBounds(range, month);
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.type, "expense"),
        eq(transactions.includeInExpenseStats, true),
        bounds.start ? gte(transactions.occurredOn, bounds.start) : undefined,
        bounds.end ? lt(transactions.occurredOn, bounds.end) : undefined,
      ),
    );

  const categoryRows = await db.select().from(categories);
  const categoryOptions = buildCategoryOptions(categoryRows);
  const labelById = new Map(categoryOptions.map((category) => [category.id, category.label]));
  const iconKeyById = buildResolvedCategoryIconKeyMap(categoryRows);
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const grouped = new Map<
    string,
    {
      label: string;
      iconKey: string | null;
      amountByCurrency: Record<Currency, number>;
      jpyEquivalentMinor: number | null;
      count: number;
    }
  >();

  for (const row of rows) {
    const jpyAmountMinor = toJpyMinor(row.amountMinor, row.currency, rateCnyToJpy);
    const key = row.categoryId ?? "uncategorized";
    const category = row.categoryId ? categoryById.get(row.categoryId) : null;
    const current = grouped.get(key) ?? {
      label: row.categoryId
        ? (labelById.get(row.categoryId) ?? category?.name ?? "未分类")
        : "未分类",
      iconKey: row.categoryId ? (iconKeyById.get(row.categoryId) ?? null) : null,
      amountByCurrency: { JPY: 0, CNY: 0 },
      jpyEquivalentMinor: 0,
      count: 0,
    };
    current.amountByCurrency[row.currency] += Math.abs(row.amountMinor);
    current.jpyEquivalentMinor =
      current.jpyEquivalentMinor === null || jpyAmountMinor === null
        ? null
        : current.jpyEquivalentMinor + Math.abs(jpyAmountMinor);
    current.count += 1;
    grouped.set(key, current);
  }

  const items = [...grouped.entries()]
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => (b.jpyEquivalentMinor ?? 0) - (a.jpyEquivalentMinor ?? 0));
  const totalByCurrency = {
    JPY: items.reduce((sum, item) => sum + item.amountByCurrency.JPY, 0),
    CNY: items.reduce((sum, item) => sum + item.amountByCurrency.CNY, 0),
  };
  const totalJpyEquivalentMinor =
    rateCnyToJpy === null && totalByCurrency.CNY > 0
      ? null
      : totalAsJpy(totalByCurrency, rateCnyToJpy);

  return {
    range,
    month,
    label: bounds.label,
    totalByCurrency,
    totalJpyEquivalentMinor,
    items: items.map((item) => ({
      ...item,
      percent:
        totalJpyEquivalentMinor && item.jpyEquivalentMinor !== null && totalJpyEquivalentMinor > 0
          ? (item.jpyEquivalentMinor / totalJpyEquivalentMinor) * 100
          : 0,
    })),
  };
}

async function getMonthlyTrend() {
  const current = dayjs().startOf("month");
  const months = Array.from({ length: 12 }, (_, index) => current.subtract(11 - index, "month"));
  const rows = await getTransactionRowsBetween(
    months[0].format(ISO_DATE),
    current.add(1, "month").format(ISO_DATE),
  );
  const items = months.map((month) => {
    const key = month.format("YYYY-MM");
    const metric = monthMetric(rows, key);
    return {
      month: key,
      label: `${month.month() + 1}月`,
      expenseByCurrency: {
        JPY: metric.JPY.expenseMinor,
        CNY: metric.CNY.expenseMinor,
      },
    };
  });
  const maxByCurrency = {
    JPY: Math.max(...items.map((item) => item.expenseByCurrency.JPY), 0),
    CNY: Math.max(...items.map((item) => item.expenseByCurrency.CNY), 0),
  };

  return {
    maxByCurrency,
    items: items.map((item) => ({
      ...item,
      percentByCurrency: {
        JPY: maxByCurrency.JPY > 0 ? (item.expenseByCurrency.JPY / maxByCurrency.JPY) * 100 : 0,
        CNY: maxByCurrency.CNY > 0 ? (item.expenseByCurrency.CNY / maxByCurrency.CNY) * 100 : 0,
      },
    })),
  };
}

async function getNetWorthStats(rateCnyToJpy: number | null) {
  const [accountRows, recentRows] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(eq(accounts.includeInNetWorth, true))
      .orderBy(asc(accounts.currency), asc(accounts.name)),
    db
      .select()
      .from(transactions)
      .where(gte(transactions.occurredOn, dayjs().subtract(30, "day").format(ISO_DATE))),
  ]);
  const currentByCurrency = totalsByCurrency(
    accountRows.map((account) => ({
      currency: account.currency,
      amountMinor: account.balanceMinor,
    })),
  );
  const impactsByAccount = new Map<string, number>();
  const includedAccountIds = new Set(accountRows.map((account) => account.id));

  for (const row of recentRows) {
    for (const impact of getTransactionBalanceImpacts(toDomainTransaction(row))) {
      if (!includedAccountIds.has(impact.accountId)) continue;
      impactsByAccount.set(
        impact.accountId,
        (impactsByAccount.get(impact.accountId) ?? 0) + impact.amountMinor,
      );
    }
  }

  const previousAccounts = accountRows.map((account) => ({
    ...account,
    balanceMinor: account.balanceMinor - (impactsByAccount.get(account.id) ?? 0),
  }));
  const previousByCurrency = totalsByCurrency(
    previousAccounts.map((account) => ({
      currency: account.currency,
      amountMinor: account.balanceMinor,
    })),
  );
  const currentTotalJpy = totalAsJpy(currentByCurrency, rateCnyToJpy);
  const previousTotalJpy = totalAsJpy(previousByCurrency, rateCnyToJpy);

  return {
    currentByCurrency,
    previousByCurrency,
    totalJpyMinor: currentTotalJpy,
    previousTotalJpyMinor: previousTotalJpy,
    delta30dJpyMinor:
      currentTotalJpy === null || previousTotalJpy === null
        ? null
        : currentTotalJpy - previousTotalJpy,
    accounts: accountRows.map((account) => {
      const jpyMinor = toJpyMinor(account.balanceMinor, account.currency, rateCnyToJpy);
      return {
        id: account.id,
        name: account.name,
        currency: account.currency,
        balanceMinor: account.balanceMinor,
        jpyMinor,
        percent:
          currentTotalJpy && jpyMinor !== null && currentTotalJpy > 0
            ? Math.max(0, (jpyMinor / currentTotalJpy) * 100)
            : 0,
      };
    }),
  };
}

async function getCreditCardOverview() {
  const cards = await listCreditCards();
  const statements = await Promise.all(
    cards.map(async (card) => {
      const [statement] = await listCardStatements(card, 1);
      return { card, statement };
    }),
  );

  return statements.map(({ card, statement }) => ({
    id: card.id,
    name: card.account.name,
    currency: card.account.currency,
    dueDate: statement?.dueDate ?? null,
    currentSpendMinor: statement?.totalAmountMinor ?? 0,
    pendingMinor: statement
      ? Math.max(0, statement.totalAmountMinor - statement.repaidAmountMinor)
      : 0,
    isOverdue: statement?.isOverdue ?? false,
    isPaid: statement?.isPaid ?? false,
  }));
}

async function getAvailableTransactionMonths() {
  const rows = await db
    .select({ month: sql<string>`substr(${transactions.occurredOn}, 1, 7)` })
    .from(transactions)
    .groupBy(sql`substr(${transactions.occurredOn}, 1, 7)`)
    .orderBy(desc(sql`substr(${transactions.occurredOn}, 1, 7)`))
    .limit(12);

  return rows.map((row) => row.month);
}

async function getTransactionRowsBetween(start: string, end: string) {
  return db
    .select()
    .from(transactions)
    .where(and(gte(transactions.occurredOn, start), lt(transactions.occurredOn, end)));
}

function monthMetric(rows: Array<typeof transactions.$inferSelect>, month: string): MonthMetric {
  const metric: MonthMetric = {
    JPY: { incomeMinor: 0, expenseMinor: 0, balanceMinor: 0 },
    CNY: { incomeMinor: 0, expenseMinor: 0, balanceMinor: 0 },
  };
  for (const row of rows) {
    if (!row.occurredOn.startsWith(month)) continue;
    if (row.type === "income" && row.includeInCashflowStats) {
      metric[row.currency].incomeMinor += Math.abs(row.amountMinor);
    }
    if (row.type === "expense" && row.includeInExpenseStats) {
      metric[row.currency].expenseMinor += Math.abs(row.amountMinor);
    }
  }
  metric.JPY.balanceMinor = metric.JPY.incomeMinor - metric.JPY.expenseMinor;
  metric.CNY.balanceMinor = metric.CNY.incomeMinor - metric.CNY.expenseMinor;
  return metric;
}

function averageMetric(metrics: CurrencyMonthMetric[]): CurrencyMonthMetric {
  return {
    incomeMinor: Math.round(metrics.reduce((sum, item) => sum + item.incomeMinor, 0) / 3),
    expenseMinor: Math.round(metrics.reduce((sum, item) => sum + item.expenseMinor, 0) / 3),
    balanceMinor: Math.round(metrics.reduce((sum, item) => sum + item.balanceMinor, 0) / 3),
  };
}

function categoryRangeBounds(range: StatsRange, month: string) {
  const selected = dayjs(`${month}-01`);
  if (range === "month") {
    return {
      start: selected.format(ISO_DATE),
      end: selected.add(1, "month").format(ISO_DATE),
      label: selected.format("YYYY年M月"),
    };
  }
  if (range === "3m") {
    return {
      start: dayjs().startOf("month").subtract(2, "month").format(ISO_DATE),
      end: dayjs().add(1, "month").startOf("month").format(ISO_DATE),
      label: "近 3 月",
    };
  }
  if (range === "12m") {
    return {
      start: dayjs().startOf("month").subtract(11, "month").format(ISO_DATE),
      end: dayjs().add(1, "month").startOf("month").format(ISO_DATE),
      label: "近 12 月",
    };
  }
  return { start: undefined, end: undefined, label: "全部" };
}

function totalsByCurrency(
  rows: Array<{ currency: Currency; amountMinor: number }>,
): Record<Currency, number> {
  return rows.reduce<Record<Currency, number>>(
    (totals, row) => {
      totals[row.currency] += row.amountMinor;
      return totals;
    },
    { JPY: 0, CNY: 0 },
  );
}

function totalAsJpy(totals: Record<Currency, number>, rateCnyToJpy: number | null): number | null {
  if (rateCnyToJpy === null && totals.CNY !== 0) return null;
  return (
    totals.JPY +
    convertToCurrency({ amountMinor: totals.CNY, currency: "CNY" }, "JPY", rateCnyToJpy ?? 0)
  );
}

function toJpyMinor(
  amountMinor: number,
  currency: Currency,
  rateCnyToJpy: number | null,
): number | null {
  if (currency === "JPY") return amountMinor;
  if (rateCnyToJpy === null) return null;
  return convertToCurrency({ amountMinor, currency }, "JPY", rateCnyToJpy);
}

function toDomainTransaction(row: typeof transactions.$inferSelect): Transaction {
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

function validMonthKey(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

export function formatJpy(amountMinor: number | null): string {
  if (amountMinor === null) return "缺少汇率";
  return formatMoney({ amountMinor, currency: "JPY" });
}
