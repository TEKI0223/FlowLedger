import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { formatMoney } from "@/domain/finance";
import { transactionTypeCardClass } from "@/domain/transaction-style";
import { cn } from "@/lib/utils";
import type { HydratedQuickEntryTemplate } from "./data";

type TemplateCardProps = {
  template: HydratedQuickEntryTemplate;
};

export function TemplateCard({ template }: TemplateCardProps) {
  const accountRoute = formatAccountRoute(template);
  const paymentRoute = [template.paymentMethod?.name, accountRoute].filter(Boolean).join(" - ");
  const categoryName = template.category?.name ?? "无分类";

  return (
    <Link
      href={`/templates/${template.id}`}
      className={cn(
        "relative grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-l-4 border-border bg-card px-3 py-3 pr-10 text-card-foreground transition-colors hover:bg-muted/40 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:px-4 sm:pr-12",
        transactionTypeCardClass[template.type],
      )}
    >
      <div className="flex aspect-square h-14 items-center justify-center rounded-md bg-background/70 px-1.5 text-center shadow-sm ring-1 ring-border/60">
        <span className="line-clamp-2 text-[0.7rem] font-semibold leading-tight text-foreground/80">
          {categoryName}
        </span>
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={
              template.enabled
                ? "truncate text-sm font-semibold"
                : "truncate text-sm font-semibold text-muted-foreground line-through"
            }
          >
            {template.name}
          </p>
          {!template.enabled ? (
            <span className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              停用
            </span>
          ) : null}
        </div>
        {paymentRoute ? (
          <p className="truncate center text-xs text-muted-foreground">{paymentRoute}</p>
        ) : null}
        {template.note ? (
          <p className="truncate text-xs text-muted-foreground/90">{template.note}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {template.amountMinor !== null && template.amountMinor !== undefined ? (
          <span className="text-right text-sm font-semibold tabular-nums">
            {formatMoney({
              amountMinor: template.amountMinor,
              currency: template.currency,
            })}
          </span>
        ) : null}
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <span className="absolute right-3 top-3 text-xs font-medium tabular-nums text-muted-foreground">
        {template.usageCount}
      </span>
    </Link>
  );
}

function formatAccountRoute(template: HydratedQuickEntryTemplate) {
  const source = template.sourceAccount?.name;
  const target = template.targetAccount?.name;

  if (template.type === "transfer") {
    return source && target ? `${source} → ${target}` : source ?? target;
  }

  if (template.type === "income" || template.type === "adjustment") {
    return target;
  }

  return source;
}
