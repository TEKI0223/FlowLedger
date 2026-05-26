import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods } from "@/db/schema";
import { buildCategoryOptions } from "@/features/categories/data";
import { syncAllCreditCardPaymentMethods } from "@/features/credit-cards/service";
import { getCurrentUserId } from "@/lib/auth";

export async function getTransactionLookups() {
  const ownerUserId = await getCurrentUserId();
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
      .where(eq(accounts.ownerUserId, ownerUserId))
      .orderBy(asc(accounts.currency), asc(accounts.name)),
    db.select().from(categories),
    db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.enabled, true), eq(paymentMethods.ownerUserId, ownerUserId)))
      .orderBy(asc(paymentMethods.name)),
  ]);

  return {
    accounts: accountRows,
    categories: buildCategoryOptions(categoryRows),
    paymentMethods: paymentMethodRows,
  };
}
