import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import type { listTransactions } from "@/features/transactions/data";
import { cn } from "@/lib/utils";

type TransactionListItem = Awaited<ReturnType<typeof listTransactions>>[number];

const transactionToneClass: Record<string, string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-transfer",
  adjustment: "text-adjustment",
};

type TransactionCardProps = {
  transaction: TransactionListItem;
};

export function TransactionCard({ transaction }: TransactionCardProps) {
  const dateParts = formatDateParts(transaction.occurredOn);
  const categoryLabel =
    transaction.category?.label ?? transaction.category?.name ?? transactionTypeLabels[transaction.type];
  const accountLine = formatAccountLine(transaction);

  return (
    <Link
      href={`/transactions/${transaction.id}`}
      className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-card-foreground transition-colors hover:bg-muted/40 sm:grid-cols-[4rem_1fr_auto] sm:px-4"
    >
      <div className="flex h-14 flex-col items-center justify-center rounded-md bg-muted/50 text-center">
        <span className="text-xs font-medium text-muted-foreground">{dateParts.month}</span>
        <span className="text-xl font-semibold tabular-nums leading-none">{dateParts.day}</span>
      </div>

      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-semibold">{categoryLabel}</p>
        <p className="truncate text-xs text-muted-foreground">{accountLine}</p>
        {transaction.note ? (
          <p className="truncate text-xs text-muted-foreground/90">{transaction.note}</p>
        ) : null}
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <span
          className={cn(
            "max-w-[7.5rem] truncate text-right text-sm font-semibold tabular-nums sm:max-w-none",
            transactionToneClass[transaction.type],
          )}
        >
          {formatMoney({
            amountMinor: transaction.amountMinor,
            currency: transaction.currency,
          })}
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

function formatDateParts(isoDate: string) {
  const [, month = "--", day = "--"] = isoDate.split("-");
  return {
    month: `${Number(month)}月`,
    day: String(Number(day)).padStart(2, "0"),
  };
}

function formatAccountLine(transaction: TransactionListItem) {
  const source = transaction.sourceAccount?.name;
  const target = transaction.targetAccount?.name;
  const paymentMethod = transaction.paymentMethod?.name;

  if (transaction.type === "transfer") {
    return source && target ? `${source} -> ${target}` : source ?? target ?? "未选择账户";
  }

  if (transaction.type === "income") {
    return [paymentMethod ?? "入账", target].filter(Boolean).join(" - ") || "未选择入账账户";
  }

  if (transaction.type === "adjustment") {
    return target ? `校准 - ${target}` : "未选择校准账户";
  }

  return [paymentMethod ?? "付款", source].filter(Boolean).join(" - ") || "未选择付款账户";
}
