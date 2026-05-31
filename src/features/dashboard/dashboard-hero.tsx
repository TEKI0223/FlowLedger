import { Card } from "@/components/ui/card";
import { MoneyText } from "@/components/privacy/money-text";
import type { DashboardSummary } from "./data";

type DashboardHeroProps = {
  summary: DashboardSummary;
};

type MoneyTone = "income" | "expense" | "balance";

export function DashboardHero({ summary }: DashboardHeroProps) {
  const progress = monthProgress();
  const balance = {
    JPY: summary.income.JPY - summary.expense.JPY,
    CNY: summary.income.CNY - summary.expense.CNY,
  };

  const metrics: Array<{
    label: string;
    values: { JPY: number; CNY: number };
    tone: MoneyTone;
  }> = [
    {
      label: "本月收入",
      values: summary.income,
      tone: "income",
    },
    {
      label: "本月支出",
      values: summary.expense,
      tone: "expense",
    },
    {
      label: "本月结余",
      values: balance,
      tone: "balance",
    },
  ];

  return (
    <section aria-label="本月概览" className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card className="gap-3 px-4 py-4" key={metric.label}>
            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
              <MoneyLine currency="JPY" amountMinor={metric.values.JPY} tone={metric.tone} />
              <MoneyLine currency="CNY" amountMinor={metric.values.CNY} tone={metric.tone} />
            </div>
          </Card>
        ))}
      </div>
      <Card size="sm" className="px-4 py-3">
        <div className="space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            已过 {progress.elapsed}/{progress.total} 天，已花 JPY{" "}
            <MoneyText amountMinor={summary.expense.JPY} currency="JPY" showCurrencyCode={false} />{" "}
            / CNY{" "}
            <MoneyText amountMinor={summary.expense.CNY} currency="CNY" showCurrencyCode={false} />
          </p>
        </div>
      </Card>
    </section>
  );
}

function MoneyLine({
  currency,
  amountMinor,
  tone,
}: {
  currency: "JPY" | "CNY";
  amountMinor: number;
  tone: MoneyTone;
}) {
  const className =
    tone === "income"
      ? "text-income"
      : tone === "expense"
        ? "text-expense"
        : amountMinor >= 0
          ? "text-transfer"
          : "text-expense";

  return (
    <div className="min-w-0">
      <p className="text-[0.7rem] font-medium text-muted-foreground">{currency}</p>
      <p className={`truncate text-xl font-semibold tabular-nums ${className}`}>
        <MoneyText amountMinor={amountMinor} currency={currency} showCurrencyCode={false} />
      </p>
    </div>
  );
}

function monthProgress() {
  const now = new Date();
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsed = now.getDate();

  return {
    elapsed,
    total,
    percent: Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))),
  };
}
