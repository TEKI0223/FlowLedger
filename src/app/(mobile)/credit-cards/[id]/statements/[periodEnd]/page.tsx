import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, CreditCardIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";
import { getCardStatement, getCreditCard } from "@/features/credit-cards/data";
import { StatementTransactionList } from "@/features/credit-cards/statement-transaction-list";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string; periodEnd: string }>;
};

export default async function StatementDetailPage({ params }: Props) {
  const { id, periodEnd } = await params;
  const card = await getCreditCard(id);
  if (!card) notFound();

  const statement = await getCardStatement(card, periodEnd);
  if (!statement) notFound();

  const remaining = statement.totalAmountMinor - statement.repaidAmountMinor;
  const currency = card.account.currency;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-3 pb-5">
        <Link
          href={`/credit-cards/${card.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          <CreditCardIcon className="size-3.5" />
          {formatAccountName(card.account)}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {statement.periodStart} ~ {statement.periodEnd}
          </h1>
          {statement.isCurrent ? (
            <Badge variant="secondary" className="text-xs">
              当期
            </Badge>
          ) : statement.isPaid ? (
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
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarIcon className="size-3" />
          扣款日 {statement.dueDate}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">账单总览</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">本期消费</p>
              <p className="text-2xl font-semibold tabular-nums text-expense">
                {formatMoney({ amountMinor: statement.totalAmountMinor, currency })}
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
                {formatMoney({ amountMinor: statement.repaidAmountMinor, currency })}
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
                {formatMoney({ amountMinor: Math.max(0, remaining), currency })}
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
        </CardContent>
      </Card>

      {statement.transactions.length > 0 || statement.installmentEntries.length > 0 ? (
        <section className="mt-5 space-y-3">
          <StatementTransactionList
            statement={statement}
            currency={currency}
            label="消费明细"
          />
        </section>
      ) : (
        <section className="mt-5">
          <Card size="sm" className="px-4 py-8 text-center text-sm text-muted-foreground">
            本期暂无消费。
          </Card>
        </section>
      )}

      {statement.repaymentTransactions.length > 0 ? (
        <section className="mt-5 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">本期还款</h2>
          <ul className="divide-y divide-border rounded-md border border-border">
            {statement.repaymentTransactions.map((tx) => (
              <li key={tx.id}>
                <Link
                  href={`/transactions/${tx.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      还款
                      {tx.note ? (
                        <span className="font-normal text-muted-foreground"> · {tx.note}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">{tx.occurredOn}</p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-income">
                    {formatMoney({ amountMinor: tx.amountMinor, currency })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
