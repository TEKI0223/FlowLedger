import type { Currency } from "@/domain/finance";
import {
  CategoryRanking,
  CreditCardOverview,
  MonthlyComparison,
  MonthlyTrend,
  NetWorth,
} from "@/features/stats/components";
import {
  RangeSwitch,
  statsViewOptions,
  type StatsView,
  ViewSwitch,
} from "@/features/stats/controls";
import { getStatsSummary, statsRangeOptions, type StatsRange } from "@/features/stats/data";

export const dynamic = "force-dynamic";

type StatsPageProps = {
  searchParams: Promise<{
    range?: string;
    categoryMonth?: string;
    view?: string;
    currency?: string;
  }>;
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const {
    range: rawRange,
    categoryMonth,
    view: rawView,
    currency: rawCurrency,
  } = await searchParams;
  const range = parseStatsRange(rawRange);
  const view = parseStatsView(rawView);
  const currency = parseCurrency(rawCurrency);
  const summary = await getStatsSummary({ range, categoryMonth });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">统计</h1>
          <p className="text-sm text-muted-foreground">现金流、支出结构、趋势和资产状态。</p>
        </div>
        <RangeSwitch
          range={range}
          view={view}
          categoryMonth={summary.categoryMonth}
          currency={currency}
        />
        <ViewSwitch
          view={view}
          range={range}
          categoryMonth={summary.categoryMonth}
          currency={currency}
        />
      </header>

      {view === "comparison" ? (
        <MonthlyComparison
          comparison={summary.comparison}
          currency={currency}
          range={range}
          categoryMonth={summary.categoryMonth}
        />
      ) : null}
      {view === "ranking" ? <CategoryRanking summary={summary} range={range} /> : null}
      {view === "trend" ? <MonthlyTrend summary={summary} currency={currency} /> : null}
      {view === "net-worth" ? <NetWorth summary={summary} /> : null}
      {view === "cards" ? <CreditCardOverview summary={summary} /> : null}
    </main>
  );
}

function parseStatsRange(value: string | undefined): StatsRange {
  return statsRangeOptions.some((option) => option.value === value)
    ? (value as StatsRange)
    : "month";
}

function parseStatsView(value: string | undefined): StatsView {
  return statsViewOptions.some((option) => option.value === value)
    ? (value as StatsView)
    : "comparison";
}

function parseCurrency(value: string | undefined): Currency {
  return value === "CNY" ? "CNY" : "JPY";
}
