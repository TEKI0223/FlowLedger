"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon, SettingsIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, type Currency } from "@/domain/finance";
import type { AccountRow } from "@/features/accounts/data";
import type { DashboardSummary } from "./data";
import { cn } from "@/lib/utils";

type DashboardAssetsProps = {
  summary: DashboardSummary;
  accounts: AccountRow[];
};

export function DashboardAssets({ summary, accounts }: DashboardAssetsProps) {
  const [open, setOpen] = useState(false);
  const ToggleIcon = open ? ChevronUpIcon : ChevronDownIcon;

  return (
    <section aria-label="账户余额">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">总资产</h2>
            <Link
              href="/accounts"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <SettingsIcon className="size-3.5" />
              管理账户
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AssetMetric
              label="JPY"
              value={formatMoney({ amountMinor: summary.assets.JPY, currency: "JPY" })}
            />
            <AssetMetric
              label="CNY"
              value={formatMoney({ amountMinor: summary.assets.CNY, currency: "CNY" })}
            />
          </div>

          <AssetMetric
            label="折算净资产"
            value={formatMoney({
              amountMinor: summary.netWorth.amountMinor,
              currency: summary.netWorth.baseCurrency,
            })}
            note={
              summary.netWorth.rateCnyToJpy === null
                ? "缺少汇率"
                : `1 CNY = ${summary.netWorth.rateCnyToJpy.toFixed(2)} JPY`
            }
            emphasized
          />

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center justify-between border-t border-border pt-3 text-left"
          >
            <span className="text-sm font-medium">账户明细</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {accounts.length} 个账户 · {open ? "收起" : "展开"}
              <ToggleIcon className="size-3.5" />
            </span>
          </button>

          {open ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">点击账户进入详情</p>
              <div className="grid gap-3 md:grid-cols-2">
                <AccountCurrencyGroup currency="JPY" accounts={accounts} />
                <AccountCurrencyGroup currency="CNY" accounts={accounts} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function AssetMetric({
  label,
  value,
  note,
  emphasized = false,
}: {
  label: string;
  value: string;
  note?: string;
  emphasized?: boolean;
}) {
  return (
    <div className={cn("space-y-1 rounded-lg bg-muted/50 px-3 py-2.5", emphasized && "py-3")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("font-semibold tabular-nums", emphasized ? "text-2xl" : "text-xl")}>
        {value}
      </p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function AccountCurrencyGroup({
  currency,
  accounts,
}: {
  currency: Currency;
  accounts: AccountRow[];
}) {
  const filtered = accounts.filter((account) => account.currency === currency);

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-3",
        currency === "JPY" ? "border-l-4 border-l-transfer" : "border-l-4 border-l-income",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{currency}</h3>
        <span className="text-xs text-muted-foreground">{filtered.length} 个</span>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无账户</p>
      ) : (
        <div className="divide-y divide-border/70">
          {filtered.map((account) => (
            <Link
              href={`/accounts/${account.id}`}
              className="group flex items-center justify-between gap-3 py-2 transition-colors hover:text-foreground"
              key={account.id}
            >
              <span className="truncate text-sm">{account.name}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums">
                {formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}
                <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
