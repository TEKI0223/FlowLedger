import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangleIcon, CreditCardIcon } from "lucide-react";
import { MoneyText } from "@/components/privacy/money-text";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Currency } from "@/domain/finance";
import { CategoryIconLabel } from "@/features/categories/category-icon-label";
import { cn } from "@/lib/utils";
import { CurrencySwitch } from "./controls";
import type { StatsRange, StatsSummary } from "./data";

export function MonthlyComparison({
  comparison,
  currency,
  range,
  categoryMonth,
}: {
  comparison: StatsSummary["comparison"];
  currency: Currency;
  range: StatsRange;
  categoryMonth: string;
}) {
  const current = comparison.thisMonth[currency];
  const last = comparison.lastMonth[currency];
  const average = comparison.threeMonthAverage[currency];
  const rows = [
    {
      key: "expense",
      label: "支出",
      tone: "text-expense",
      current: current.expenseMinor,
      last: last.expenseMinor,
      average: average.expenseMinor,
    },
    {
      key: "income",
      label: "收入",
      tone: "text-income",
      current: current.incomeMinor,
      last: last.incomeMinor,
      average: average.incomeMinor,
    },
    {
      key: "balance",
      label: "结余",
      tone: current.balanceMinor >= 0 ? "text-income" : "text-expense",
      current: current.balanceMinor,
      last: last.balanceMinor,
      average: average.balanceMinor,
    },
  ];

  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>月度对比</CardTitle>
              <CardDescription>本月 vs 上月 vs 三月均，按原币种统计。</CardDescription>
            </div>
            <CurrencySwitch
              currency={currency}
              view="comparison"
              range={range}
              categoryMonth={categoryMonth}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {rows.map((row) => (
            <div key={row.key} className="grid gap-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{row.label}</span>
                <span className={cn("text-xs font-medium", row.tone)}>
                  较上月 {formatPercentDiff(row.current, row.last)}
                </span>
              </div>
              <p className={cn("text-2xl font-semibold tabular-nums", row.tone)}>
                <MoneyText amountMinor={row.current} currency={currency} />
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <MetricMini label="上月" value={<MoneyText amountMinor={row.last} currency={currency} />} />
                <MetricMini
                  label="三月均"
                  value={<MoneyText amountMinor={row.average} currency={currency} />}
                  note={formatPercentDiff(row.current, row.average)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

export function CategoryRanking({ summary, range }: { summary: StatsSummary; range: StatsRange }) {
  const ranking = summary.categoryRanking;
  const months = summary.availableMonths.includes(summary.categoryMonth)
    ? summary.availableMonths
    : [summary.categoryMonth, ...summary.availableMonths];

  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>分类排行</CardTitle>
              <CardDescription>{ranking.label}支出排行，分别统计 JPY / CNY。</CardDescription>
            </div>
            <div className="grid shrink-0 justify-items-end text-xs tabular-nums">
              <span>
                <MoneyText amountMinor={ranking.totalByCurrency.JPY} currency="JPY" />
              </span>
              <span>
                <MoneyText amountMinor={ranking.totalByCurrency.CNY} currency="CNY" />
              </span>
              <span className="text-muted-foreground">
                折算{" "}
                {ranking.totalJpyEquivalentMinor === null ? (
                  "缺少汇率"
                ) : (
                  <MoneyText amountMinor={ranking.totalJpyEquivalentMinor} currency="JPY" />
                )}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {months.map((month) => (
              <Link
                key={month}
                href={`/stats?view=ranking&range=month&categoryMonth=${month}`}
                className={cn(
                  "shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium",
                  range === "month" && month === summary.categoryMonth
                    ? "border-foreground/30 bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {month}
              </Link>
            ))}
          </div>

          {ranking.items.length === 0 ? (
            <p className="rounded-lg bg-muted/50 px-3 py-6 text-center text-sm text-muted-foreground">
              这个范围还没有支出记录。
            </p>
          ) : (
            <div className="grid gap-3">
              {ranking.items.map((item) => (
                <div key={item.id} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <CategoryIconLabel
                      iconKey={item.iconKey}
                      name={item.label}
                      className="min-w-0"
                      labelClassName="font-medium"
                    />
                    <span className="shrink-0 text-right text-xs font-semibold tabular-nums">
                      <span className="block">
                        <MoneyText amountMinor={item.amountByCurrency.JPY} currency="JPY" />
                      </span>
                      <span className="block">
                        <MoneyText amountMinor={item.amountByCurrency.CNY} currency="CNY" />
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-expense"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                      {item.count} 笔
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function MonthlyTrend({ summary, currency }: { summary: StatsSummary; currency: Currency }) {
  return (
    <section>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>月度趋势</CardTitle>
              <CardDescription>近 12 个月支出趋势，点击柱子可展开金额。</CardDescription>
            </div>
            <CurrencySwitch
              currency={currency}
              view="trend"
              range={summary.selectedRange}
              categoryMonth={summary.categoryMonth}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 items-end gap-2">
            {summary.monthlyTrend.items.map((item) => (
              <details key={item.month} className="group grid gap-2 text-center">
                <summary className="grid cursor-pointer list-none gap-2 marker:hidden">
                  <span
                    title={item.month}
                    className="flex h-40 items-end rounded-md bg-muted"
                  >
                    <span
                      className="block w-full rounded-md bg-expense/80 transition-colors group-open:bg-expense"
                      style={{
                        height: `${Math.max(
                          item.percentByCurrency[currency],
                          item.expenseByCurrency[currency] > 0 ? 3 : 0,
                        )}%`,
                      }}
                    />
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground">{item.label}</span>
                </summary>
                <p className="text-[0.65rem] font-medium tabular-nums">
                  <MoneyText amountMinor={item.expenseByCurrency[currency]} currency={currency} />
                </p>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function NetWorth({ summary }: { summary: StatsSummary }) {
  const net = summary.netWorth;

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>净资产</CardTitle>
          <CardDescription>当前余额与按最近 30 天交易倒推的差额。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricBox
              label="JPY"
              value={
                <MoneyText
                  amountMinor={net.currentByCurrency.JPY}
                  currency="JPY"
                  showCurrencyCode={false}
                />
              }
            />
            <MetricBox
              label="CNY"
              value={
                <MoneyText
                  amountMinor={net.currentByCurrency.CNY}
                  currency="CNY"
                  showCurrencyCode={false}
                />
              }
            />
            <MetricBox
              label="折算总"
              value={
                net.totalJpyMinor === null ? (
                  "缺少汇率"
                ) : (
                  <MoneyText amountMinor={net.totalJpyMinor} currency="JPY" showCurrencyCode={false} />
                )
              }
              note={
                net.delta30dJpyMinor === null
                  ? "缺少汇率"
                  : (
                      <>
                        30 天 {net.delta30dJpyMinor >= 0 ? "+" : ""}
                        <MoneyText
                          amountMinor={net.delta30dJpyMinor}
                          currency="JPY"
                          showCurrencyCode={false}
                        />
                      </>
                    )
              }
            />
          </div>

          <div className="grid gap-3">
            {net.accounts.map((account) => (
              <div key={account.id} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{account.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    <MoneyText
                      amountMinor={account.balanceMinor}
                      currency={account.currency}
                      showCurrencyCode={false}
                    />
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-transfer"
                    style={{ width: `${account.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export function CreditCardOverview({ summary }: { summary: StatsSummary }) {
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>信用卡总览</CardTitle>
          <CardDescription>本期消费、待还金额和扣款日。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {summary.creditCardOverview.length === 0 ? (
            <p className="rounded-lg bg-muted/50 px-3 py-6 text-center text-sm text-muted-foreground">
              暂无信用卡。
            </p>
          ) : (
            summary.creditCardOverview.map((card) => (
              <div
                key={card.id}
                className={cn(
                  "grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_auto_auto_auto]",
                  card.isOverdue && "border-destructive/40 bg-destructive/5",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CreditCardIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{card.name}</span>
                  {card.isOverdue ? (
                    <AlertTriangleIcon className="size-4 text-destructive" />
                  ) : null}
                </div>
                <CardStat
                  label="本期消费"
                  value={<MoneyText amountMinor={card.currentSpendMinor} currency={card.currency} />}
                />
                <CardStat
                  label="待还"
                  value={<MoneyText amountMinor={card.pendingMinor} currency={card.currency} />}
                  danger={card.isOverdue}
                />
                <CardStat label="扣款日" value={card.dueDate ?? "未设置"} danger={card.isOverdue} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function MetricMini({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5">
      <p>{label}</p>
      <p className="font-medium tabular-nums text-foreground">{value}</p>
      {note ? <p>{note}</p> : null}
    </div>
  );
}

function MetricBox({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function CardStat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 md:grid md:justify-items-end">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", danger && "text-destructive")}>
        {value}
      </span>
    </div>
  );
}

function formatPercentDiff(current: number, baseline: number): string {
  if (baseline === 0) return current === 0 ? "0%" : "+∞";
  const percent = ((current - baseline) / Math.abs(baseline)) * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(0)}%`;
}
