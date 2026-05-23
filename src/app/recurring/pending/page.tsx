import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, RepeatIcon } from "lucide-react";
import { ConfirmRecurringForm } from "./confirm-recurring-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { formatMinorForInput, transactionTypeLabels } from "@/domain/finance";
import { recurringFrequencyLabels } from "@/domain/recurring";
import { listPendingRecurringItems } from "@/features/recurring/data";

export const dynamic = "force-dynamic";

type PendingPageProps = {
  searchParams: Promise<{
    confirmed?: string;
    skipped?: string;
  }>;
};

export default async function RecurringPendingPage({ searchParams }: PendingPageProps) {
  const [{ confirmed, skipped }, items] = await Promise.all([
    searchParams,
    listPendingRecurringItems(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          首页
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">待确认周期项</h1>
        <p className="text-sm text-muted-foreground">
          确认后会生成正式交易并按周期推进下次发生日期；跳过仅推进日期，不记账
        </p>
      </header>

      {confirmed ? <InlineAlert>已确认并记账，账户余额已更新。</InlineAlert> : null}
      {skipped ? <InlineAlert>已跳过本期，下次发生日期已推进。</InlineAlert> : null}

      {items.length === 0 ? (
        <Card size="sm" className="px-4 py-8 text-center text-sm text-muted-foreground">
          没有待确认的周期项。
          <div className="mt-3">
            <Link
              href="/recurring"
              className="text-primary hover:underline"
            >
              管理周期项 →
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const amountDefault =
              item.amountMinor === null || item.amountMinor === undefined
                ? ""
                : formatMinorForInput({
                    amountMinor: item.amountMinor,
                    currency: item.currency,
                  });

            return (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {item.name}
                    <Badge variant="secondary" className="text-xs">
                      {transactionTypeLabels[item.type]}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <RepeatIcon className="size-3" />
                      {recurringFrequencyLabels[item.frequency]}
                    </Badge>
                  </CardTitle>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarIcon className="size-3" />
                    应于 {item.nextDate}
                    {item.category ? ` · ${item.category.name}` : ""}
                    {item.sourceAccount ? ` · ${item.sourceAccount.name}` : ""}
                    {item.targetAccount ? ` → ${item.targetAccount.name}` : ""}
                    {item.paymentMethod ? ` · ${item.paymentMethod.name}` : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <ConfirmRecurringForm
                    itemId={item.id}
                    occurredOnDefault={item.nextDate}
                    amountDefault={amountDefault}
                    amountFixed={item.amountFixed}
                    noteDefault={item.note ?? ""}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
