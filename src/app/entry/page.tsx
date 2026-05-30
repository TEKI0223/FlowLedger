import Link from "next/link";
import { SlidersHorizontalIcon, ZapIcon } from "lucide-react";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { createEntryTransaction } from "@/app/actions/transactions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { getTransactionLookups } from "@/features/lookups/data";
import { listQuickEntryTemplates } from "@/features/quick-entry/data";
import {
  QuickEntryModal,
  type QuickEntryModalTemplate,
} from "@/features/quick-entry/quick-entry-modal";
import {
  temporaryQuickEntryTemplate,
  toQuickEntryModalTemplate,
} from "@/features/quick-entry/template-presenter";
import { todayIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type EntryPageProps = {
  searchParams: Promise<{
    mode?: string;
    saved?: string;
  }>;
};

type EntryMode = "quick" | "detail";

export default async function EntryPage({ searchParams }: EntryPageProps) {
  const [{ mode: modeParam, saved }, lookups, quickEntryTemplates] = await Promise.all([
    searchParams,
    getTransactionLookups(),
    listQuickEntryTemplates(),
  ]);
  const mode = normalizeMode(modeParam);
  const quickEntryModalTemplates: QuickEntryModalTemplate[] = [
    ...quickEntryTemplates.map(toQuickEntryModalTemplate),
    temporaryQuickEntryTemplate(),
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex items-center justify-between gap-3 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">记一笔</h1>
        <Link
          href="/templates"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 gap-1 text-xs text-muted-foreground",
          )}
        >
          <ZapIcon className="size-3.5" />
          管理模板
        </Link>
      </header>

      {mode === "quick" ? (
        <section className="grid gap-3">
          {saved === "1" ? <InlineAlert>记录成功</InlineAlert> : null}
          <Link
            href="/entry?mode=detail"
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 text-left ring-1 ring-foreground/10 transition-all hover:-translate-y-px hover:shadow-md hover:ring-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 active:shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <SlidersHorizontalIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">自定义</p>
                <p className="truncate text-xs text-muted-foreground">打开完整交易表单</p>
              </div>
            </div>
          </Link>
          {/* AI 拍照入口暂时隐藏（功能保留，可通过 /entry/photo 直接访问）。
              理由：单一分类小票用快捷模板更快；混合小票要等"拆分"UX 上线后再决定怎么接 AI。 */}
          <QuickEntryModal
            templates={quickEntryModalTemplates}
            categories={lookups.categories}
          />
        </section>
      ) : null}

      {mode === "detail" ? (
        <section className="mx-auto max-w-xl" aria-label="详细录入">
          <Card>
            <CardHeader>
              <CardTitle>详细录入</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionForm
                action={createEntryTransaction}
                lookups={lookups}
                defaults={{
                  occurredOn: todayIsoDate(),
                  type: "expense",
                  currency: "JPY",
                }}
                submitLabel="保存交易"
                allowSplits
              />
            </CardContent>
          </Card>
        </section>
      ) : null}
    </main>
  );
}

function normalizeMode(mode?: string): EntryMode {
  if (mode === "detail") {
    return mode;
  }

  return "quick";
}
