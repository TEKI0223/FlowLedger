import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarIcon, CreditCardIcon, PencilIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";
import {
  getCreditCard,
  listCardStatements,
  type StatementSummary,
} from "@/features/credit-cards/data";
import { DeleteCreditCardButton } from "@/features/credit-cards/delete-credit-card-button";
import { StatementTransactionList } from "@/features/credit-cards/statement-transaction-list";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CreditCardDetailProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ error?: string; history?: string }>;
};

const HISTORY_EXPANDED_COUNT = 12;

export default async function CreditCardDetailPage({
  params,
  searchParams,
}: CreditCardDetailProps) {
  const [{ id }, { error, history }] = await Promise.all([params, searchParams]);
  const card = await getCreditCard(id);

  if (!card) {
    notFound();
  }

  // 默认只显示「当期 + 上一期」。?history=1 时展开到 12 期（足够大多数对账场景）。
  // 仍会过滤掉金额为 0 的幻影期。
  const expanded = history === "1";
  const count = expanded ? HISTORY_EXPANDED_COUNT : 2;
  const statements = await listCardStatements(card, count);
  const current = statements.find((s) => s.isCurrent);
  const historical = statements.filter((s) => !s.isCurrent);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-3 pb-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <CreditCardIcon className="size-6 text-muted-foreground" />
            {formatAccountName(card.account)}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/credit-cards/${card.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
            >
              <PencilIcon className="size-3.5" />
              编辑
            </Link>
            <DeleteCreditCardButton id={card.id} name={formatAccountName(card.account)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border border-border px-2 py-1">
            账单日每月 {card.closingDay} 号
            {card.cycleBoundary === "inclusive" ? "（含当天）" : "（不含当天）"}
          </span>
          <span className="rounded-md border border-border px-2 py-1">
            扣款日每月 {card.paymentDay} 号
          </span>
          <span className="rounded-md border border-border px-2 py-1">
            还款账户：
            {card.repaymentAccount ? formatAccountName(card.repaymentAccount) : "未设置"}
          </span>
          {!card.enabled ? (
            <Badge variant="outline" className="text-xs">
              停用
            </Badge>
          ) : null}
        </div>
      </header>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

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

      <div className="mt-6 flex justify-center">
        {expanded ? (
          <Link
            href={`/credit-cards/${card.id}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs")}
          >
            收起历史账单
          </Link>
        ) : (
          <Link
            href={`/credit-cards/${card.id}?history=1`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs")}
          >
            查看更早账单
          </Link>
        )}
      </div>
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

        <div className="flex items-center gap-2">
          {remaining > 0 ? (
            <Link
              href={`/credit-cards/${card.id}/repay?periodEnd=${statement.periodEnd}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 text-xs")}
            >
              记一笔还款
            </Link>
          ) : null}
          <Link
            href={`/credit-cards/${card.id}/statements/${statement.periodEnd}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9 text-xs")}
          >
            查看明细 →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

