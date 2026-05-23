import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { TransactionForm } from "@/app/transactions/transaction-form";
import { createTransaction } from "@/app/actions/transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinorForInput, formatMoney } from "@/domain/finance";
import { getStatementPeriod, type CycleBoundary } from "@/domain/credit-card";
import { getCreditCard, listCardStatements } from "@/features/credit-cards/data";
import { getTransactionLookups } from "@/features/lookups/data";
import { todayIsoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type RepayPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periodEnd?: string }>;
};

export default async function CreditCardRepayPage({ params, searchParams }: RepayPageProps) {
  const [{ id }, { periodEnd }] = await Promise.all([params, searchParams]);
  const card = await getCreditCard(id);

  if (!card) {
    notFound();
  }

  const lookups = await getTransactionLookups();
  const statements = await listCardStatements(card, 6);

  // 找到要还的那一期：URL 指定的 periodEnd，没有则取最近一期未还满的
  let targetStatement = periodEnd
    ? statements.find((s) => s.periodEnd === periodEnd)
    : (statements.find(
        (s) => !s.isPaid && s.totalAmountMinor > s.repaidAmountMinor && !s.isCurrent,
      ) ?? statements.find((s) => !s.isPaid && s.totalAmountMinor > s.repaidAmountMinor));

  if (!targetStatement) {
    targetStatement = statements[0];
  }

  // 备选：URL 给了但找不到 → 按 periodEnd 重新算一期
  if (!targetStatement && periodEnd) {
    const period = getStatementPeriod(periodEnd, {
      closingDay: card.closingDay,
      paymentDay: card.paymentDay,
      cycleBoundary: card.cycleBoundary as CycleBoundary,
    });
    targetStatement = {
      cardId: card.id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      dueDate: period.dueDate,
      totalAmountMinor: 0,
      transactions: [],
      installmentEntries: [],
      repaymentTransactions: [],
      repaidAmountMinor: 0,
      isCurrent: false,
      isOverdue: false,
      isPaid: false,
    };
  }

  if (!targetStatement) {
    notFound();
  }

  const remaining = Math.max(
    0,
    targetStatement.totalAmountMinor - targetStatement.repaidAmountMinor,
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href={`/credit-cards/${card.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          {card.account.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">还款</h1>
        <p className="text-sm text-muted-foreground">
          周期 {targetStatement.periodStart} ~ {targetStatement.periodEnd} · 扣款日{" "}
          {targetStatement.dueDate} · 待还{" "}
          <span className="font-semibold tabular-nums text-adjustment">
            {formatMoney({ amountMinor: remaining, currency: card.account.currency })}
          </span>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>还款交易</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            action={createTransaction}
            lookups={lookups}
            defaults={{
              occurredOn: todayIsoDate(),
              type: "transfer",
              amount:
                remaining > 0
                  ? formatMinorForInput({ amountMinor: remaining, currency: card.account.currency })
                  : undefined,
              currency: card.account.currency,
              sourceAccountId: card.repaymentAccountId ?? undefined,
              targetAccountId: card.accountId,
              note: `还款 ${targetStatement.periodEnd}`,
            }}
            submitLabel="保存还款"
          />
        </CardContent>
      </Card>
    </main>
  );
}
