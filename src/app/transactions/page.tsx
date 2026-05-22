import Link from "next/link";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { TransactionForm } from "./transaction-form";
import { createTransaction } from "@/app/actions/transactions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { getTransactionLookups } from "@/features/lookups/data";
import { listTransactions } from "@/features/transactions/data";
import { todayIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const transactionToneClass: Record<string, string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-transfer",
  adjustment: "text-adjustment",
};

export default async function TransactionsPage() {
  const [lookups, transactions] = await Promise.all([
    getTransactionLookups(),
    listTransactions(40),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" />
            首页
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">交易</h1>
          <p className="text-sm text-muted-foreground">收入、支出、转账和余额调整</p>
        </div>
        <Link
          href="/accounts"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
        >
          账户
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_400px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">最近交易</h2>
            <span className="text-xs text-muted-foreground">{transactions.length} 条</span>
          </div>
          {transactions.length === 0 ? (
            <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
              还没有交易。先从右侧创建一笔收入、支出、转账或调整。
            </Card>
          ) : (
            <Card size="sm" className="divide-y divide-border py-0">
              {transactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-medium">
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
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        transactionToneClass[transaction.type],
                      )}
                    >
                      {transaction.type === "transfer" ? "转账 " : ""}
                      {formatMoney({
                        amountMinor: transaction.amountMinor,
                        currency: transaction.currency,
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/transactions/${transaction.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "h-8 gap-1 text-xs",
                        )}
                      >
                        <PencilIcon className="size-3.5" />
                        编辑
                      </Link>
                      <DeleteTransactionButton id={transaction.id} />
                    </div>
                  </div>
                </article>
              ))}
            </Card>
          )}
        </section>

        <aside aria-label="新建交易">
          <Card>
            <CardHeader>
              <CardTitle>记一笔</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionForm
                action={createTransaction}
                lookups={lookups}
                defaults={{
                  occurredOn: todayIsoDate(),
                  type: "expense",
                  currency: "JPY",
                }}
                submitLabel="保存交易"
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
