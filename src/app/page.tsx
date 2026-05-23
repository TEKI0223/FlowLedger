import Link from "next/link";
import {
  ArrowRightIcon,
  BellIcon,
  CreditCardIcon,
  PlusIcon,
  ReceiptIcon,
  RepeatIcon,
  WalletIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { MetricCell } from "@/components/ui/metric-cell";
import { Separator } from "@/components/ui/separator";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { getDashboardSummary } from "@/features/dashboard/data";
import { listAccounts } from "@/features/accounts/data";
import {
  listQuickEntryTemplates,
  type HydratedQuickEntryTemplate,
} from "@/features/quick-entry/data";
import {
  QuickEntryModal,
  type QuickEntryModalTemplate,
} from "@/features/quick-entry/quick-entry-modal";
import { countPendingRecurringItems } from "@/features/recurring/data";
import { countPendingRefunds } from "@/features/refunds/data";
import { listTransactions } from "@/features/transactions/data";
import { cn } from "@/lib/utils";
import type { ActionTileTheme } from "@/components/ui/action-tile";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

type MetricTone = "income" | "expense" | "transfer" | "adjustment";

const transactionToneClass: Record<string, string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-transfer",
  adjustment: "text-adjustment",
};

export default async function Home({ searchParams }: HomeProps) {
  const [
    { saved },
    summary,
    accounts,
    quickEntryTemplates,
    transactions,
    pendingRecurringCount,
    pendingRefundCount,
  ] = await Promise.all([
    searchParams,
    getDashboardSummary(),
    listAccounts(),
    listQuickEntryTemplates(),
    listTransactions(6),
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

  const quickEntryModalTemplates: QuickEntryModalTemplate[] = [
    ...quickEntryTemplates.map(toQuickEntryModalTemplate),
    {
      id: "temp",
      title: "临时记录",
      meta: "其他 / 日元现金",
      context: "默认 JPY 支出，保存后可以去交易页补充分类、账户和支付方式",
      amountHint: "待补全",
      theme: "temporary",
      typeLabel: "待补全",
      type: "temporary",
      currency: "JPY",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">FlowLedger</h1>
          <p className="text-sm text-muted-foreground">个人现金流与账户面板</p>
        </div>
        <Link
          href="/transactions"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-11 gap-2")}
        >
          <PlusIcon className="size-4" />
          记一笔
        </Link>
      </header>

      {saved ? <InlineAlert>已保存，首页数据和最近记录已更新。</InlineAlert> : null}

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

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">快捷记账</h2>
              <span className="text-xs text-muted-foreground">点击进入快捷录入</span>
            </div>
            <QuickEntryModal templates={quickEntryModalTemplates} />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">最近记录</h2>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                查看全部
                <ArrowRightIcon className="size-3" />
              </Link>
            </div>
            {transactions.length === 0 ? (
              <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
                还没有真实交易。点击上方「记一笔」或快捷卡片创建第一条记录。
              </Card>
            ) : (
              <Card size="sm" className="divide-y divide-border py-0">
                {transactions.map((transaction) => (
                  <article
                    key={transaction.id}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">
                        {transaction.category?.name ??
                          transaction.note ??
                          transactionTypeLabels[transaction.type]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transactionTypeLabels[transaction.type]} · {transaction.occurredOn}
                        {transaction.sourceAccount ? ` · ${transaction.sourceAccount.name}` : ""}
                        {transaction.targetAccount ? ` → ${transaction.targetAccount.name}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        transactionToneClass[transaction.type],
                      )}
                    >
                      {formatMoney({
                        amountMinor: transaction.amountMinor,
                        currency: transaction.currency,
                      })}
                    </span>
                  </article>
                ))}
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-4" aria-label="账户与高级操作">
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
              <div className="flex flex-col gap-1.5">
                <Link
                  href="/recurring"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  管理周期项
                  <ArrowRightIcon className="size-3" />
                </Link>
                <Link
                  href="/refunds"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ReceiptIcon className="size-3" />
                  退款追踪
                  <ArrowRightIcon className="size-3" />
                </Link>
                <Link
                  href="/credit-cards"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <CreditCardIcon className="size-3" />
                  信用卡账单
                  <ArrowRightIcon className="size-3" />
                </Link>
              </div>
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

          <Card>
            <CardHeader>
              <CardTitle>完整录入</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                收入、转账、调整和需要改账户的复杂记录，从完整交易页处理。
              </p>
              <Separator />
              <Link
                href="/transactions"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 w-full text-base",
                )}
              >
                打开交易页
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function toQuickEntryModalTemplate(template: HydratedQuickEntryTemplate): QuickEntryModalTemplate {
  return {
    id: template.id,
    title: template.name,
    meta: templateMeta(template),
    context: templateContext(template),
    amountHint: amountHint(template),
    theme: templateTheme(template),
    typeLabel: transactionTypeLabels[template.type],
    type: template.type,
    currency: template.currency,
  };
}

function templateMeta(template: HydratedQuickEntryTemplate) {
  const primary = template.category?.name ?? transactionTypeLabels[template.type];
  const secondary =
    template.paymentMethod?.name ?? template.sourceAccount?.name ?? template.targetAccount?.name;

  return secondary ? `${primary} / ${secondary}` : primary;
}

function templateContext(template: HydratedQuickEntryTemplate) {
  const context = [
    template.category?.name,
    template.paymentMethod?.name,
    template.sourceAccount?.name,
    template.targetAccount?.name,
  ].filter(Boolean);

  return context.length > 0 ? context.join(" / ") : transactionTypeLabels[template.type];
}

function amountHint(template: HydratedQuickEntryTemplate) {
  if (template.amountMinor === null) {
    return "自填";
  }

  return formatMoney({
    amountMinor: template.amountMinor,
    currency: template.currency,
  });
}

function templateTheme(template: HydratedQuickEntryTemplate): ActionTileTheme {
  if (template.type === "income") {
    return "income";
  }

  if (template.type === "transfer") {
    return "transfer";
  }

  const id = template.paymentMethodId ?? template.sourceAccountId ?? template.targetAccountId ?? "";

  if (id.includes("credit") || id.includes("apple")) {
    return "card";
  }

  if (id.includes("cash")) {
    return "cash";
  }

  if (id.includes("bank")) {
    return "bank";
  }

  return "wallet";
}
