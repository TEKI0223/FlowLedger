import Link from "next/link";
import { ArrowRightIcon, ReceiptIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/domain/finance";
import { refundRemainingMinor, refundStatusLabels, type RefundStatus } from "@/domain/refund";
import { cn } from "@/lib/utils";
import type { HydratedRefundTracker } from "./data";

const statusBadgeClass: Record<RefundStatus, string> = {
  pending: "text-adjustment border-adjustment/30",
  partial: "text-transfer border-transfer/30",
  received: "text-income border-income/30",
  cancelled: "text-muted-foreground",
};

type RefundCardProps = {
  tracker: HydratedRefundTracker;
};

export function RefundCard({ tracker }: RefundCardProps) {
  const status = tracker.status as RefundStatus;
  const remaining = refundRemainingMinor(tracker.amountMinor, tracker.receivedAmountMinor);

  return (
    <Link
      href={`/refunds/${tracker.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <ReceiptIcon className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-semibold">
            {tracker.note ?? tracker.originalTransaction?.note ?? "退款"}
          </p>
          <Badge variant="outline" className={cn("shrink-0 text-xs", statusBadgeClass[status])}>
            {refundStatusLabels[status]}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {tracker.expectedOn ? `预计 ${tracker.expectedOn} · ` : ""}
          {tracker.expectedAccount ? `${tracker.expectedAccount.name} · ` : ""}
          应退 {formatMoney({ amountMinor: tracker.amountMinor, currency: tracker.currency })}
          {tracker.receivedAmountMinor > 0
            ? ` · 已收 ${formatMoney({
                amountMinor: tracker.receivedAmountMinor,
                currency: tracker.currency,
              })}`
            : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "text-right text-sm font-semibold tabular-nums",
            remaining > 0 && status !== "cancelled" ? "text-adjustment" : "text-muted-foreground",
          )}
        >
          {remaining > 0 && status !== "cancelled"
            ? formatMoney({ amountMinor: remaining, currency: tracker.currency })
            : "—"}
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
