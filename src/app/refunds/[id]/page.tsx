import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, ReceiptIcon } from "lucide-react";
import { CancelTrackerButton } from "../cancel-tracker-button";
import { DeleteReceiptButton } from "../delete-receipt-button";
import { DeleteTrackerButton } from "../delete-tracker-button";
import { ReceiptForm } from "../receipt-form";
import { RefundTrackerForm } from "../refund-tracker-form";
import { updateRefundTracker } from "@/app/actions/refunds";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Separator } from "@/components/ui/separator";
import {
  formatMinorForInput,
  formatMoney,
  transactionTypeLabels,
} from "@/domain/finance";
import {
  refundRemainingMinor,
  refundStatusLabels,
  type RefundStatus,
} from "@/domain/refund";
import { getTransactionLookups } from "@/features/lookups/data";
import {
  getRefundTracker,
  listRefundReceipts,
} from "@/features/refunds/data";
import { todayIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusBadgeClass: Record<RefundStatus, string> = {
  pending: "text-adjustment border-adjustment/30",
  partial: "text-transfer border-transfer/30",
  received: "text-income border-income/30",
  cancelled: "text-muted-foreground",
};

type RefundDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ received?: string }>;
};

export default async function RefundDetailPage({
  params,
  searchParams,
}: RefundDetailPageProps) {
  const [{ id }, { received }] = await Promise.all([params, searchParams]);

  const tracker = await getRefundTracker(id);
  if (!tracker) {
    notFound();
  }

  const [receipts, lookups] = await Promise.all([
    listRefundReceipts(tracker.id),
    getTransactionLookups(),
  ]);

  const status = tracker.status as RefundStatus;
  const remaining = refundRemainingMinor(tracker.amountMinor, tracker.receivedAmountMinor);
  const canRecord = status !== "received" && status !== "cancelled" && remaining > 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href="/refunds"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          退款追踪
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {tracker.note ?? tracker.originalTransaction?.note ?? "退款"}
          </h1>
          <Badge variant="outline" className={cn("text-xs", statusBadgeClass[status])}>
            {refundStatusLabels[status]}
          </Badge>
        </div>
      </header>

      {received ? <InlineAlert>到账已记录，账户余额已更新。</InlineAlert> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">退款进度</CardTitle>
          {tracker.expectedOn ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="size-3" />
              预计到账 {tracker.expectedOn}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">应退</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatMoney({ amountMinor: tracker.amountMinor, currency: tracker.currency })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">已收</p>
              <p className="text-xl font-semibold tabular-nums text-income">
                {formatMoney({
                  amountMinor: tracker.receivedAmountMinor,
                  currency: tracker.currency,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">待收</p>
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  remaining > 0 && status !== "cancelled"
                    ? "text-adjustment"
                    : "text-muted-foreground",
                )}
              >
                {formatMoney({ amountMinor: remaining, currency: tracker.currency })}
              </p>
            </div>
          </div>

          {tracker.expectedAccount ? (
            <p className="text-xs text-muted-foreground">
              预计到账账户：{tracker.expectedAccount.name} · {tracker.expectedAccount.currency}
            </p>
          ) : null}

          <Separator />

          <div className="flex flex-wrap items-center gap-1">
            <CancelTrackerButton id={tracker.id} isCancelled={status === "cancelled"} />
            <DeleteTrackerButton
              id={tracker.id}
              disabled={tracker.receivedAmountMinor > 0}
            />
          </div>
        </CardContent>
      </Card>

      {tracker.originalTransaction ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">关联原始交易</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/transactions/${tracker.originalTransaction.id}`}
              className="flex items-center justify-between gap-3 text-sm hover:text-foreground"
            >
              <div className="space-y-0.5">
                <p className="font-medium">
                  {tracker.originalTransaction.note ??
                    transactionTypeLabels[tracker.originalTransaction.type]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transactionTypeLabels[tracker.originalTransaction.type]} ·{" "}
                  {tracker.originalTransaction.occurredOn}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-expense">
                {formatMoney({
                  amountMinor: tracker.originalTransaction.amountMinor,
                  currency: tracker.originalTransaction.currency,
                })}
              </span>
              <ArrowRightIcon className="size-3 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {receipts.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptIcon className="size-4 text-muted-foreground" />
              已收到账记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {receipts.map((receipt) => (
                <li
                  key={receipt.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium tabular-nums text-income">
                      +
                      {formatMoney({
                        amountMinor: receipt.amountMinor,
                        currency: receipt.currency,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.occurredOn}
                      {receipt.account ? ` · 入账 ${receipt.account.name}` : ""}
                      {receipt.note ? ` · ${receipt.note}` : ""}
                    </p>
                  </div>
                  <DeleteReceiptButton receiptId={receipt.id} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {canRecord ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">记录新一笔到账</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceiptForm
              trackerId={tracker.id}
              currency={tracker.currency}
              remainingMinor={remaining}
              expectedAccountId={tracker.expectedAccountId}
              todayIso={todayIsoDate()}
              accounts={lookups.accounts}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">编辑追踪信息</CardTitle>
        </CardHeader>
        <CardContent>
          <RefundTrackerForm
            action={updateRefundTracker.bind(null, tracker.id)}
            lookups={lookups}
            defaults={{
              amount: formatMinorForInput({
                amountMinor: tracker.amountMinor,
                currency: tracker.currency,
              }),
              currency: tracker.currency,
              expectedAccountId: tracker.expectedAccountId ?? undefined,
              expectedOn: tracker.expectedOn ?? undefined,
              note: tracker.note ?? undefined,
            }}
            submitLabel="保存修改"
          />
        </CardContent>
      </Card>
    </main>
  );
}
