"use client";

import { formatMoney, type Currency } from "@/domain/finance";
import { usePrivacyMode } from "./privacy-provider";

type MoneyTextProps = {
  amountMinor: number;
  currency: Currency;
  showCurrencyCode?: boolean;
  className?: string;
};

export function MoneyText({
  amountMinor,
  currency,
  showCurrencyCode = true,
  className,
}: MoneyTextProps) {
  const { privacyMode } = usePrivacyMode();
  const text = privacyMode
    ? showCurrencyCode
      ? `${currency} ••••`
      : "••••"
    : formatMoney({ amountMinor, currency }, { showCurrencyCode });

  return <span className={className}>{text}</span>;
}
