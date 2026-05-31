"use client";

import { MoneyText } from "@/components/privacy/money-text";
import type { Currency, TransactionType } from "@/domain/finance";
import { transactionTypeColorClass } from "@/domain/transaction-style";
import { CategoryIconLabel } from "@/features/categories/category-icon-label";
import { cn } from "@/lib/utils";

export type ActionTileTheme =
  | "bank"
  | "card"
  | "wallet"
  | "cash"
  | "income"
  | "transfer"
  | "temporary";

type ActionTileProps = {
  title: string;
  meta: string;
  amountHint: string;
  amountMinor?: number | null;
  currency?: Currency;
  usageCount?: number;
  theme?: ActionTileTheme;
  categoryIconKey?: string | null;
  type?: TransactionType;
  onClick: () => void;
};

export function ActionTile({
  title,
  meta,
  amountHint,
  amountMinor,
  currency,
  usageCount,
  categoryIconKey,
  type,
  onClick,
}: ActionTileProps) {
  const showAmountHint = amountHint !== "自填";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/tile relative flex min-h-[112px] flex-col gap-1.5 rounded-xl bg-card p-3 text-left sm:min-h-[116px]",
        "ring-1 ring-foreground/10",
        "transition-all duration-150",
        "hover:ring-foreground/20 hover:shadow-md hover:-translate-y-px",
        "active:translate-y-0 active:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="grid min-w-0 gap-1">
        <p className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug text-foreground">
          {title}
        </p>
        <CategoryIconLabel
          iconKey={categoryIconKey}
          name={meta}
          iconContainerClassName="size-6"
          iconClassName="size-3.5"
          labelClassName="text-xs leading-snug text-muted-foreground"
        />
      </div>

      <div className="mt-auto flex min-w-0 items-end justify-between gap-2">
        {usageCount !== undefined ? (
          <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {usageCount} 次
          </span>
        ) : (
          <span />
        )}
        {showAmountHint ? (
          <p
            className={cn(
              "min-w-0 max-w-[70%] truncate rounded-md border px-1.5 py-0.5 text-right text-xs font-medium tabular-nums",
              type ? transactionTypeColorClass[type] : "border-transparent text-muted-foreground",
            )}
            title={amountMinor !== undefined && amountMinor !== null ? undefined : amountHint}
          >
            {amountMinor !== undefined && amountMinor !== null && currency ? (
              <MoneyText amountMinor={amountMinor} currency={currency} />
            ) : (
              amountHint
            )}
          </p>
        ) : null}
      </div>
    </button>
  );
}
