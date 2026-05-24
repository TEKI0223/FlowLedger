import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods } from "@/db/schema";
import { buildCategoryOptions } from "@/features/categories/data";
import { syncAllCreditCardPaymentMethods } from "@/features/credit-cards/service";

export async function getTransactionLookups() {
  await syncAllCreditCardPaymentMethods();

  const [accountRows, categoryRows, paymentMethodRows] = await Promise.all([
    db
      .select({
        id: accounts.id,
        name: accounts.name,
        lastDigits: accounts.lastDigits,
        currency: accounts.currency,
        balanceMinor: accounts.balanceMinor,
      })
      .from(accounts)
      .orderBy(asc(accounts.currency), asc(accounts.name)),
    db.select().from(categories),
    db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.enabled, true))
      .orderBy(asc(paymentMethods.name)),
  ]);

  return {
    accounts: accountRows,
    categories: buildCategoryOptions(categoryRows),
    paymentMethods: paymentMethodRows,
  };
}
