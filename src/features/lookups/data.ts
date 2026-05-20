import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods } from "@/db/schema";

export async function getTransactionLookups() {
  const [accountRows, categoryRows, paymentMethodRows] = await Promise.all([
    db.select().from(accounts).orderBy(asc(accounts.currency), asc(accounts.name)),
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select().from(paymentMethods).orderBy(asc(paymentMethods.name))
  ]);

  return {
    accounts: accountRows,
    categories: categoryRows,
    paymentMethods: paymentMethodRows
  };
}
