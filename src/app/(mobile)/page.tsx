import { InlineAlert } from "@/components/ui/inline-alert";
import { listAccounts } from "@/features/accounts/data";
import { countPendingCardRepayments } from "@/features/credit-cards/data";
import { DashboardAssets } from "@/features/dashboard/dashboard-assets";
import { DashboardHero } from "@/features/dashboard/dashboard-hero";
import { DashboardTodos } from "@/features/dashboard/dashboard-todos";
import { getDashboardSummary } from "@/features/dashboard/data";
import { countPendingRecurringItems } from "@/features/recurring/data";
import { countPendingRefunds } from "@/features/refunds/data";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [
    { saved },
    summary,
    accounts,
    pendingRecurringCount,
    pendingRefundCount,
    pendingCardRepaymentCount,
  ] = await Promise.all([
    searchParams,
    getDashboardSummary(),
    listAccounts(),
    countPendingRecurringItems(),
    countPendingRefunds(),
    countPendingCardRepayments(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      {saved ? <InlineAlert>已保存，首页数据已更新。</InlineAlert> : null}

      <DashboardTodos
        pendingRecurringCount={pendingRecurringCount}
        pendingRefundCount={pendingRefundCount}
        pendingCardRepaymentCount={pendingCardRepaymentCount}
      />
      <DashboardHero summary={summary} />
      <DashboardAssets summary={summary} accounts={accounts} />
    </main>
  );
}
