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
import { getCurrentUserId } from "@/lib/auth";
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
  const ownerUserId = await getCurrentUserId();
  const timestamp = nowIso();
  const accountId = crypto.randomUUID();
  const cardId = crypto.randomUUID();

  await db
    .insert(accounts)
    .values({
      id: accountId,
      ownerUserId,
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
      ownerUserId,
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
  const ownerUserId = await getCurrentUserId();
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
    .where(and(eq(accounts.id, accountId), eq(accounts.ownerUserId, ownerUserId)))
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
    .where(and(eq(creditCards.id, cardId), eq(creditCards.ownerUserId, ownerUserId)))
    .run();

  await syncCreditCardPaymentMethod(accountId, input);
}

export async function deleteCreditCardRecord(
  cardId: string,
  accountId: string,
): Promise<DeleteCreditCardResult> {
  const ownerUserId = await getCurrentUserId();
  const paymentMethodRows = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.defaultAccountId, accountId),
        eq(paymentMethods.type, "card"),
        eq(paymentMethods.ownerUserId, ownerUserId),
      ),
    );
  const paymentMethodIds = paymentMethodRows.map((row) => row.id);

  const [counts] = await db
    .select({
      transactions: sql<number>`(
        select count(*)
        from ${transactions}
        where (${transactions.sourceAccountId} = ${accountId}
           or ${transactions.targetAccountId} = ${accountId})
          and ${transactions.ownerUserId} = ${ownerUserId}
      )`,
      templatesByAccount: sql<number>`(
        select count(*)
        from ${quickEntryTemplates}
        where (${quickEntryTemplates.sourceAccountId} = ${accountId}
           or ${quickEntryTemplates.targetAccountId} = ${accountId})
          and ${quickEntryTemplates.ownerUserId} = ${ownerUserId}
      )`,
      recurringByAccount: sql<number>`(
        select count(*)
        from ${recurringItems}
        where (${recurringItems.sourceAccountId} = ${accountId}
           or ${recurringItems.targetAccountId} = ${accountId})
          and ${recurringItems.ownerUserId} = ${ownerUserId}
      )`,
      repaymentRefs: sql<number>`(
        select count(*)
        from ${creditCards}
        where ${creditCards.repaymentAccountId} = ${accountId}
          and ${creditCards.ownerUserId} = ${ownerUserId}
      )`,
    })
    .from(creditCards)
    .where(and(eq(creditCards.id, cardId), eq(creditCards.ownerUserId, ownerUserId)))
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
        .where(
          and(
            inArray(quickEntryTemplates.paymentMethodId, paymentMethodIds),
            eq(quickEntryTemplates.ownerUserId, ownerUserId),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(recurringItems)
        .where(
          and(
            inArray(recurringItems.paymentMethodId, paymentMethodIds),
            eq(recurringItems.ownerUserId, ownerUserId),
          ),
        ),
    ]);

    if ((templateRefs?.count ?? 0) > 0) {
      return { ok: false, error: "已有快捷模板使用这张卡的支付方式，不能删除" };
    }
    if ((recurringRefs?.count ?? 0) > 0) {
      return { ok: false, error: "已有周期项目使用这张卡的支付方式，不能删除" };
    }

    await db
      .delete(paymentMethods)
      .where(
        and(
          inArray(paymentMethods.id, paymentMethodIds),
          eq(paymentMethods.ownerUserId, ownerUserId),
        ),
      )
      .run();
  }

  await db
    .delete(creditCards)
    .where(and(eq(creditCards.id, cardId), eq(creditCards.ownerUserId, ownerUserId)))
    .run();
  await db
    .delete(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.ownerUserId, ownerUserId)))
    .run();

  return { ok: true };
}

type DeleteCreditCardResult = { ok: true } | { ok: false; error: string };

export async function syncAllCreditCardPaymentMethods(): Promise<void> {
  const ownerUserId = await getCurrentUserId();
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
    .innerJoin(accounts, eq(creditCards.accountId, accounts.id))
    .where(eq(creditCards.ownerUserId, ownerUserId));

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
  const ownerUserId = await getCurrentUserId();
  const timestamp = nowIso();
  const [existing] = await db
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.defaultAccountId, accountId),
        eq(paymentMethods.type, "card"),
        eq(paymentMethods.ownerUserId, ownerUserId),
      ),
    )
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
      .where(and(eq(paymentMethods.id, existing.id), eq(paymentMethods.ownerUserId, ownerUserId)))
      .run();
    return;
  }

  await db
    .insert(paymentMethods)
    .values({
      id: crypto.randomUUID(),
      ownerUserId,
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
