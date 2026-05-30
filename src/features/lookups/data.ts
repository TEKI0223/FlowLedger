import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, paymentMethods } from "@/db/schema";
import { listCategoryOptions } from "@/features/categories/data";
import {
  getCreditCardStatementOptions,
  type CreditCardStatementOption,
} from "@/features/credit-cards/data";
import { syncAllCreditCardPaymentMethods } from "@/features/credit-cards/service";
import { getCurrentUserId } from "@/lib/auth";

export type TransactionLookups = {
  accounts: Array<{
    id: string;
    name: string;
    type: "cash" | "bank" | "credit_card" | "wallet";
    lastDigits: string | null;
    currency: "JPY" | "CNY";
    balanceMinor: number;
  }>;
  categories: Awaited<ReturnType<typeof listCategoryOptions>>;
  paymentMethods: Array<typeof paymentMethods.$inferSelect>;
  /** 按信用卡 accountId 索引的可选账单期；非信用卡账户没有 entry */
  creditCardStatementsByAccountId: Record<string, CreditCardStatementOption[]>;
};

export async function getTransactionLookups(anchor?: string): Promise<TransactionLookups> {
  const ownerUserId = await getCurrentUserId();
  await syncAllCreditCardPaymentMethods();

  const [accountRows, categoryOptions, paymentMethodRows, creditCardStatementsByAccountId] =
    await Promise.all([
      db
        .select({
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
          lastDigits: accounts.lastDigits,
          currency: accounts.currency,
          balanceMinor: accounts.balanceMinor,
        })
        .from(accounts)
        .where(eq(accounts.ownerUserId, ownerUserId))
        .orderBy(asc(accounts.currency), asc(accounts.name)),
      listCategoryOptions(ownerUserId),
      db
        .select()
        .from(paymentMethods)
        .where(and(eq(paymentMethods.enabled, true), eq(paymentMethods.ownerUserId, ownerUserId)))
        .orderBy(asc(paymentMethods.name)),
      getCreditCardStatementOptions(anchor),
    ]);

  return {
    accounts: accountRows,
    categories: categoryOptions,
    paymentMethods: paymentMethodRows,
    creditCardStatementsByAccountId,
  };
}
