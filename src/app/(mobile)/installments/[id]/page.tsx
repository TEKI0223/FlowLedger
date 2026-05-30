import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, CalendarIcon, LayersIcon } from "lucide-react";
import { CancelInstallmentButton } from "../cancel-installment-button";
import { DeleteInstallmentButton } from "../delete-installment-button";
import { InstallmentForm } from "../installment-form";
import { PeriodButtons } from "../period-buttons";
import { updateInstallmentPlan } from "@/app/actions/installments";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMinorForInput, formatMoney, transactionTypeLabels } from "@/domain/finance";
import {
  classifyInstallmentFee,
  computeInstallmentDueDates,
  installmentStatusLabels,
  type InstallmentStatus,
} from "@/domain/installment";
import { getInstallmentPlan } from "@/features/installments/data";
import { todayIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusBadgeClass: Record<InstallmentStatus, string> = {
  active: "text-transfer border-transfer/30",
  completed: "text-income border-income/30",
  cancelled: "text-muted-foreground",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InstallmentDetailPage({ params }: Props) {
  const { id } = await params;
  const plan = await getInstallmentPlan(id);

  if (!plan) {
    notFound();
  }

  const status = plan.status as InstallmentStatus;
  const dueDates = computeInstallmentDueDates(plan.firstPaymentOn, plan.periods);
  const today = todayIsoDate();

  const remainingPeriods = Math.max(0, plan.periods - plan.completedPeriods);
  const remainingMinor = remainingPeriods * plan.amountPerPeriodMinor;
  const paidMinor = plan.completedPeriods * plan.amountPerPeriodMinor;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
              <LayersIcon className="size-6 text-muted-foreground" />
              {plan.originalTransaction?.note ?? plan.category?.name ?? "分期计划"}
            </h1>
            <Badge variant="outline" className={cn("text-xs", statusBadgeClass[status])}>
              {installmentStatusLabels[status]}
            </Badge>
          </div>
          <DeleteInstallmentButton id={plan.id} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">分期进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">总金额</p>
              <p className="text-xl font-semibold tabular-nums">
                {formatMoney({ amountMinor: plan.totalAmountMinor, currency: plan.currency })}
              </p>
              {(() => {
                const fee = classifyInstallmentFee(plan.feeAmountMinor ?? 0, plan.periods);
                if (fee.kind === "interest") {
                  return (
                    <p className="text-xs text-adjustment">
                      含利息 {formatMoney({ amountMinor: fee.totalMinor, currency: plan.currency })}
                    </p>
                  );
                }
                if (fee.kind === "rebate") {
                  return (
                    <p className="text-xs text-income">
                      回扣 {formatMoney({ amountMinor: fee.totalMinor, currency: plan.currency })}
                    </p>
                  );
                }
                return <p className="text-xs text-muted-foreground">无利息</p>;
              })()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">已扣</p>
              <p className="text-xl font-semibold tabular-nums text-income">
                {formatMoney({ amountMinor: paidMinor, currency: plan.currency })}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {plan.completedPeriods} / {plan.periods} 期
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">待扣</p>
              <p
                className={cn(
                  "text-xl font-semibold tabular-nums",
                  remainingMinor > 0 && status !== "cancelled"
                    ? "text-adjustment"
                    : "text-muted-foreground",
                )}
              >
                {formatMoney({ amountMinor: remainingMinor, currency: plan.currency })}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                每期{" "}
                {formatMoney({ amountMinor: plan.amountPerPeriodMinor, currency: plan.currency })}
              </p>
            </div>
          </div>

          <Separator />

          <PeriodButtons
            id={plan.id}
            canMark={status !== "cancelled" && plan.completedPeriods < plan.periods}
            canUnmark={plan.completedPeriods > 0}
          />

          <div className="flex flex-wrap items-center gap-1">
            <CancelInstallmentButton id={plan.id} isCancelled={status === "cancelled"} />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-4 text-muted-foreground" />
            扣款日历
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {dueDates.map((date, index) => {
              const isPaid = index < plan.completedPeriods;
              const isPast = date <= today;
              return (
                <li
                  key={date + index}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-xs text-muted-foreground">#{index + 1}</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        isPaid ? "text-muted-foreground line-through" : "",
                      )}
                    >
                      {date}
                    </span>
                    {isPaid ? (
                      <Badge variant="outline" className="text-xs text-income border-income/30">
                        已扣
                      </Badge>
                    ) : isPast && status === "active" ? (
                      <Badge
                        variant="outline"
                        className="text-xs text-adjustment border-adjustment/30"
                      >
                        已到期
                      </Badge>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      isPaid ? "text-muted-foreground" : "text-expense",
                    )}
                  >
                    {formatMoney({
                      amountMinor: plan.amountPerPeriodMinor,
                      currency: plan.currency,
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {plan.originalTransaction ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">关联原始交易</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/transactions/${plan.originalTransaction.id}`}
              className="flex items-center justify-between gap-3 text-sm hover:text-foreground"
            >
              <div className="space-y-0.5">
                <p className="font-medium">
                  {plan.originalTransaction.note ??
                    transactionTypeLabels[plan.originalTransaction.type]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transactionTypeLabels[plan.originalTransaction.type]} ·{" "}
                  {plan.originalTransaction.occurredOn}
                  {plan.sourceAccount ? ` · ${plan.sourceAccount.name}` : ""}
                </p>
              </div>
              <span className="font-semibold tabular-nums text-expense">
                {formatMoney({
                  amountMinor: plan.originalTransaction.amountMinor,
                  currency: plan.originalTransaction.currency,
                })}
              </span>
              <ArrowRightIcon className="size-3 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">编辑分期</CardTitle>
        </CardHeader>
        <CardContent>
          <InstallmentForm
            action={updateInstallmentPlan.bind(null, plan.id)}
            defaults={{
              totalAmount: formatMinorForInput({
                amountMinor: plan.totalAmountMinor,
                currency: plan.currency,
              }),
              currency: plan.currency,
              periods: String(plan.periods),
              amountPerPeriod: formatMinorForInput({
                amountMinor: plan.amountPerPeriodMinor,
                currency: plan.currency,
              }),
              firstPaymentOn: plan.firstPaymentOn,
            }}
            submitLabel="保存修改"
          />
        </CardContent>
      </Card>
    </main>
  );
}
