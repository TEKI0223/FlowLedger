"use client";

import { useState } from "react";
import { BarChart3Icon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { MoneyText } from "@/components/privacy/money-text";
import { Card, CardContent } from "@/components/ui/card";
import type { Currency } from "@/domain/finance";
import type { MonthlyExpenseRanking } from "./data";
import { cn } from "@/lib/utils";

type MonthlyExpenseRankingProps = {
  ranking: MonthlyExpenseRanking;
};

const currencies: Currency[] = ["JPY", "CNY"];
const collapsedItemCount = 5;

export function MonthlyExpenseRankingCard({ ranking }: MonthlyExpenseRankingProps) {
  const [currency, setCurrency] = useState<Currency>("JPY");
  const [expanded, setExpanded] = useState(false);
  const items = ranking[currency];
  const visibleItems = expanded ? items : items.slice(0, collapsedItemCount);
  const hiddenCount = items.length - visibleItems.length;
  const maxAmount = items[0]?.amountMinor ?? 0;
  const ToggleIcon = expanded ? ChevronUpIcon : ChevronDownIcon;

  return (
    <section aria-label="当月支出排行">
      <Card size="sm">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
              <BarChart3Icon className="size-4 text-muted-foreground" />
              当月支出排行
            </h2>
            <div className="inline-flex rounded-lg bg-muted p-0.5" aria-label="切换币种">
              {currencies.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => {
                    setCurrency(option);
                    setExpanded(false);
                  }}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                    currency === option
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">
              本月暂无{currency}支出
            </p>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item, index) => (
                <RankingBar
                  key={`${currency}-${item.id}`}
                  index={index}
                  label={item.label}
                  amountMinor={item.amountMinor}
                  maxAmount={maxAmount}
                  currency={currency}
                />
              ))}
              {items.length > collapsedItemCount ? (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  className="flex h-8 w-full items-center justify-center gap-1 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {expanded ? "收起" : `展开剩余 ${hiddenCount} 项`}
                  <ToggleIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function RankingBar({
  index,
  label,
  amountMinor,
  maxAmount,
  currency,
}: {
  index: number;
  label: string;
  amountMinor: number;
  maxAmount: number;
  currency: Currency;
}) {
  const width = maxAmount > 0 ? Math.max((amountMinor / maxAmount) * 100, 4) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">
          {index + 1}. {label}
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-expense">
          <MoneyText amountMinor={amountMinor} currency={currency} showCurrencyCode={false} />
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-expense"
          style={{ width: `${width}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
