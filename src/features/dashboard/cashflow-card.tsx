import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/domain/finance";
import type { listTransactions } from "@/features/transactions/data";
import { toJpySingle } from "./utils";
import { cn } from "@/lib/utils";

type HydratedTransaction = Awaited<ReturnType<typeof listTransactions>>[number];

type DailyCashflowPoint = {
  date: string;
  day: number;
  incomeJpy: number;
  expenseJpy: number;
};

type TopCategory = {
  id: string;
  label: string;
  jpy: number;
  share: number;
};

export function CashflowCard({
  monthTransactions,
  rate,
  className,
}: {
  monthTransactions: HydratedTransaction[];
  rate: number | null;
  className?: string;
}) {
  const daily = buildDailyCashflow(monthTransactions, rate);
  const topCategories = buildTopCategories(monthTransactions, rate);
  const rateHint =
    rate === null ? "CNY 未折算（缺少汇率）" : `CNY 已按 1 CNY = ${rate.toFixed(2)} JPY 折算`;

  const maxBar = Math.max(1, ...daily.map((d) => Math.max(d.incomeJpy, d.expenseJpy)));
  const totalIncome = daily.reduce((sum, d) => sum + d.incomeJpy, 0);
  const totalExpense = daily.reduce((sum, d) => sum + d.expenseJpy, 0);
  const todayKey = dayjs().format("YYYY-MM-DD");

  return (
    <Card className={cn("rounded-lg", className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <span>本月现金流</span>
          <span className="flex items-center gap-3 text-xs font-normal text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-sm bg-income" />
              收入 {formatMoney({ amountMinor: totalIncome, currency: "JPY" })}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-sm bg-expense" />
              支出 {formatMoney({ amountMinor: totalExpense, currency: "JPY" })}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-4">
        <div>
          <div className="flex h-32 items-end gap-[2px]" aria-label="按日现金流">
            {daily.map((d) => {
              const incH = (d.incomeJpy / maxBar) * 100;
              const expH = (d.expenseJpy / maxBar) * 100;
              const isToday = d.date === todayKey;
              const isFuture = d.date > todayKey;
              return (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-stretch justify-end gap-[2px]"
                  title={`${d.date} · 收 ${formatMoney({ amountMinor: d.incomeJpy, currency: "JPY" })} · 支 ${formatMoney({ amountMinor: d.expenseJpy, currency: "JPY" })}`}
                >
                  <div
                    className={cn("min-h-[1px] rounded-sm bg-income/80", isFuture && "opacity-20")}
                    style={{ height: `${incH}%` }}
                  />
                  <div
                    className={cn("min-h-[1px] rounded-sm bg-expense/80", isFuture && "opacity-20")}
                    style={{ height: `${expH}%` }}
                  />
                  <div
                    className={cn(
                      "mt-0.5 text-center text-[10px] leading-3 text-muted-foreground tabular-nums",
                      isToday && "font-semibold text-foreground",
                    )}
                  >
                    {d.day}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{rateHint}</p>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">支出 Top 分类</p>
          {topCategories.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">本月暂无支出。</p>
          ) : (
            <ul className="space-y-2">
              {topCategories.map((cat) => (
                <li key={cat.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{cat.label}</span>
                    <span className="flex shrink-0 items-baseline gap-2 text-muted-foreground tabular-nums">
                      <span className="font-medium text-foreground">
                        {formatMoney({ amountMinor: cat.jpy, currency: "JPY" })}
                      </span>
                      <span className="text-xs">{Math.round(cat.share * 100)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-expense/70"
                      style={{ width: `${Math.max(2, cat.share * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function buildDailyCashflow(
  txs: HydratedTransaction[],
  rate: number | null,
): DailyCashflowPoint[] {
  const today = dayjs();
  const start = today.startOf("month");
  const end = today.endOf("month");
  const map = new Map<string, { incomeJpy: number; expenseJpy: number }>();
  for (let d = start; d.isBefore(end) || d.isSame(end, "day"); d = d.add(1, "day")) {
    map.set(d.format("YYYY-MM-DD"), { incomeJpy: 0, expenseJpy: 0 });
  }
  for (const tx of txs) {
    const bucket = map.get(tx.occurredOn);
    if (!bucket) continue;
    const jpy = toJpySingle(tx.amountMinor, tx.currency, rate);
    if (tx.type === "income") {
      bucket.incomeJpy += jpy;
    } else if (tx.type === "expense") {
      bucket.expenseJpy += jpy;
    }
  }
  return Array.from(map.entries()).map(([date, val]) => ({
    date,
    day: Number(date.slice(-2)),
    incomeJpy: val.incomeJpy,
    expenseJpy: val.expenseJpy,
  }));
}

function buildTopCategories(txs: HydratedTransaction[], rate: number | null): TopCategory[] {
  const totals = new Map<string, { label: string; jpy: number }>();
  let grandTotal = 0;
  for (const tx of txs) {
    if (tx.type !== "expense") continue;
    const jpy = toJpySingle(tx.amountMinor, tx.currency, rate);
    grandTotal += jpy;
    const id = tx.category?.id ?? "__unknown__";
    const label = tx.category?.label ?? tx.category?.name ?? "未分类";
    const prev = totals.get(id) ?? { label, jpy: 0 };
    prev.jpy += jpy;
    prev.label = label;
    totals.set(id, prev);
  }
  if (grandTotal === 0) return [];
  return Array.from(totals.entries())
    .map(([id, { label, jpy }]) => ({ id, label, jpy, share: jpy / grandTotal }))
    .sort((a, b) => b.jpy - a.jpy)
    .slice(0, 6);
}
