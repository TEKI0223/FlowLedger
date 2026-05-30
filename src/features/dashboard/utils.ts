import { convertToCurrency, formatMoney, type Currency } from "@/domain/finance";

export function toJpy(values: Record<Currency, number>, rate: number | null): number {
  const cnyAsJpy =
    rate === null
      ? 0
      : convertToCurrency({ amountMinor: values.CNY, currency: "CNY" }, "JPY", rate);
  return values.JPY + cnyAsJpy;
}

export function toJpySingle(
  amountMinor: number,
  currency: Currency,
  rate: number | null,
): number {
  if (currency === "JPY") return amountMinor;
  if (rate === null) return 0;
  return convertToCurrency({ amountMinor, currency }, "JPY", rate);
}

export function formatCurrencyPair(values: Record<Currency, number>): string {
  return `JPY ${formatMoney(
    { amountMinor: values.JPY, currency: "JPY" },
    { showCurrencyCode: false },
  )}\nCNY ${formatMoney({ amountMinor: values.CNY, currency: "CNY" }, { showCurrencyCode: false })}`;
}
