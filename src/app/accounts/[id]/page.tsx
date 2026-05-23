import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  PencilIcon,
  RepeatIcon,
  ScaleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricCell } from "@/components/ui/metric-cell";
import {
  accountTypeLabels,
  currencyLabels,
  formatMoney,
  transactionTypeLabels,
} from "@/domain/finance";
import { getAccountDetail } from "@/features/accounts/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AccountDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { id } = await params;
  const detail = await getAccountDetail(id);

  if (!detail) {
    notFound();
  }

  const { account, monthly, recent, pending } = detail;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-2 pb-5">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          账户
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{account.name}</h1>
          <Badge variant="secondary" className="text-xs">
            {accountTypeLabels[account.type]}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {currencyLabels[account.currency]}
          </Badge>
          {!account.includeInNetWorth ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              不计入净资产
            </Badge>
          ) : null}
        </div>
        {account.note ? <p className="text-sm text-muted-foreground">{account.note}</p> : null}
      </header>

      <section
        aria-label="账户概览"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <MetricCell
          label="当前余额"
          value={formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}
          note={account.includeInNetWorth ? "计入净资产" : "不计入净资产"}
        />
        <MetricCell
          label="本月流入"
          value={formatMoney({ amountMinor: monthly.inMinor, currency: account.currency })}
          note="收入、转入、调整加余额"
          tone="income"
        />
        <MetricCell
          label="本月流出"
          value={formatMoney({ amountMinor: monthly.outMinor, currency: account.currency })}
          note="支出、转出"
          tone="expense"
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">快捷操作</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href={`/accounts/${account.id}/calibrate`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-auto min-h-16 flex-col gap-1 text-sm",
            )}
          >
            <ScaleIcon className="size-4" />
            余额校准
          </Link>
          <Link
            href={`/accounts/${account.id}/topup`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-auto min-h-16 flex-col gap-1 text-sm",
            )}
          >
            <ArrowDownToLineIcon className="size-4" />
            {account.type === "credit_card" ? "还款" : "充值 / 转入"}
          </Link>
          <Link
            href={`/accounts/${account.id}/spend`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-auto min-h-16 flex-col gap-1 text-sm",
            )}
          >
            <ArrowUpFromLineIcon className="size-4" />
            消费 / 转出
          </Link>
          <Link
            href={`/accounts/${account.id}/edit`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-auto min-h-16 flex-col gap-1 text-sm",
            )}
          >
            <PencilIcon className="size-4" />
            编辑账户
          </Link>
        </div>
      </section>

      {pending.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">待处理周期项</h2>
          <Card size="sm" className="divide-y divide-border py-0">
            {pending.map((item) => (
              <article
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <RepeatIcon className="size-3" />
                      {transactionTypeLabels[item.type]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    应于 {item.nextDate} · {item.direction === "in" ? "流入" : "流出"}
                  </p>
                </div>
                <Link
                  href="/recurring/pending"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-xs")}
                >
                  去确认
                </Link>
              </article>
            ))}
          </Card>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">最近交易</h2>
          <span className="text-xs text-muted-foreground">{recent.length} 条</span>
        </div>
        {recent.length === 0 ? (
          <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
            这个账户还没有交易记录。
          </Card>
        ) : (
          <Card size="sm" className="divide-y divide-border py-0">
            {recent.map((tx) => (
              <article
                key={tx.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-medium">
                    {tx.category?.name ?? tx.note ?? transactionTypeLabels[tx.type]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transactionTypeLabels[tx.type]} · {tx.occurredOn}
                    {tx.counterpart
                      ? tx.direction === "in"
                        ? ` · 从 ${tx.counterpart.name}`
                        : ` · 到 ${tx.counterpart.name}`
                      : ""}
                    {tx.paymentMethod ? ` · ${tx.paymentMethod.name}` : ""}
                  </p>
                </div>
                {(() => {
                  // 调整交易：金额本身带符号；其他类型：用 direction 决定符号
                  const effectiveDirection: "in" | "out" =
                    tx.type === "adjustment"
                      ? tx.amountMinor >= 0
                        ? "in"
                        : "out"
                      : tx.direction;
                  const displayMinor =
                    tx.type === "adjustment" ? Math.abs(tx.amountMinor) : tx.amountMinor;
                  return (
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        effectiveDirection === "in" ? "text-income" : "text-expense",
                      )}
                    >
                      {effectiveDirection === "in" ? "+" : "−"}
                      {formatMoney({ amountMinor: displayMinor, currency: tx.currency })}
                    </span>
                  );
                })()}
              </article>
            ))}
          </Card>
        )}
      </section>
    </main>
  );
}
