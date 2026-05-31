import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { MoneyText } from "@/components/privacy/money-text";
import {
  accountTypeLabels,
  currencyLabels,
  type AccountType,
  type Currency,
} from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";

type AccountCardProps = {
  account: {
    id: string;
    name: string;
    type: AccountType;
    currency: Currency;
    balanceMinor: number;
    includeInNetWorth: boolean;
    lastDigits: string | null;
  };
};

export function AccountCard({ account }: AccountCardProps) {
  return (
    <Link
      href={`/accounts/${account.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-card-foreground transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-semibold">{formatAccountName(account)}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{accountTypeLabels[account.type]}</span>
          <span aria-hidden="true">·</span>
          <span>
            {account.currency} · {currencyLabels[account.currency]}
          </span>
          {!account.includeInNetWorth ? (
            <>
              <span aria-hidden="true">·</span>
              <span>不计入净资产</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-right text-sm font-semibold tabular-nums">
          <MoneyText amountMinor={account.balanceMinor} currency={account.currency} />
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
