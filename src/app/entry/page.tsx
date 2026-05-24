import Link from "next/link";
import { SlidersHorizontalIcon, ZapIcon } from "lucide-react";
import { TransactionForm } from "@/app/transactions/transaction-form";
import { createEntryTransaction } from "@/app/actions/transactions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  }>;
};

type EntryMode = "quick" | "detail";

export default async function EntryPage({ searchParams }: EntryPageProps) {
  const [{ mode: modeParam }, lookups, quickEntryTemplates] = await Promise.all([
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
      <header className="flex items-center justify-between gap-2 pb-5">
        <div className="flex justify-start">
          <Link
            href="/entry?mode=detail"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 gap-1 text-xs text-muted-foreground",
            )}
          >
            <SlidersHorizontalIcon className="size-3.5" />
            打开详细录入
          </Link>
        </div>
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
        <section>
          <QuickEntryModal templates={quickEntryModalTemplates} />
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
