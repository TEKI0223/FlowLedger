import Link from "next/link";
import { ArrowLeftIcon, PencilIcon, PlusIcon, RepeatIcon } from "lucide-react";
import { DeleteRecurringButton } from "./delete-recurring-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { recurringFrequencyLabels } from "@/domain/recurring";
import { listRecurringItems } from "@/features/recurring/data";
import { cn } from "@/lib/utils";
import { isRecurringPending } from "@/domain/recurring";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const items = await listRecurringItems();

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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">周期项目</h1>
          <p className="text-sm text-muted-foreground">
            房租、订阅、工资等定期发生的收支，到期会在首页等待确认
          </p>
        </div>
        <Link
          href="/recurring/new"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-11 gap-2")}
        >
          <PlusIcon className="size-4" />
          新增周期项
        </Link>
      </header>

      {items.length === 0 ? (
        <Card size="sm" className="px-4 py-8 text-center text-sm text-muted-foreground">
          还没有周期项目。点击右上「新增周期项」创建第一个。
        </Card>
      ) : (
        <Card size="sm" className="divide-y divide-border py-0">
          {items.map((item) => {
            const pending = item.enabled && isRecurringPending(item.nextDate);

            return (
              <article
                key={item.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {transactionTypeLabels[item.type]}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <RepeatIcon className="size-3" />
                      {recurringFrequencyLabels[item.frequency]}
                    </Badge>
                    {!item.enabled ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        已停用
                      </Badge>
                    ) : pending ? (
                      <Badge className="bg-adjustment/15 text-adjustment text-xs">待确认</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    下次：{item.nextDate}
                    {item.category ? ` · ${item.category.name}` : ""}
                    {item.sourceAccount ? ` · ${item.sourceAccount.name}` : ""}
                    {item.targetAccount ? ` → ${item.targetAccount.name}` : ""}
                    {item.paymentMethod ? ` · ${item.paymentMethod.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {item.amountMinor === null || item.amountMinor === undefined
                      ? "变动"
                      : formatMoney({ amountMinor: item.amountMinor, currency: item.currency })}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/recurring/${item.id}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "h-8 gap-1 text-xs",
                      )}
                    >
                      <PencilIcon className="size-3.5" />
                      编辑
                    </Link>
                    <DeleteRecurringButton id={item.id} name={item.name} />
                  </div>
                </div>
              </article>
            );
          })}
        </Card>
      )}
    </main>
  );
}
