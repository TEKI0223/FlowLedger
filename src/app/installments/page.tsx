import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, LayersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/domain/finance";
import {
  installmentStatusLabels,
  type InstallmentStatus,
} from "@/domain/installment";
import { listInstallmentPlans } from "@/features/installments/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusOrder: Record<InstallmentStatus, number> = {
  active: 0,
  completed: 1,
  cancelled: 2,
};

const statusBadgeClass: Record<InstallmentStatus, string> = {
  active: "text-transfer border-transfer/30",
  completed: "text-income border-income/30",
  cancelled: "text-muted-foreground",
};

export default async function InstallmentsPage() {
  const plans = await listInstallmentPlans();

  plans.sort((a, b) => {
    const orderA = statusOrder[a.status as InstallmentStatus];
    const orderB = statusOrder[b.status as InstallmentStatus];
    if (orderA !== orderB) return orderA - orderB;
    return a.firstPaymentOn < b.firstPaymentOn ? 1 : -1;
  });

  const activeCount = plans.filter((p) => p.status === "active").length;

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
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">分期计划</h1>
        <p className="text-sm text-muted-foreground">
          {plans.length} 个计划，
          <span className="font-semibold text-transfer">{activeCount}</span> 个进行中
        </p>
      </header>

      {plans.length === 0 ? (
        <Card size="sm" className="px-4 py-8 text-center text-sm text-muted-foreground">
          还没有分期计划。可以从「交易」页打开任一笔支出，给它挂一个分期计划。
        </Card>
      ) : (
        <Card size="sm" className="divide-y divide-border py-0">
          {plans.map((plan) => {
            const status = plan.status as InstallmentStatus;
            return (
              <Link
                key={plan.id}
                href={`/installments/${plan.id}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <LayersIcon className="size-4 shrink-0 mt-1 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {plan.originalTransaction?.note ??
                        plan.category?.name ??
                        "分期"}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusBadgeClass[status])}
                    >
                      {installmentStatusLabels[status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {plan.completedPeriods} / {plan.periods} 期 · 首期{" "}
                    {plan.firstPaymentOn}
                    {plan.sourceAccount ? ` · ${plan.sourceAccount.name}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums text-expense">
                    {formatMoney({
                      amountMinor: plan.totalAmountMinor,
                      currency: plan.currency,
                    })}
                  </span>
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
