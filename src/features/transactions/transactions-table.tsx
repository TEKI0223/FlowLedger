import Link from "next/link";
import { ArrowRightIcon, SearchXIcon } from "lucide-react";
import { MoneyText } from "@/components/privacy/money-text";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";
import { cn } from "@/lib/utils";
import type { listTransactions } from "./data";

export type HydratedTransaction = Awaited<ReturnType<typeof listTransactions>>[number];

export function TransactionsTable({
  transactions,
  emptyHint = "没有匹配的交易。",
}: {
  transactions: HydratedTransaction[];
  emptyHint?: string;
}) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground">
        <SearchXIcon className="size-8" />
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-muted/70 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">日期</th>
            <th className="px-4 py-2 font-medium">类型</th>
            <th className="px-4 py-2 text-right font-medium">金额</th>
            <th className="px-4 py-2 font-medium">分类</th>
            <th className="px-4 py-2 font-medium">账户流向</th>
            <th className="px-4 py-2 font-medium">支付方式</th>
            <th className="px-4 py-2 font-medium">备注</th>
            <th className="px-4 py-2 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="transition-colors hover:bg-muted/40">
              <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                {transaction.occurredOn}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium",
                    transaction.type === "income" && "bg-income/10 text-income",
                    transaction.type === "expense" && "bg-expense/10 text-expense",
                    transaction.type === "transfer" && "bg-transfer/10 text-transfer",
                    transaction.type === "adjustment" && "bg-adjustment/10 text-adjustment",
                  )}
                >
                  {transactionTypeLabels[transaction.type]}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">
                <MoneyText amountMinor={transaction.amountMinor} currency={transaction.currency} />
              </td>
              <td className="max-w-[12rem] truncate px-4 py-2.5">
                {transaction.category?.label ?? transaction.category?.name ?? "未分类"}
              </td>
              <td className="max-w-[16rem] truncate px-4 py-2.5 text-muted-foreground">
                {formatTransactionAccounts(transaction)}
              </td>
              <td className="max-w-[10rem] truncate px-4 py-2.5 text-muted-foreground">
                {transaction.paymentMethod?.name ?? "-"}
              </td>
              <td className="max-w-[16rem] truncate px-4 py-2.5 text-muted-foreground">
                {transaction.note ?? "-"}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Link
                  href={`/transactions/${transaction.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  详情
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function matchesTransactionQuery(transaction: HydratedTransaction, rawQuery: string) {
  const query = rawQuery.toLowerCase();
  const haystack = [
    transaction.occurredOn,
    transaction.currency,
    transaction.note,
    transaction.category?.label,
    transaction.category?.name,
    transaction.sourceAccount?.name,
    transaction.sourceAccount?.lastDigits,
    transaction.targetAccount?.name,
    transaction.targetAccount?.lastDigits,
    transaction.paymentMethod?.name,
    transactionTypeLabels[transaction.type],
    formatMoney({ amountMinor: transaction.amountMinor, currency: transaction.currency }),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function formatTransactionAccounts(transaction: HydratedTransaction) {
  const source = transaction.sourceAccount ? formatAccountName(transaction.sourceAccount) : null;
  const target = transaction.targetAccount ? formatAccountName(transaction.targetAccount) : null;

  if (transaction.type === "transfer") {
    return source && target ? `${source} -> ${target}` : (source ?? target ?? "-");
  }
  if (transaction.type === "income") {
    return target ?? "-";
  }
  if (transaction.type === "adjustment") {
    return target ?? "-";
  }
  return source ?? "-";
}
