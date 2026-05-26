import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CreditCardIcon,
  FolderTreeIcon,
  LayersIcon,
  ListFilterIcon,
  MousePointerClickIcon,
  ReceiptIcon,
  RepeatIcon,
  SearchXIcon,
  WalletIcon,
  ZapIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  accountTypeLabels,
  formatMoney,
  paymentMethodTypeLabels,
  transactionTypeLabels,
  type Currency,
} from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";
import { listAccounts } from "@/features/accounts/data";
import { listCategories } from "@/features/categories/data";
import { listCreditCards, listCardStatements } from "@/features/credit-cards/data";
import { getDashboardSummary } from "@/features/dashboard/data";
import { listInstallmentPlans } from "@/features/installments/data";
import { getTransactionLookups } from "@/features/lookups/data";
import { listPaymentMethods } from "@/features/payment-methods/data";
import { listAllQuickEntryTemplates } from "@/features/quick-entry/data";
import { listPendingRecurringItems } from "@/features/recurring/data";
import { listRefundTrackers } from "@/features/refunds/data";
import {
  getTransactionFilterLabels,
  TransactionFilterDialog,
} from "@/features/transactions/transaction-filter-dialog";
import { listTransactions } from "@/features/transactions/data";
import { parseTransactionFilters } from "@/features/transactions/filters";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DesktopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type RecentTransaction = Awaited<ReturnType<typeof listTransactions>>[number];
type Account = Awaited<ReturnType<typeof listAccounts>>[number];

export default async function DesktopPage({ searchParams }: DesktopPageProps) {
  const rawSearchParams = await searchParams;
  const query = getSingleParam(rawSearchParams.q).trim();
  const filters = parseTransactionFilters(rawSearchParams);

  const [
    summary,
    accounts,
    rawTransactions,
    lookups,
    pendingRecurring,
    refunds,
    installments,
    creditCards,
    categories,
    paymentMethods,
    templates,
  ] = await Promise.all([
    getDashboardSummary(),
    listAccounts(),
    listTransactions(120, filters),
    getTransactionLookups(),
    listPendingRecurringItems(),
    listRefundTrackers(),
    listInstallmentPlans(),
    listCreditCards(),
    listCategories(),
    listPaymentMethods(),
    listAllQuickEntryTemplates(),
  ]);

  const statementsByCard = await Promise.all(
    creditCards.map(async (card) => ({
      card,
      statement: (await listCardStatements(card, 1))[0] ?? null,
    })),
  );
  const transactions = query
    ? rawTransactions.filter((tx) => matchesTransaction(tx, query))
    : rawTransactions;
  const filterLabels = getTransactionFilterLabels(filters, lookups);
  const pendingRefunds = refunds.filter(
    (refund) => refund.status !== "received" && refund.status !== "cancelled",
  );
  const activeInstallments = installments.filter(
    (plan) => plan.status !== "completed" && plan.status !== "cancelled",
  );
  const cardReminders = statementsByCard.filter(
    ({ card, statement }) =>
      card.enabled && statement && !statement.isPaid && statement.totalAmountMinor > 0,
  );

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 md:px-6 lg:px-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">PC 管理工作台</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">总览</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/transactions" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ListFilterIcon className="size-3.5" />
            交易管理
          </Link>
          <Link href="/accounts" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <WalletIcon className="size-3.5" />
            账户管理
          </Link>
          <Link href="/entry" className={buttonVariants({ size: "sm" })}>
            <ZapIcon className="size-3.5" />
            记一笔
          </Link>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" aria-label="关键指标">
        <MetricCard
          label="折算净资产"
          value={formatMoney({
            amountMinor: summary.netWorth.amountMinor,
            currency: summary.netWorth.baseCurrency,
          })}
          note={
            summary.netWorth.rateCnyToJpy === null
              ? "缺少 CNY 到 JPY 汇率"
              : `1 CNY = ${summary.netWorth.rateCnyToJpy.toFixed(2)} JPY`
          }
          tone="primary"
        />
        <MetricCard label="本月收入" value={formatCurrencyPair(summary.income)} tone="income" />
        <MetricCard label="本月支出" value={formatCurrencyPair(summary.expense)} tone="expense" />
        <MetricCard
          label="本月结余"
          value={formatCurrencyPair({
            JPY: summary.income.JPY - summary.expense.JPY,
            CNY: summary.income.CNY - summary.expense.CNY,
          })}
          tone="transfer"
        />
        <MetricCard
          label="待处理"
          value={`${pendingRecurring.length + pendingRefunds.length + activeInstallments.length + cardReminders.length} 项`}
          note={`${pendingRecurring.length} 周期 · ${pendingRefunds.length} 退款 · ${cardReminders.length} 卡账单`}
          tone="warning"
        />
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <AccountAssetTable accounts={accounts} />
          <RecentTransactionsTable
            transactions={transactions}
            totalBeforeSearch={rawTransactions.length}
            query={query}
            filters={filters}
            lookups={lookups}
            filterLabels={filterLabels}
          />
        </div>

        <aside id="work-queue" className="min-w-0 space-y-5 xl:col-span-4">
          <WorkQueue
            pendingRecurring={pendingRecurring}
            pendingRefunds={pendingRefunds}
            cardReminders={cardReminders}
            activeInstallments={activeInstallments}
          />
          <ManagementIndex
            categoriesCount={categories.length}
            paymentMethods={paymentMethods}
            templates={templates}
            accountsCount={accounts.length}
            creditCardsCount={creditCards.length}
            recurringCount={pendingRecurring.length}
            refundsCount={pendingRefunds.length}
            installmentsCount={activeInstallments.length}
          />
        </aside>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone: "primary" | "income" | "expense" | "transfer" | "warning";
}) {
  return (
    <Card size="sm" className="rounded-lg px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "whitespace-pre-line text-xl font-semibold leading-tight tabular-nums",
          tone === "income" && "text-income",
          tone === "expense" && "text-expense",
          tone === "transfer" && "text-transfer",
          tone === "warning" && "text-adjustment",
        )}
      >
        {value}
      </p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </Card>
  );
}

function AccountAssetTable({ accounts }: { accounts: Account[] }) {
  const totalByCurrency = accounts.reduce<Record<Currency, number>>(
    (total, account) => {
      if (account.includeInNetWorth) {
        total[account.currency] += account.balanceMinor;
      }
      return total;
    },
    { JPY: 0, CNY: 0 },
  );

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center justify-between gap-3">
          <span>账户资产</span>
          <span className="text-xs font-normal text-muted-foreground">
            JPY{" "}
            {formatMoney(
              { amountMinor: totalByCurrency.JPY, currency: "JPY" },
              { showCurrencyCode: false },
            )}{" "}
            · CNY{" "}
            {formatMoney(
              { amountMinor: totalByCurrency.CNY, currency: "CNY" },
              { showCurrencyCode: false },
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/70 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">账户</th>
                <th className="px-4 py-2 font-medium">类型</th>
                <th className="px-4 py-2 font-medium">币种</th>
                <th className="px-4 py-2 text-right font-medium">余额</th>
                <th className="px-4 py-2 font-medium">净资产</th>
                <th className="px-4 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((account) => (
                <tr key={account.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/accounts/${account.id}`} className="hover:underline">
                      {formatAccountName(account)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {accountTypeLabels[account.type]}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{account.currency}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill
                      enabled={account.includeInNetWorth}
                      trueLabel="计入"
                      falseLabel="排除"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/accounts/${account.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      详情
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentTransactionsTable({
  transactions,
  totalBeforeSearch,
  query,
  filters,
  lookups,
  filterLabels,
}: {
  transactions: RecentTransaction[];
  totalBeforeSearch: number;
  query: string;
  filters: Parameters<typeof TransactionFilterDialog>[0]["filters"];
  lookups: Parameters<typeof TransactionFilterDialog>[0]["lookups"];
  filterLabels: string[];
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span>最近交易</span>
          <span className="flex items-center gap-2">
            <span className="text-xs font-normal text-muted-foreground">
              {transactions.length}/{totalBeforeSearch} 条
            </span>
            <TransactionFilterDialog filters={filters} lookups={lookups} />
          </span>
        </CardTitle>
        {query || filterLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {query ? (
              <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
                搜索: {query}
              </span>
            ) : null}
            {filterLabels.map((label) => (
              <span
                key={label}
                className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground">
            <SearchXIcon className="size-8" />
            没有匹配的交易。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-muted/70 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">日期</th>
                  <th className="px-4 py-2 font-medium">类型</th>
                  <th className="px-4 py-2 text-right font-medium">金额</th>
                  <th className="px-4 py-2 font-medium">分类</th>
                  <th className="px-4 py-2 font-medium">账户流向</th>
                  <th className="px-4 py-2 font-medium">支付方式</th>
                  <th className="px-4 py-2 font-medium">备注</th>
                  <th className="px-4 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.slice(0, 60).map((transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                      {transaction.occurredOn}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-medium",
                          transaction.type === "income" && "bg-income/10 text-income",
                          transaction.type === "expense" && "bg-expense/10 text-expense",
                          transaction.type === "transfer" && "bg-transfer/10 text-transfer",
                          transaction.type === "adjustment" && "bg-adjustment/10 text-adjustment",
                        )}
                      >
                        {transactionTypeLabels[transaction.type]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">
                      {formatMoney({
                        amountMinor: transaction.amountMinor,
                        currency: transaction.currency,
                      })}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-2.5">
                      {transaction.category?.label ?? transaction.category?.name ?? "未分类"}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-2.5 text-muted-foreground">
                      {formatTransactionAccounts(transaction)}
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-2.5 text-muted-foreground">
                      {transaction.paymentMethod?.name ?? "-"}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-2.5 text-muted-foreground">
                      {transaction.note ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/transactions/${transaction.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        详情
                        <ArrowRightIcon className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkQueue({
  pendingRecurring,
  pendingRefunds,
  cardReminders,
  activeInstallments,
}: {
  pendingRecurring: Awaited<ReturnType<typeof listPendingRecurringItems>>;
  pendingRefunds: Awaited<ReturnType<typeof listRefundTrackers>>;
  cardReminders: Array<{
    card: Awaited<ReturnType<typeof listCreditCards>>[number];
    statement: Awaited<ReturnType<typeof listCardStatements>>[number] | null;
  }>;
  activeInstallments: Awaited<ReturnType<typeof listInstallmentPlans>>;
}) {
  const items = [
    ...pendingRecurring.slice(0, 4).map((item) => ({
      key: `recurring-${item.id}`,
      href: `/recurring/${item.id}`,
      icon: RepeatIcon,
      title: item.name,
      meta: `周期项目 · ${item.nextDate}`,
      amount:
        item.amountMinor === null
          ? "金额待确认"
          : formatMoney({ amountMinor: item.amountMinor, currency: item.currency }),
    })),
    ...pendingRefunds.slice(0, 4).map((item) => ({
      key: `refund-${item.id}`,
      href: `/refunds/${item.id}`,
      icon: ReceiptIcon,
      title: item.originalTransaction?.note ?? "待到账退款",
      meta: item.expectedOn ? `预计 ${item.expectedOn}` : "退款追踪",
      amount: formatMoney({
        amountMinor: item.amountMinor - item.receivedAmountMinor,
        currency: item.currency,
      }),
    })),
    ...cardReminders.slice(0, 3).map(({ card, statement }) => ({
      key: `card-${card.id}`,
      href: `/credit-cards/${card.id}`,
      icon: CreditCardIcon,
      title: formatAccountName(card.account),
      meta: statement?.dueDate ? `还款日 ${statement.dueDate}` : "信用卡账单",
      amount: statement
        ? formatMoney({
            amountMinor: statement.totalAmountMinor - statement.repaidAmountMinor,
            currency: card.account.currency,
          })
        : "-",
    })),
    ...activeInstallments.slice(0, 3).map((item) => ({
      key: `installment-${item.id}`,
      href: `/installments/${item.id}`,
      icon: LayersIcon,
      title: item.originalTransaction?.note ?? "分期计划",
      meta: `${item.completedPeriods}/${item.periods} 期`,
      amount: formatMoney({ amountMinor: item.amountPerPeriodMinor, currency: item.currency }),
    })),
  ];

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center justify-between gap-3">
          <span>待处理</span>
          <span className="text-xs font-normal text-muted-foreground">{items.length} 项显示</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-income" />
            当前没有待处理事项。
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.meta}
                    </span>
                  </span>
                  <span className="max-w-[8rem] truncate text-right text-sm font-semibold tabular-nums">
                    {item.amount}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManagementIndex({
  categoriesCount,
  paymentMethods,
  templates,
  accountsCount,
  creditCardsCount,
  recurringCount,
  refundsCount,
  installmentsCount,
}: {
  categoriesCount: number;
  paymentMethods: Awaited<ReturnType<typeof listPaymentMethods>>;
  templates: Awaited<ReturnType<typeof listAllQuickEntryTemplates>>;
  accountsCount: number;
  creditCardsCount: number;
  recurringCount: number;
  refundsCount: number;
  installmentsCount: number;
}) {
  const enabledPaymentMethods = paymentMethods.filter((method) => method.enabled);
  const enabledTemplates = templates.filter((template) => template.enabled);
  const modules = [
    { href: "/accounts", icon: WalletIcon, title: "账户", meta: `${accountsCount} 个账户` },
    {
      href: "/credit-cards",
      icon: CreditCardIcon,
      title: "信用卡",
      meta: `${creditCardsCount} 张卡`,
    },
    { href: "/recurring", icon: RepeatIcon, title: "周期项目", meta: `${recurringCount} 个待确认` },
    { href: "/refunds", icon: ReceiptIcon, title: "退款", meta: `${refundsCount} 个未完成` },
    {
      href: "/installments",
      icon: LayersIcon,
      title: "分期",
      meta: `${installmentsCount} 个执行中`,
    },
    { href: "/categories", icon: FolderTreeIcon, title: "分类", meta: `${categoriesCount} 个分类` },
    {
      href: "/templates",
      icon: ZapIcon,
      title: "快捷模板",
      meta: `${enabledTemplates.length}/${templates.length} 个启用`,
    },
    {
      href: "/manage/payment-methods",
      icon: MousePointerClickIcon,
      title: "支付方式",
      meta: `${enabledPaymentMethods.length}/${paymentMethods.length} 个启用`,
    },
  ];

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b border-border">
        <CardTitle>基础资料</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                href={module.href}
                key={module.href}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{module.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {module.meta}
                    </span>
                  </span>
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">常用支付方式</p>
          <div className="flex flex-wrap gap-2">
            {enabledPaymentMethods.slice(0, 6).map((method) => (
              <Link
                key={method.id}
                href={`/manage/payment-methods/${method.id}`}
                className="rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-background"
              >
                {method.name} · {paymentMethodTypeLabels[method.type]}
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({
  enabled,
  trueLabel,
  falseLabel,
}: {
  enabled: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
        enabled ? "bg-income/10 text-income" : "bg-muted text-muted-foreground",
      )}
    >
      {enabled ? <CheckCircle2Icon className="size-3" /> : <CircleAlertIcon className="size-3" />}
      {enabled ? trueLabel : falseLabel}
    </span>
  );
}

function formatCurrencyPair(values: Record<Currency, number>) {
  return `JPY ${formatMoney({ amountMinor: values.JPY, currency: "JPY" }, { showCurrencyCode: false })}\nCNY ${formatMoney(
    { amountMinor: values.CNY, currency: "CNY" },
    { showCurrencyCode: false },
  )}`;
}

function formatTransactionAccounts(transaction: RecentTransaction) {
  const source = transaction.sourceAccount ? formatAccountName(transaction.sourceAccount) : null;
  const target = transaction.targetAccount ? formatAccountName(transaction.targetAccount) : null;

  if (transaction.type === "transfer") {
    return source && target ? `${source} -> ${target}` : (source ?? target ?? "-");
  }
  if (transaction.type === "income") {
    return target ?? "-";
  }
  if (transaction.type === "adjustment") {
    return target ?? "-";
  }
  return source ?? "-";
}

function matchesTransaction(transaction: RecentTransaction, rawQuery: string) {
  const query = rawQuery.toLowerCase();
  const haystack = [
    transaction.occurredOn,
    transaction.currency,
    transaction.note,
    transaction.category?.label,
    transaction.category?.name,
    transaction.sourceAccount?.name,
    transaction.sourceAccount?.lastDigits,
    transaction.targetAccount?.name,
    transaction.targetAccount?.lastDigits,
    transaction.paymentMethod?.name,
    transactionTypeLabels[transaction.type],
    formatMoney({ amountMinor: transaction.amountMinor, currency: transaction.currency }),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
