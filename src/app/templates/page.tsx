import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, PencilIcon, PlusIcon, ZapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { listAllQuickEntryTemplates } from "@/features/quick-entry/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listAllQuickEntryTemplates();
  const enabledCount = templates.filter((t) => t.enabled).length;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" />
            首页
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">快捷模板</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} 个模板，{enabledCount} 个启用 · 首页按使用次数排序
          </p>
        </div>
        <Link
          href="/templates/new"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-11 gap-2")}
        >
          <PlusIcon className="size-4" />
          新建模板
        </Link>
      </header>

      {templates.length === 0 ? (
        <Card size="sm" className="px-4 py-8 text-center text-sm text-muted-foreground">
          还没有模板。点右上「新建模板」加一个。
        </Card>
      ) : (
        <Card size="sm" className="divide-y divide-border py-0">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/templates/${template.id}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <ZapIcon
                className={cn(
                  "size-4 shrink-0 mt-1",
                  template.enabled ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      template.enabled ? "" : "text-muted-foreground line-through",
                    )}
                  >
                    {template.name}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {transactionTypeLabels[template.type]}
                  </Badge>
                  {!template.enabled ? (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      已停用
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {template.category?.name ?? "无分类"}
                  {template.paymentMethod ? ` · ${template.paymentMethod.name}` : ""}
                  {template.sourceAccount ? ` · ${template.sourceAccount.name}` : ""}
                  {template.targetAccount && template.type !== "income"
                    ? ` → ${template.targetAccount.name}`
                    : ""}
                  {template.amountMinor !== null && template.amountMinor !== undefined
                    ? ` · ${formatMoney({
                        amountMinor: template.amountMinor,
                        currency: template.currency,
                      })}`
                    : " · 自填金额"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground tabular-nums">
                  用过 {template.usageCount}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <PencilIcon className="size-3" />
                  编辑
                  <ArrowRightIcon className="size-3" />
                </span>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </main>
  );
}
