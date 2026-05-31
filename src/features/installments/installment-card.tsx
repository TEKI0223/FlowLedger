import Link from "next/link";
import { ArrowRightIcon, LayersIcon } from "lucide-react";
import { MoneyText } from "@/components/privacy/money-text";
import { Badge } from "@/components/ui/badge";
import { installmentStatusLabels, type InstallmentStatus } from "@/domain/installment";
import { cn } from "@/lib/utils";
import type { HydratedInstallmentPlan } from "./data";

const statusBadgeClass: Record<InstallmentStatus, string> = {
  active: "text-transfer border-transfer/30",
  completed: "text-income border-income/30",
  cancelled: "text-muted-foreground",
};

type InstallmentCardProps = {
  plan: HydratedInstallmentPlan;
};

export function InstallmentCard({ plan }: InstallmentCardProps) {
  const status = plan.status as InstallmentStatus;

  return (
    <Link
      href={`/installments/${plan.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <LayersIcon className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-semibold">
            {plan.originalTransaction?.note ?? plan.category?.name ?? "分期"}
          </p>
          <Badge variant="outline" className={cn("shrink-0 text-xs", statusBadgeClass[status])}>
            {installmentStatusLabels[status]}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {plan.completedPeriods} / {plan.periods} 期 · 首期 {plan.firstPaymentOn}
          {plan.sourceAccount ? ` · ${plan.sourceAccount.name}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-right text-sm font-semibold tabular-nums text-expense">
          <MoneyText amountMinor={plan.totalAmountMinor} currency={plan.currency} />
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
