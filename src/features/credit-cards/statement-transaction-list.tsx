import Link from "next/link";
import { ChevronRightIcon, LayersIcon, ReceiptIcon } from "lucide-react";
import { MoneyText } from "@/components/privacy/money-text";
import { CategoryIcon } from "@/features/categories/category-icon-label";
import type { StatementSummary } from "./data";

type Props = {
  statement: StatementSummary;
  currency: "JPY" | "CNY";
  /** 表头 label，例如「本期消费明细」「该期消费明细」。传 null 不渲染表头。 */
  label?: string | null;
};

export function StatementTransactionList({ statement, currency, label = "消费明细" }: Props) {
  type Row = {
    key: string;
    date: string;
    node: React.ReactNode;
  };

  const rows: Row[] = [];

  for (const tx of statement.transactions) {
    rows.push({
      key: `tx-${tx.id}`,
      date: tx.occurredOn,
      node: (
        <li key={`tx-${tx.id}`}>
          <Link
            href={`/transactions/${tx.id}`}
            className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
          >
            <CategoryIcon
              iconKey={tx.categoryIconKey ?? "other"}
              className="size-8 rounded-md"
              iconClassName="size-4"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {tx.categoryName ?? "未分类"}
                {tx.note ? (
                  <span className="font-normal text-muted-foreground"> · {tx.note}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{tx.occurredOn}</p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-expense">
              <MoneyText amountMinor={tx.amountMinor} currency={currency} />
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
          </Link>
        </li>
      ),
    });
  }

  for (const entry of statement.installmentEntries) {
    rows.push({
      key: `inst-${entry.planId}-${entry.periodIndex}`,
      date: entry.dueDate,
      node: (
        <li key={`inst-${entry.planId}-${entry.periodIndex}`}>
          <Link
            href={`/installments/${entry.planId}`}
            className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <LayersIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                分期 {entry.periodIndex}/{entry.totalPeriods}
                {entry.note ? (
                  <span className="font-normal text-muted-foreground"> · {entry.note}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{entry.dueDate}</p>
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-expense">
              <MoneyText amountMinor={entry.amountMinor} currency={currency} />
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
          </Link>
        </li>
      ),
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ReceiptIcon className="size-3.5" />
          {label}
        </div>
      ) : null}
      <ul className="divide-y divide-border rounded-md border border-border">
        {rows.map((row) => row.node)}
      </ul>
    </div>
  );
}
