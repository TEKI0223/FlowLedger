import Link from "next/link";
import { ArrowRightIcon, RepeatIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { isRecurringPending, recurringFrequencyLabels } from "@/domain/recurring";
import type { HydratedRecurringItem } from "./data";

type RecurringCardProps = {
  item: HydratedRecurringItem;
};

export function RecurringCard({ item }: RecurringCardProps) {
  const pending = item.enabled && isRecurringPending(item.nextDate);

  return (
    <Link
      href={`/recurring/${item.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{item.name}</p>
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
        <p className="truncate text-xs text-muted-foreground">
          下次 {item.nextDate}
          {item.category ? ` · ${item.category.name}` : ""}
          {item.sourceAccount ? ` · ${item.sourceAccount.name}` : ""}
          {item.targetAccount ? ` → ${item.targetAccount.name}` : ""}
          {item.paymentMethod ? ` · ${item.paymentMethod.name}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-right text-sm font-semibold tabular-nums">
          {item.amountMinor === null || item.amountMinor === undefined
            ? "变动"
            : formatMoney({ amountMinor: item.amountMinor, currency: item.currency })}
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
