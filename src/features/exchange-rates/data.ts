import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { exchangeRates } from "@/db/schema";
import type { Currency } from "@/domain/finance";

export async function getExchangeRate(from: Currency, to: Currency): Promise<number | null> {
  if (from === to) {
    return 1;
  }

  const [row] = await db
    .select({ rate: exchangeRates.rate })
    .from(exchangeRates)
    .where(and(eq(exchangeRates.fromCurrency, from), eq(exchangeRates.toCurrency, to)))
    .limit(1);

  return row?.rate ?? null;
}
