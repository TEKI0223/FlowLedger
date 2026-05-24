import { Card } from "@/components/ui/card";
import { TransactionCard } from "@/features/transactions/transaction-card";
import { listTransactions } from "@/features/transactions/data";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await listTransactions(40);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">交易历史</h2>
          <span className="text-xs text-muted-foreground">{transactions.length} 条</span>
        </div>
        {transactions.length === 0 ? (
          <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
            还没有交易。先从记一笔创建第一条记录。
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <TransactionCard transaction={transaction} key={transaction.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
