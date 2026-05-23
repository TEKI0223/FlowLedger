import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, CreditCardIcon, LayersIcon, ReceiptIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import {
  getCreditCard,
  listCardStatements,
  type StatementSummary,
} from "@/features/credit-cards/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CreditCardDetailProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CreditCardDetailPage({ params }: CreditCardDetailProps) {
  const { id } = await params;
  const card = await getCreditCard(id);

  if (!card) {
    notFound();
  }

  const statements = await listCardStatements(card, 6);
  const current = statements.find((s) => s.isCurrent);
  const historical = statements.filter((s) => !s.isCurrent);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href="/credit-cards"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          信用卡
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <CreditCardIcon className="size-6 text-muted-foreground" />
          {card.account.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          账单日每月 {card.closingDay} 号（
          {card.cycleBoundary === "inclusive" ? "含当天" : "不含当天"}） · 扣款日 {card.paymentDay}{" "}
          号{card.repaymentAccount ? ` · 还款账户：${card.repaymentAccount.name}` : ""}
        </p>
      </header>

      {current ? <CurrentStatementCard card={card} statement={current} /> : null}

      {historical.length > 0 ? (
        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold">历史账单</h2>
          <div className="space-y-3">
            {historical.map((statement) => (
              <HistoricalStatementCard
                key={statement.periodEnd}
                card={card}
                statement={statement}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function CurrentStatementCard({
  card,
  statement,
}: {
  card: Awaited<ReturnType<typeof getCreditCard>>;
  statement: StatementSummary;
}) {
  if (!card) return null;
  const remaining = statement.totalAmountMinor - statement.repaidAmountMinor;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          本期账单
          <Badge variant="secondary" className="text-xs">
            {statement.periodStart} ~ {statement.periodEnd}
          </Badge>
        </CardTitle>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarIcon className="size-3" />
          预计扣款 {statement.dueDate}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">本期消费</p>
            <p className="text-2xl font-semibold tabular-nums text-expense">
              {formatMoney({
                amountMinor: statement.totalAmountMinor,
                currency: card.account.currency,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {statement.transactions.length + statement.installmentEntries.length} 笔
              {statement.installmentEntries.length > 0
                ? ` · 含 ${statement.installmentEntries.length} 笔分期`
                : ""}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">已还款</p>
            <p className="text-2xl font-semibold tabular-nums text-income">
              {formatMoney({
                amountMinor: statement.repaidAmountMinor,
                currency: card.account.currency,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {statement.repaymentTransactions.length} 笔
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">待还款</p>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                remaining > 0 ? "text-adjustment" : "text-muted-foreground",
              )}
            >
              {formatMoney({
                amountMinor: Math.max(0, remaining),
                currency: card.account.currency,
              })}
            </p>
          </div>
        </div>

        {remaining > 0 ? (
          <>
            <Separator />
            <Link
              href={`/credit-cards/${card.id}/repay?periodEnd=${statement.periodEnd}`}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-11 w-full text-base",
              )}
            >
              记一笔还款
            </Link>
          </>
        ) : null}

        {statement.transactions.length > 0 || statement.installmentEntries.length > 0 ? (
          <>
            <Separator />
            <StatementTransactionList
              statement={statement}
              currency={card.account.currency}
              label="本期消费明细"
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HistoricalStatementCard({
  card,
  statement,
}: {
  card: Awaited<ReturnType<typeof getCreditCard>>;
  statement: StatementSummary;
}) {
  if (!card) return null;
  const remaining = statement.totalAmountMinor - statement.repaidAmountMinor;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            {statement.periodStart} ~ {statement.periodEnd}
          </span>
          {statement.isPaid ? (
            <Badge variant="outline" className="text-xs text-income border-income/30">
              已还款
            </Badge>
          ) : statement.isOverdue ? (
            <Badge variant="outline" className="text-xs text-expense border-expense/30">
              逾期未还
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              待还款
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">扣款日 {statement.dueDate}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">消费</p>
            <p className="font-semibold tabular-nums text-expense">
              {formatMoney({
                amountMinor: statement.totalAmountMinor,
                currency: card.account.currency,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">已还</p>
            <p className="font-semibold tabular-nums text-income">
              {formatMoney({
                amountMinor: statement.repaidAmountMinor,
                currency: card.account.currency,
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">差额</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                remaining > 0 ? "text-adjustment" : "text-muted-foreground",
              )}
            >
              {formatMoney({
                amountMinor: Math.max(0, remaining),
                currency: card.account.currency,
              })}
            </p>
          </div>
        </div>

        {remaining > 0 ? (
          <Link
            href={`/credit-cards/${card.id}/repay?periodEnd=${statement.periodEnd}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 text-xs")}
          >
            记一笔还款
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatementTransactionList({
  statement,
  currency,
  label,
}: {
  statement: StatementSummary;
  currency: "JPY" | "CNY";
  label: string;
}) {
  // 合并普通交易和分期扣款，按日期排序
  type Row =
    | { kind: "tx"; key: string; date: string; node: React.ReactNode }
    | { kind: "installment"; key: string; date: string; node: React.ReactNode };

  const rows: Row[] = [];

  for (const tx of statement.transactions) {
    rows.push({
      kind: "tx",
      key: `tx-${tx.id}`,
      date: tx.occurredOn,
      node: (
        <li
          key={`tx-${tx.id}`}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {tx.occurredOn} · {transactionTypeLabels[tx.type]}
              {tx.note ? ` · ${tx.note}` : ""}
            </p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums text-expense">
            {formatMoney({ amountMinor: tx.amountMinor, currency })}
          </span>
        </li>
      ),
    });
  }

  for (const entry of statement.installmentEntries) {
    rows.push({
      kind: "installment",
      key: `inst-${entry.planId}-${entry.periodIndex}`,
      date: entry.dueDate,
      node: (
        <li
          key={`inst-${entry.planId}-${entry.periodIndex}`}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <LayersIcon className="size-3 shrink-0" />
              {entry.dueDate} · 分期 {entry.periodIndex}/{entry.totalPeriods}
              {entry.note ? ` · ${entry.note}` : ""}
            </p>
          </div>
          <Link
            href={`/installments/${entry.planId}`}
            className="shrink-0 font-semibold tabular-nums text-expense hover:underline"
          >
            {formatMoney({ amountMinor: entry.amountMinor, currency })}
          </Link>
        </li>
      ),
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ReceiptIcon className="size-3.5" />
        {label}
      </div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {rows.map((row) => row.node)}
      </ul>
    </div>
  );
}
