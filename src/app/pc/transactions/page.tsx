import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTransactionLookups } from "@/features/lookups/data";
import { listTransactions } from "@/features/transactions/data";
import { parseTransactionFilters } from "@/features/transactions/filters";
import {
  getTransactionFilterLabels,
  TransactionFilterDialog,
} from "@/features/transactions/transaction-filter-dialog";
import {
  matchesTransactionQuery,
  TransactionsTable,
} from "@/features/transactions/transactions-table";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 200;

type PCTransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PCTransactionsPage({ searchParams }: PCTransactionsPageProps) {
  const rawSearchParams = await searchParams;
  const query = getSingleParam(rawSearchParams.q).trim();
  const filters = parseTransactionFilters(rawSearchParams);

  const [rawTransactions, lookups] = await Promise.all([
    listTransactions(PAGE_LIMIT, filters),
    getTransactionLookups(),
  ]);

  const transactions = query
    ? rawTransactions.filter((tx) => matchesTransactionQuery(tx, query))
    : rawTransactions;
  const filterLabels = getTransactionFilterLabels(filters, lookups);

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 md:px-6 lg:px-8">
      <header>
        <p className="text-xs font-medium text-muted-foreground">PC 管理工作台</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">交易历史</h1>
      </header>

      <Card className="rounded-lg">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="flex items-baseline gap-3">
              <span>全部交易</span>
              <span className="text-xs font-normal text-muted-foreground">
                {transactions.length}
                {query || filterLabels.length > 0 ? ` / ${rawTransactions.length}` : ""} 条
                {rawTransactions.length === PAGE_LIMIT ? `（仅前 ${PAGE_LIMIT} 条）` : ""}
              </span>
            </span>
            <TransactionFilterDialog filters={filters} lookups={lookups} />
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
          <TransactionsTable transactions={transactions} />
        </CardContent>
      </Card>
    </main>
  );
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
