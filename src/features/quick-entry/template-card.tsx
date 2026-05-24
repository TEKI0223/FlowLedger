import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { transactionTypeColorClass } from "@/domain/transaction-style";
import type { HydratedQuickEntryTemplate } from "./data";

type TemplateCardProps = {
  template: HydratedQuickEntryTemplate;
};

export function TemplateCard({ template }: TemplateCardProps) {
  const accountRoute = formatAccountRoute(template);
  const paymentRoute = [template.paymentMethod?.name, accountRoute].filter(Boolean).join(" - ");
  const categoryPath = template.category?.label ?? "无分类";
  const meta = [categoryPath, paymentRoute].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/templates/${template.id}`}
      className="block rounded-xl outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
    >
      <Card
        size="sm"
        className="px-4 py-3 text-card-foreground transition-colors hover:bg-muted/60"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p
                className={
                  template.enabled
                    ? "truncate text-sm font-semibold"
                    : "truncate text-sm font-semibold text-muted-foreground line-through"
                }
              >
                {template.name}
              </p>
              <Badge variant="outline" className={transactionTypeColorClass[template.type]}>
                {transactionTypeLabels[template.type]}
              </Badge>
              <Badge variant={template.enabled ? "outline" : "destructive"}>
                {template.enabled ? "启用" : "停用"}
              </Badge>
            </div>
            {template.amountMinor !== null && template.amountMinor !== undefined ? (
              <p className="truncate text-xs font-semibold tabular-nums text-foreground/80">
                {formatMoney({
                  amountMinor: template.amountMinor,
                  currency: template.currency,
                })}
              </p>
            ) : null}
            <p className="truncate text-xs text-muted-foreground">{meta}</p>
            {template.note ? (
              <p className="truncate text-xs text-muted-foreground/90">{template.note}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-md border border-border bg-background/60 px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground">
              {template.usageCount} 次
            </span>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function formatAccountRoute(template: HydratedQuickEntryTemplate) {
  const source = template.sourceAccount?.name;
  const target = template.targetAccount?.name;

  if (template.type === "transfer") {
    return source && target ? `${source} → ${target}` : (source ?? target);
  }

  if (template.type === "income" || template.type === "adjustment") {
    return target;
  }

  return source;
}
