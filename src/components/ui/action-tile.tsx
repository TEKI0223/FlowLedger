"use client";

import type { LucideIcon } from "lucide-react";
import {
  BanknoteIcon,
  CreditCardIcon,
  LandmarkIcon,
  PiggyBankIcon,
  TrendingUpIcon,
  ArrowLeftRightIcon,
  CircleHelpIcon,
} from "lucide-react";
import { CategoryIcon } from "@/features/categories/category-icon-label";
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
  theme?: ActionTileTheme;
  categoryIconKey?: string | null;
  onClick: () => void;
};

const themeIcon: Record<ActionTileTheme, LucideIcon> = {
  bank: LandmarkIcon,
  card: CreditCardIcon,
  wallet: PiggyBankIcon,
  cash: BanknoteIcon,
  income: TrendingUpIcon,
  transfer: ArrowLeftRightIcon,
  temporary: CircleHelpIcon,
};

const themeBadge: Record<ActionTileTheme, string> = {
  bank: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  card: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200",
  wallet: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-200",
  cash: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  income: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  transfer: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200",
  temporary: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
};

export function ActionTile({
  title,
  meta,
  amountHint,
  theme = "wallet",
  categoryIconKey,
  onClick,
}: ActionTileProps) {
  const Icon = themeIcon[theme];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/tile relative flex flex-col gap-2 rounded-xl bg-card p-4 text-left",
        "min-h-[112px] ring-1 ring-foreground/10",
        "transition-all duration-150",
        "hover:ring-foreground/20 hover:shadow-md hover:-translate-y-px",
        "active:translate-y-0 active:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {categoryIconKey ? (
        <CategoryIcon iconKey={categoryIconKey} />
      ) : (
        <div
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg",
            themeBadge[theme],
          )}
        >
          <Icon className="size-4" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <p className="text-xs font-medium text-muted-foreground tabular-nums">{amountHint}</p>
    </button>
  );
}
