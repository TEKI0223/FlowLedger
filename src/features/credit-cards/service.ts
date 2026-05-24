import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  accounts,
  creditCards,
  paymentMethods,
  quickEntryTemplates,
  recurringItems,
  transactions,
} from "@/db/schema";
import type { Currency } from "@/domain/finance";
import type { CycleBoundary } from "@/domain/credit-card";
import { nowIso } from "@/lib/dates";

export type CreditCardInput = {
  name: string;
  lastDigits?: string;
  currency: Currency;
  balanceMinor: number;
  closingDay: number;
  paymentDay: number;
  cycleBoundary: CycleBoundary;
  repaymentAccountId?: string;
  enabled: boolean;
  note?: string;
};

export async function createCreditCardRecord(input: CreditCardInput): Promise<string> {
  const timestamp = nowIso();
  const accountId = crypto.randomUUID();
  const cardId = crypto.randomUUID();

  await db
    .insert(accounts)
    .values({
      id: accountId,
      name: input.name,
      lastDigits: input.lastDigits,
      type: "credit_card",
      currency: input.currency,
      balanceMinor: input.balanceMinor,
      includeInNetWorth: false,
      note: input.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  await db
    .insert(creditCards)
    .values({
      id: cardId,
      accountId,
      closingDay: input.closingDay,
      paymentDay: input.paymentDay,
      cycleBoundary: input.cycleBoundary,
      repaymentAccountId: input.repaymentAccountId,
      enabled: input.enabled,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  await syncCreditCardPaymentMethod(accountId, input);

  return cardId;
}

export async function updateCreditCardRecord(
  cardId: string,
  accountId: string,
  input: CreditCardInput,
): Promise<void> {
  const timestamp = nowIso();

  await db
    .update(accounts)
    .set({
      name: input.name,
      lastDigits: input.lastDigits,
      currency: input.currency,
      balanceMinor: input.balanceMinor,
      includeInNetWorth: false,
      note: input.note,
      updatedAt: timestamp,
    })
    .where(eq(accounts.id, accountId))
    .run();

  await db
    .update(creditCards)
    .set({
      closingDay: input.closingDay,
      paymentDay: input.paymentDay,
      cycleBoundary: input.cycleBoundary,
      repaymentAccountId: input.repaymentAccountId,
      enabled: input.enabled,
      updatedAt: timestamp,
    })
    .where(eq(creditCards.id, cardId))
    .run();

  await syncCreditCardPaymentMethod(accountId, input);
}

export async function deleteCreditCardRecord(
  cardId: string,
  accountId: string,
): Promise<DeleteCreditCardResult> {
  const paymentMethodRows = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(and(eq(paymentMethods.defaultAccountId, accountId), eq(paymentMethods.type, "card")));
  const paymentMethodIds = paymentMethodRows.map((row) => row.id);

  const [counts] = await db
    .select({
      transactions: sql<number>`(
        select count(*)
        from ${transactions}
        where ${transactions.sourceAccountId} = ${accountId}
           or ${transactions.targetAccountId} = ${accountId}
      )`,
      templatesByAccount: sql<number>`(
        select count(*)
        from ${quickEntryTemplates}
        where ${quickEntryTemplates.sourceAccountId} = ${accountId}
           or ${quickEntryTemplates.targetAccountId} = ${accountId}
      )`,
      recurringByAccount: sql<number>`(
        select count(*)
        from ${recurringItems}
        where ${recurringItems.sourceAccountId} = ${accountId}
           or ${recurringItems.targetAccountId} = ${accountId}
      )`,
      repaymentRefs: sql<number>`(
        select count(*)
        from ${creditCards}
        where ${creditCards.repaymentAccountId} = ${accountId}
      )`,
    })
    .from(creditCards)
    .limit(1);

  if ((counts?.transactions ?? 0) > 0)
    return { ok: false, error: "已有交易使用该信用卡，不能删除" };
  if ((counts?.templatesByAccount ?? 0) > 0) {
    return { ok: false, error: "已有快捷模板使用该信用卡账户，不能删除" };
  }
  if ((counts?.recurringByAccount ?? 0) > 0) {
    return { ok: false, error: "已有周期项目使用该信用卡账户，不能删除" };
  }
  if ((counts?.repaymentRefs ?? 0) > 0) {
    return { ok: false, error: "仍有信用卡把这张卡设为还款账户，不能删除" };
  }

  if (paymentMethodIds.length > 0) {
    const [[templateRefs], [recurringRefs]] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(quickEntryTemplates)
        .where(inArray(quickEntryTemplates.paymentMethodId, paymentMethodIds)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(recurringItems)
        .where(inArray(recurringItems.paymentMethodId, paymentMethodIds)),
    ]);

    if ((templateRefs?.count ?? 0) > 0) {
      return { ok: false, error: "已有快捷模板使用这张卡的支付方式，不能删除" };
    }
    if ((recurringRefs?.count ?? 0) > 0) {
      return { ok: false, error: "已有周期项目使用这张卡的支付方式，不能删除" };
    }

    await db.delete(paymentMethods).where(inArray(paymentMethods.id, paymentMethodIds)).run();
  }

  await db.delete(creditCards).where(eq(creditCards.id, cardId)).run();
  await db.delete(accounts).where(eq(accounts.id, accountId)).run();

  return { ok: true };
}

type DeleteCreditCardResult = { ok: true } | { ok: false; error: string };

export async function syncAllCreditCardPaymentMethods(): Promise<void> {
  const rows = await db
    .select({
      cardId: creditCards.id,
      closingDay: creditCards.closingDay,
      paymentDay: creditCards.paymentDay,
      cycleBoundary: creditCards.cycleBoundary,
      repaymentAccountId: creditCards.repaymentAccountId,
      enabled: creditCards.enabled,
      accountId: accounts.id,
      name: accounts.name,
      lastDigits: accounts.lastDigits,
      currency: accounts.currency,
      balanceMinor: accounts.balanceMinor,
      note: accounts.note,
    })
    .from(creditCards)
    .innerJoin(accounts, eq(creditCards.accountId, accounts.id));

  for (const row of rows) {
    await syncCreditCardPaymentMethod(row.accountId, {
      name: row.name,
      lastDigits: row.lastDigits ?? undefined,
      currency: row.currency,
      balanceMinor: row.balanceMinor,
      closingDay: row.closingDay,
      paymentDay: row.paymentDay,
      cycleBoundary: row.cycleBoundary,
      repaymentAccountId: row.repaymentAccountId ?? undefined,
      enabled: row.enabled,
      note: row.note ?? undefined,
    });
  }
}

export async function syncCreditCardPaymentMethod(accountId: string, input: CreditCardInput) {
  const timestamp = nowIso();
  const [existing] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.defaultAccountId, accountId), eq(paymentMethods.type, "card")))
    .limit(1);

  if (existing) {
    await db
      .update(paymentMethods)
      .set({
        name: input.name,
        currency: input.currency,
        enabled: input.enabled,
        updatedAt: timestamp,
      })
      .where(eq(paymentMethods.id, existing.id))
      .run();
    return;
  }

  await db
    .insert(paymentMethods)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      type: "card",
      currency: input.currency,
      defaultAccountId: accountId,
      enabled: input.enabled,
      note: "由信用卡自动同步",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
}
