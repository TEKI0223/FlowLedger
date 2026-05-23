import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, ReceiptIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/domain/finance";
import { refundStatusLabels, refundRemainingMinor, type RefundStatus } from "@/domain/refund";
import { listRefundTrackers } from "@/features/refunds/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusOrder: Record<RefundStatus, number> = {
  pending: 0,
  partial: 1,
  received: 2,
  cancelled: 3,
};

const statusBadgeClass: Record<RefundStatus, string> = {
  pending: "text-adjustment border-adjustment/30",
  partial: "text-transfer border-transfer/30",
  received: "text-income border-income/30",
  cancelled: "text-muted-foreground",
};

export default async function RefundsPage() {
  const trackers = await listRefundTrackers();

  // 未完成在前
  trackers.sort((a, b) => {
    const orderA = statusOrder[a.status as RefundStatus];
    const orderB = statusOrder[b.status as RefundStatus];
    if (orderA !== orderB) return orderA - orderB;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const pendingCount = trackers.filter(
    (t) => t.status === "pending" || t.status === "partial",
  ).length;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          首页
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">退款追踪</h1>
        <p className="text-sm text-muted-foreground">
          {trackers.length} 笔，其中
          <span className="font-semibold text-adjustment"> {pendingCount} </span>
          笔未到账完成
        </p>
      </header>

      {trackers.length === 0 ? (
        <Card size="sm" className="px-4 py-8 text-center text-sm text-muted-foreground">
          还没有退款追踪。可以从「交易」页面点开任一笔支出，给它挂一个退款追踪。
        </Card>
      ) : (
        <Card size="sm" className="divide-y divide-border py-0">
          {trackers.map((tracker) => {
            const remaining = refundRemainingMinor(
              tracker.amountMinor,
              tracker.receivedAmountMinor,
            );
            const status = tracker.status as RefundStatus;
            return (
              <Link
                key={tracker.id}
                href={`/refunds/${tracker.id}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <ReceiptIcon className="size-4 shrink-0 mt-1 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {tracker.note ?? tracker.originalTransaction?.note ?? "退款"}
                    </p>
                    <Badge variant="outline" className={cn("text-xs", statusBadgeClass[status])}>
                      {refundStatusLabels[status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tracker.expectedOn ? `预计 ${tracker.expectedOn} · ` : ""}
                    {tracker.expectedAccount ? `${tracker.expectedAccount.name} · ` : ""}
                    应退{" "}
                    {formatMoney({
                      amountMinor: tracker.amountMinor,
                      currency: tracker.currency,
                    })}
                    {tracker.receivedAmountMinor > 0
                      ? ` · 已收 ${formatMoney({
                          amountMinor: tracker.receivedAmountMinor,
                          currency: tracker.currency,
                        })}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {remaining > 0 && status !== "cancelled" ? (
                    <span className="text-sm font-semibold tabular-nums text-adjustment">
                      {formatMoney({ amountMinor: remaining, currency: tracker.currency })}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                      —
                    </span>
                  )}
                  <ArrowRightIcon className="size-3 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </main>
  );
}
