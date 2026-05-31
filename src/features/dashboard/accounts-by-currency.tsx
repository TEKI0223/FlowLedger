import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accountTypeLabels, currencyLabels, formatMoney, type Currency } from "@/domain/finance";
import type { listAccounts } from "@/features/accounts/data";
import { formatAccountName } from "@/features/accounts/labels";
import { cn } from "@/lib/utils";

type Account = Awaited<ReturnType<typeof listAccounts>>[number];

export function AccountsByCurrency({ accounts }: { accounts: Account[] }) {
  const byCurrency: Record<Currency, Account[]> = { JPY: [], CNY: [] };
  for (const account of accounts) {
    byCurrency[account.currency].push(account);
  }
  const currencies: Currency[] = ["JPY", "CNY"];

  return (
    <section aria-label="账户" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">账户</h2>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          管理账户
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {currencies.map((currency) => (
          <CurrencyAccountCard key={currency} currency={currency} accounts={byCurrency[currency]} />
        ))}
      </div>
    </section>
  );
}

function CurrencyAccountCard({ currency, accounts }: { currency: Currency; accounts: Account[] }) {
  const grouped = new Map<Account["type"], Account[]>();
  for (const account of accounts) {
    const list = grouped.get(account.type) ?? [];
    list.push(account);
    grouped.set(account.type, list);
  }
  const total = accounts
    .filter((a) => a.includeInNetWorth)
    .reduce((sum, a) => sum + a.balanceMinor, 0);

  return (
    <Card className="rounded-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-baseline justify-between gap-3">
          <span>
            {currency} · {currencyLabels[currency]}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatMoney({ amountMinor: total, currency })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {accounts.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted-foreground">
            暂无{currencyLabels[currency]}账户。
          </p>
        ) : (
          <div className="divide-y divide-border">
            {Array.from(grouped.entries()).map(([type, list]) => {
              const subtotal = list
                .filter((a) => a.includeInNetWorth)
                .reduce((sum, a) => sum + a.balanceMinor, 0);
              return (
                <div key={type} className="px-4 py-3">
                  <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted-foreground">
                    <span>{accountTypeLabels[type]}</span>
                    <span className="tabular-nums">
                      {formatMoney(
                        { amountMinor: subtotal, currency },
                        { showCurrencyCode: false },
                      )}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {list
                      .slice()
                      .sort((a, b) => b.balanceMinor - a.balanceMinor)
                      .map((account) => (
                        <li
                          key={account.id}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <Link
                            href={`/accounts/${account.id}`}
                            className={cn(
                              "min-w-0 truncate hover:underline",
                              !account.includeInNetWorth && "text-muted-foreground",
                            )}
                          >
                            {formatAccountName(account)}
                            {!account.includeInNetWorth ? (
                              <span className="ml-1 text-xs">（不计入）</span>
                            ) : null}
                          </Link>
                          <span className="shrink-0 font-medium tabular-nums">
                            {formatMoney(
                              { amountMinor: account.balanceMinor, currency },
                              { showCurrencyCode: false },
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
