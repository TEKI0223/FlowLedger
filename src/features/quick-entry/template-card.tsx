import Link from "next/link";
import { ArrowRightIcon, ZapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import type { HydratedQuickEntryTemplate } from "./data";

type TemplateCardProps = {
  template: HydratedQuickEntryTemplate;
};

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <Link
      href={`/templates/${template.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <ZapIcon
            className={
              template.enabled
                ? "size-4 shrink-0 text-foreground"
                : "size-4 shrink-0 text-muted-foreground"
            }
          />
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
            <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
              停用
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{transactionTypeLabels[template.type]}</span>
          <span aria-hidden="true">·</span>
          <span>{template.category?.name ?? "无分类"}</span>
          {template.paymentMethod ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{template.paymentMethod.name}</span>
            </>
          ) : null}
          {template.sourceAccount ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{template.sourceAccount.name}</span>
            </>
          ) : null}
          {template.targetAccount && template.type !== "income" ? (
            <>
              <span aria-hidden="true">→</span>
              <span>{template.targetAccount.name}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>用过 {template.usageCount}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-right text-sm font-semibold tabular-nums">
          {template.amountMinor !== null && template.amountMinor !== undefined
            ? formatMoney({
                amountMinor: template.amountMinor,
                currency: template.currency,
              })
            : "自填金额"}
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
