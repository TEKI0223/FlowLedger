import Link from "next/link";
import { ArrowRightIcon, RepeatIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getEffectiveRecurringDate } from "@/domain/date-shift";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { isRecurringItemPending, recurringFrequencyLabels } from "@/domain/recurring";
import { CategoryIconLabel } from "@/features/categories/category-icon-label";
import type { HydratedRecurringItem } from "./data";

type RecurringCardProps = {
  item: HydratedRecurringItem;
};

export function RecurringCard({ item }: RecurringCardProps) {
  const effectiveDate = getEffectiveRecurringDate(item);
  const shifted = effectiveDate !== item.nextDate;
  const pending = item.enabled && isRecurringItemPending(item);
  const accountLabel =
    item.sourceAccount && item.targetAccount
      ? `${item.sourceAccount.name} - ${item.targetAccount.name}`
      : (item.sourceAccount?.name ?? item.targetAccount?.name);
  const paymentAccountLabel = [item.paymentMethod?.name, accountLabel].filter(Boolean).join(" - ");

  return (
    <Link
      href={`/recurring/${item.id}`}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-muted/40 sm:gap-4"
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">{item.name}</p>
          <Badge variant="secondary" className="text-xs">
            {transactionTypeLabels[item.type]}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <RepeatIcon className="size-3" />
            {recurringFrequencyLabels[item.frequency]}
          </Badge>
          {!item.enabled ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              停用
            </Badge>
          ) : pending ? (
            <Badge className="bg-adjustment/15 text-adjustment text-xs">待确认</Badge>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="shrink-0 tabular-nums">
            下次 {effectiveDate}
            {shifted ? (
              <span className="text-muted-foreground/70"> · 原 {item.nextDate}</span>
            ) : null}
          </span>
          {item.category ? (
            <CategoryIconLabel
              iconKey={item.category.resolvedIconKey}
              name={item.category.name}
              className="max-w-full"
              iconContainerClassName="size-5 rounded-sm"
              iconClassName="size-3"
            />
          ) : null}
          {paymentAccountLabel ? (
            <span className="min-w-0 max-w-full truncate">{paymentAccountLabel}</span>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 self-center">
        <span className="max-w-[7.5rem] truncate text-right text-sm font-semibold tabular-nums sm:max-w-none">
          {item.amountMinor === null || item.amountMinor === undefined
            ? "变动"
            : formatMoney({ amountMinor: item.amountMinor, currency: item.currency })}
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
