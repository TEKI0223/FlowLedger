import { db } from "@/db/client";
import { exchangeRates } from "@/db/schema";
import type { Currency } from "@/domain/finance";
import { nowIso } from "@/lib/dates";

type ExchangeRatePairInput = {
  cnyToJpy: number;
};

export async function updateCnyJpyExchangeRate({ cnyToJpy }: ExchangeRatePairInput) {
  const now = nowIso();

  await upsertExchangeRate({
    id: "cny-to-jpy",
    fromCurrency: "CNY",
    toCurrency: "JPY",
    rate: cnyToJpy,
    updatedAt: now,
  });
  await upsertExchangeRate({
    id: "jpy-to-cny",
    fromCurrency: "JPY",
    toCurrency: "CNY",
    rate: 1 / cnyToJpy,
    updatedAt: now,
  });
}

type UpsertExchangeRateInput = {
  id: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  updatedAt: string;
};

async function upsertExchangeRate(input: UpsertExchangeRateInput) {
  await db
    .insert(exchangeRates)
    .values(input)
    .onConflictDoUpdate({
      target: exchangeRates.id,
      set: {
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        rate: input.rate,
        updatedAt: input.updatedAt,
      },
    });
}
