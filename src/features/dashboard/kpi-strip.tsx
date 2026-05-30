import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney, type Currency } from "@/domain/finance";
import type { DashboardSummary, PriorMonthTotals } from "./data";
import { formatCurrencyPair, toJpy } from "./utils";
import { cn } from "@/lib/utils";

export function KPIStrip({
  summary,
  priorMonth,
}: {
  summary: DashboardSummary;
  priorMonth: PriorMonthTotals;
}) {
  const rate = summary.netWorth.rateCnyToJpy;

  const thisMonthBalance: Record<Currency, number> = {
    JPY: summary.income.JPY - summary.expense.JPY,
    CNY: summary.income.CNY - summary.expense.CNY,
  };
  const priorBalance: Record<Currency, number> = {
    JPY: priorMonth.income.JPY - priorMonth.expense.JPY,
    CNY: priorMonth.income.CNY - priorMonth.expense.CNY,
  };

  return (
    <section className="grid gap-3 md:grid-cols-3" aria-label="关键指标">
      <KPICard
        label="折算净资产"
        primary={formatMoney({
          amountMinor: summary.netWorth.amountMinor,
          currency: summary.netWorth.baseCurrency,
        })}
        secondary={[
          `JPY ${formatMoney({ amountMinor: summary.assets.JPY, currency: "JPY" }, { showCurrencyCode: false })}`,
          `CNY ${formatMoney({ amountMinor: summary.assets.CNY, currency: "CNY" }, { showCurrencyCode: false })}`,
        ]}
        footer={rate === null ? "缺少 CNY → JPY 汇率" : `1 CNY = ${rate.toFixed(2)} JPY`}
        tone="primary"
      />
      <KPICard
        label="本月支出"
        primary={formatCurrencyPair(summary.expense)}
        secondary={[]}
        footer={
          <DeltaLine
            current={summary.expense}
            prior={priorMonth.expense}
            rate={rate}
            invertColors
            referenceLabel="上月全月"
          />
        }
        tone="expense"
      />
      <KPICard
        label="本月结余"
        primary={formatCurrencyPair(thisMonthBalance)}
        secondary={[]}
        footer={
          <DeltaLine
            current={thisMonthBalance}
            prior={priorBalance}
            rate={rate}
            referenceLabel="上月全月"
          />
        }
        tone="transfer"
      />
    </section>
  );
}

function KPICard({
  label,
  primary,
  secondary,
  footer,
  tone,
}: {
  label: string;
  primary: string;
  secondary: string[];
  footer: React.ReactNode;
  tone: "primary" | "expense" | "transfer";
}) {
  return (
    <Card size="sm" className="rounded-lg px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 whitespace-pre-line text-2xl font-semibold leading-tight tabular-nums",
          tone === "expense" && "text-expense",
          tone === "transfer" && "text-transfer",
        )}
      >
        {primary}
      </p>
      {secondary.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">{secondary.join(" · ")}</p>
      ) : null}
      <div className="mt-2 text-xs text-muted-foreground">{footer}</div>
    </Card>
  );
}

function DeltaLine({
  current,
  prior,
  rate,
  invertColors = false,
  referenceLabel,
}: {
  current: Record<Currency, number>;
  prior: Record<Currency, number>;
  rate: number | null;
  invertColors?: boolean;
  referenceLabel: string;
}) {
  const currentJpy = toJpy(current, rate);
  const priorJpy = toJpy(prior, rate);
  const diff = currentJpy - priorJpy;
  const priorAbs = Math.abs(priorJpy);
  const pct = priorAbs === 0 ? null : Math.round((diff / priorAbs) * 100);
  const up = diff > 0;
  const goodWhenUp = !invertColors;
  const isGood = diff === 0 ? null : up === goodWhenUp;
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;
  const priorLabel = `${referenceLabel} ${formatCurrencyPair(prior).replace("\n", " · ")}`;

  if (priorAbs === 0) {
    return <span className="text-muted-foreground">{priorLabel}</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
      <span
        className={cn(
          "inline-flex items-center gap-1 font-medium tabular-nums",
          isGood === true && "text-income",
          isGood === false && "text-expense",
        )}
      >
        <Icon className="size-3" />
        {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct}%`}
      </span>
      <span>{priorLabel}</span>
    </span>
  );
}
