import Link from "next/link";
import type { Currency } from "@/domain/finance";
import { cn } from "@/lib/utils";
import { statsRangeOptions, type StatsRange } from "./data";

export const statsViewOptions = [
  { value: "comparison", label: "月度对比" },
  { value: "ranking", label: "分类排行" },
  { value: "trend", label: "月度趋势" },
  { value: "net-worth", label: "净资产" },
  { value: "cards", label: "信用卡" },
] as const;

export type StatsView = (typeof statsViewOptions)[number]["value"];

export type StatsSwitchState = {
  view: StatsView;
  range: StatsRange;
  categoryMonth: string;
  currency: Currency;
};

export function RangeSwitch({ range, view, categoryMonth, currency }: StatsSwitchState) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="统计时间范围">
      {statsRangeOptions.map((option) => (
        <StatsSwitchLink
          key={option.value}
          href={statsHref({ view, range: option.value, categoryMonth, currency })}
          active={option.value === range}
          activeClassName="border-foreground/30 bg-foreground text-background"
        >
          {option.label}
        </StatsSwitchLink>
      ))}
    </nav>
  );
}

export function ViewSwitch({ view, range, categoryMonth, currency }: StatsSwitchState) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="统计视图">
      {statsViewOptions.map((option) => (
        <StatsSwitchLink
          key={option.value}
          href={statsHref({ view: option.value, range, categoryMonth, currency })}
          active={option.value === view}
          activeClassName="border-foreground/30 bg-primary text-primary-foreground"
        >
          {option.label}
        </StatsSwitchLink>
      ))}
    </nav>
  );
}

export function CurrencySwitch({ currency, view, range, categoryMonth }: StatsSwitchState) {
  return (
    <div className="flex gap-2">
      {(["JPY", "CNY"] as const).map((option) => (
        <StatsSwitchLink
          key={option}
          href={statsHref({ view, range, categoryMonth, currency: option })}
          active={option === currency}
          className="h-7 rounded-md px-2.5 text-xs"
          activeClassName="border-foreground/30 bg-foreground text-background"
        >
          {option}
        </StatsSwitchLink>
      ))}
    </div>
  );
}

function StatsSwitchLink({
  active,
  activeClassName,
  className,
  ...props
}: React.ComponentProps<typeof Link> & {
  active: boolean;
  activeClassName: string;
}) {
  return (
    <Link
      className={cn(
        "flex h-8 shrink-0 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && activeClassName,
        className,
      )}
      {...props}
    />
  );
}

function statsHref(params: StatsSwitchState): string {
  const searchParams = new URLSearchParams({
    view: params.view,
    range: params.range,
    categoryMonth: params.categoryMonth,
    currency: params.currency,
  });

  return `/stats?${searchParams.toString()}`;
}
