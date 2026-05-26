import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  accounts,
  paymentMethods,
  quickEntryTemplates,
  recurringItems,
  transactions,
} from "@/db/schema";
import { syncAllCreditCardPaymentMethods } from "@/features/credit-cards/service";
import { getCurrentUserId } from "@/lib/auth";

export type PaymentMethodRow = typeof paymentMethods.$inferSelect;

export type PaymentMethodWithRefs = PaymentMethodRow & {
  defaultAccount: {
    id: string;
    name: string;
    currency: typeof accounts.$inferSelect.currency;
    lastDigits: string | null;
  } | null;
  transactionCount: number;
  templateCount: number;
  recurringCount: number;
};

export async function listPaymentMethods(): Promise<PaymentMethodWithRefs[]> {
  const ownerUserId = await getCurrentUserId();
  await syncAllCreditCardPaymentMethods();

  const rows = await db
    .select({
      id: paymentMethods.id,
      ownerUserId: paymentMethods.ownerUserId,
      name: paymentMethods.name,
      type: paymentMethods.type,
      currency: paymentMethods.currency,
      defaultAccountId: paymentMethods.defaultAccountId,
      enabled: paymentMethods.enabled,
      note: paymentMethods.note,
      createdAt: paymentMethods.createdAt,
      updatedAt: paymentMethods.updatedAt,
      defaultAccountName: accounts.name,
      defaultAccountCurrency: accounts.currency,
      defaultAccountLastDigits: accounts.lastDigits,
      transactionCount: sql<number>`(
        select count(*)
        from ${transactions}
        where ${transactions.paymentMethodId} = ${paymentMethods.id}
          and ${transactions.ownerUserId} = ${ownerUserId}
      )`,
      templateCount: sql<number>`(
        select count(*)
        from ${quickEntryTemplates}
        where ${quickEntryTemplates.paymentMethodId} = ${paymentMethods.id}
          and ${quickEntryTemplates.ownerUserId} = ${ownerUserId}
      )`,
      recurringCount: sql<number>`(
        select count(*)
        from ${recurringItems}
        where ${recurringItems.paymentMethodId} = ${paymentMethods.id}
          and ${recurringItems.ownerUserId} = ${ownerUserId}
      )`,
    })
    .from(paymentMethods)
    .leftJoin(accounts, eq(paymentMethods.defaultAccountId, accounts.id))
    .where(eq(paymentMethods.ownerUserId, ownerUserId))
    .orderBy(desc(paymentMethods.enabled), asc(paymentMethods.currency), asc(paymentMethods.name));

  return rows.map((row) => ({
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    type: row.type,
    currency: row.currency,
    defaultAccountId: row.defaultAccountId,
    enabled: row.enabled,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    defaultAccount: row.defaultAccountId
      ? {
          id: row.defaultAccountId,
          name: row.defaultAccountName ?? "未知账户",
          currency: row.defaultAccountCurrency ?? row.currency,
          lastDigits: row.defaultAccountLastDigits,
        }
      : null,
    transactionCount: Number(row.transactionCount ?? 0),
    templateCount: Number(row.templateCount ?? 0),
    recurringCount: Number(row.recurringCount ?? 0),
  }));
}

export async function getPaymentMethod(id: string): Promise<PaymentMethodWithRefs | null> {
  const rows = await listPaymentMethods();
  return rows.find((row) => row.id === id) ?? null;
}

export async function listPaymentMethodAccountOptions() {
  const ownerUserId = await getCurrentUserId();
  return db
    .select({
      id: accounts.id,
      name: accounts.name,
      lastDigits: accounts.lastDigits,
      currency: accounts.currency,
      type: accounts.type,
    })
    .from(accounts)
    .where(eq(accounts.ownerUserId, ownerUserId))
    .orderBy(asc(accounts.currency), asc(accounts.type), asc(accounts.name));
}
