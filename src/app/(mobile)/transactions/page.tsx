import { Card } from "@/components/ui/card";
import { TransactionCard } from "@/features/transactions/transaction-card";
import {
  getTransactionFilterLabels,
  TransactionFilterDialog,
} from "@/features/transactions/transaction-filter-dialog";
import { listTransactions } from "@/features/transactions/data";
import { parseTransactionFilters } from "@/features/transactions/filters";
import { getTransactionLookups } from "@/features/lookups/data";

export const dynamic = "force-dynamic";

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const filters = parseTransactionFilters(await searchParams);
  const [transactions, lookups] = await Promise.all([
    listTransactions(80, filters),
    getTransactionLookups(),
  ]);
  const filterLabels = getTransactionFilterLabels(filters, lookups);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">交易历史</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{transactions.length} 条</span>
            <TransactionFilterDialog filters={filters} lookups={lookups} />
          </div>
        </div>
        {filterLabels.length > 0 ? (
          <div className="mb-3 flex min-w-0 flex-wrap gap-2">
            {filterLabels.map((label) => (
              <span
                key={label}
                className="max-w-full truncate rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {transactions.length === 0 ? (
          <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
            没有匹配的交易。
          </Card>
        ) : (
          <div className="min-w-0 space-y-3">
            {transactions.map((transaction) => (
              <TransactionCard transaction={transaction} key={transaction.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
