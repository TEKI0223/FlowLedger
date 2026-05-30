import Link from "next/link";
import dayjs from "dayjs";
import { ZapIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { listAccounts } from "@/features/accounts/data";
import { listCreditCards, listCardStatements } from "@/features/credit-cards/data";
import { getDashboardSummary, getPriorMonthTotals } from "@/features/dashboard/data";
import { AccountsByCurrency } from "@/features/dashboard/accounts-by-currency";
import { CashflowCard } from "@/features/dashboard/cashflow-card";
import { KPIStrip } from "@/features/dashboard/kpi-strip";
import { WorkQueueCard } from "@/features/dashboard/work-queue-card";
import { listInstallmentPlans } from "@/features/installments/data";
import { listPendingRecurringItems } from "@/features/recurring/data";
import { listRefundTrackers } from "@/features/refunds/data";
import { listTransactions } from "@/features/transactions/data";

export const dynamic = "force-dynamic";

export default async function PCPage() {
  const [
    summary,
    priorMonth,
    accounts,
    monthTransactions,
    pendingRecurring,
    refunds,
    installments,
    creditCards,
  ] = await Promise.all([
    getDashboardSummary(),
    getPriorMonthTotals(),
    listAccounts(),
    listTransactions(500, { date: "month" }),
    listPendingRecurringItems(),
    listRefundTrackers(),
    listInstallmentPlans(),
    listCreditCards(),
  ]);

  const statementsByCard = await Promise.all(
    creditCards.map(async (card) => ({
      card,
      statement: (await listCardStatements(card, 1))[0] ?? null,
    })),
  );

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

  const today = dayjs();
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][today.day()];

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 md:px-6 lg:px-8">
      <header className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">PC 管理工作台</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">总览</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {today.format("YYYY 年 M 月 D 日")} · 周{weekday}
          </p>
        </div>
        <Link href="/entry" className={buttonVariants({ size: "sm" })}>
          <ZapIcon className="size-3.5" />
          记一笔
        </Link>
      </header>

      <KPIStrip summary={summary} priorMonth={priorMonth} />

      <section className="grid min-w-0 gap-5 xl:grid-cols-12">
        <CashflowCard
          monthTransactions={monthTransactions}
          rate={summary.netWorth.rateCnyToJpy}
          className="min-w-0 xl:col-span-8"
        />
        <WorkQueueCard
          pendingRecurring={pendingRecurring.length}
          pendingRefunds={pendingRefunds.length}
          cardReminders={cardReminders.length}
          activeInstallments={activeInstallments.length}
          className="min-w-0 xl:col-span-4"
        />
      </section>

      <AccountsByCurrency accounts={accounts} />
    </main>
  );
}
