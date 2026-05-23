import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { listTransactions } from "@/features/transactions/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const transactionToneClass: Record<string, string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-transfer",
  adjustment: "text-adjustment",
};

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
              <Link
                key={transaction.id}
                href={`/transactions/${transaction.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-semibold">
                    {transaction.category?.name ??
                      transaction.note ??
                      transactionTypeLabels[transaction.type]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transactionTypeLabels[transaction.type]} · {transaction.occurredOn}
                    {transaction.sourceAccount ? ` · ${transaction.sourceAccount.name}` : ""}
                    {transaction.targetAccount ? ` → ${transaction.targetAccount.name}` : ""}
                    {transaction.paymentMethod ? ` · ${transaction.paymentMethod.name}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      transactionToneClass[transaction.type],
                    )}
                  >
                    {transaction.type === "transfer" ? "转账 " : ""}
                    {formatMoney({
                      amountMinor: transaction.amountMinor,
                      currency: transaction.currency,
                    })}
                  </span>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
