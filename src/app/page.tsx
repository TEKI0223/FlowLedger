import Link from "next/link";
import { ArrowRightIcon, BellIcon, ReceiptIcon, RepeatIcon, WalletIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { MetricCell } from "@/components/ui/metric-cell";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/domain/finance";
import { getDashboardSummary } from "@/features/dashboard/data";
import { listAccounts } from "@/features/accounts/data";
import { countPendingRecurringItems } from "@/features/recurring/data";
import { countPendingRefunds } from "@/features/refunds/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

type MetricTone = "income" | "expense" | "transfer" | "adjustment";

export default async function Home({ searchParams }: HomeProps) {
  const [{ saved }, summary, accounts, pendingRecurringCount, pendingRefundCount] =
    await Promise.all([
      searchParams,
      getDashboardSummary(),
      listAccounts(),
      countPendingRecurringItems(),
      countPendingRefunds(),
    ]);

  const metrics: Array<{ label: string; value: string; note?: string; tone?: MetricTone }> = [
    {
      label: "本月收入",
      value: formatMoney({ amountMinor: summary.income.JPY, currency: "JPY" }),
      note: "JPY",
      tone: "income",
    },
    {
      label: "本月支出",
      value: formatMoney({ amountMinor: summary.expense.JPY, currency: "JPY" }),
      note: "不含转账和调整",
      tone: "expense",
    },
    {
      label: "本月结余",
      value: formatMoney({
        amountMinor: summary.income.JPY - summary.expense.JPY,
        currency: "JPY",
      }),
      note: "收入 − 支出",
      tone: "transfer",
    },
    {
      label: "JPY 资产",
      value: formatMoney({ amountMinor: summary.assets.JPY, currency: "JPY" }),
    },
    {
      label: "CNY 资产",
      value: formatMoney({ amountMinor: summary.assets.CNY, currency: "CNY" }),
    },
    {
      label: "折算净资产",
      value: formatMoney({
        amountMinor: summary.netWorth.amountMinor,
        currency: summary.netWorth.baseCurrency,
      }),
      note:
        summary.netWorth.rateCnyToJpy === null
          ? "缺少汇率"
          : `1 CNY = ${summary.netWorth.rateCnyToJpy.toFixed(2)} JPY`,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">FlowLedger</h1>
          <p className="text-sm text-muted-foreground">个人现金流与账户面板</p>
        </div>
      </header>

      {saved ? <InlineAlert>已保存，首页数据已更新。</InlineAlert> : null}

      <section
        aria-label="财务概览"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6"
      >
        {metrics.map((metric) => (
          <MetricCell
            label={metric.label}
            value={metric.value}
            note={metric.note}
            tone={metric.tone}
            key={metric.label}
          />
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="待处理与账户">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="size-4 text-muted-foreground" />
              待处理事项
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRecurringCount === 0 && pendingRefundCount === 0 ? (
              <p className="text-sm text-muted-foreground">没有待处理项。</p>
            ) : (
              <div className="space-y-2">
                {pendingRecurringCount > 0 ? (
                  <Link
                    href="/recurring/pending"
                    className="flex items-center justify-between gap-3 rounded-lg border border-adjustment/30 bg-adjustment/5 px-3 py-2.5 text-sm transition-colors hover:bg-adjustment/10"
                  >
                    <div className="flex items-center gap-2">
                      <RepeatIcon className="size-4 text-adjustment" />
                      <span>
                        <strong className="font-semibold text-adjustment">
                          {pendingRecurringCount}
                        </strong>
                        <span className="text-muted-foreground"> 个待确认周期项</span>
                      </span>
                    </div>
                    <ArrowRightIcon className="size-4 text-adjustment" />
                  </Link>
                ) : null}
                {pendingRefundCount > 0 ? (
                  <Link
                    href="/refunds"
                    className="flex items-center justify-between gap-3 rounded-lg border border-transfer/30 bg-transfer/5 px-3 py-2.5 text-sm transition-colors hover:bg-transfer/10"
                  >
                    <div className="flex items-center gap-2">
                      <ReceiptIcon className="size-4 text-transfer" />
                      <span>
                        <strong className="font-semibold text-transfer">
                          {pendingRefundCount}
                        </strong>
                        <span className="text-muted-foreground"> 笔退款未到账</span>
                      </span>
                    </div>
                    <ArrowRightIcon className="size-4 text-transfer" />
                  </Link>
                ) : null}
              </div>
            )}
            <Separator />
            <Link
              href="/manage"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              打开管理
              <ArrowRightIcon className="size-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="size-4 text-muted-foreground" />
              账户余额
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {accounts.slice(0, 6).map((account, index) => (
              <div
                key={account.id}
                className={cn(
                  "flex items-center justify-between gap-3 py-2.5",
                  index > 0 && "border-t border-border",
                )}
              >
                <span className="truncate text-sm">{account.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney({
                    amountMinor: account.balanceMinor,
                    currency: account.currency,
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
