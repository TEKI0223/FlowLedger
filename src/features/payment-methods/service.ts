import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentMethods, quickEntryTemplates, recurringItems, transactions } from "@/db/schema";
import type { Currency, PaymentMethodType } from "@/domain/finance";
import { nowIso } from "@/lib/dates";

export type PaymentMethodInput = {
  name: string;
  type: PaymentMethodType;
  currency: Currency;
  defaultAccountId?: string;
  enabled: boolean;
  note?: string;
};

export async function createPaymentMethodRecord(input: PaymentMethodInput): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  await db
    .insert(paymentMethods)
    .values({
      id,
      name: input.name,
      type: input.type,
      currency: input.currency,
      defaultAccountId: input.defaultAccountId,
      enabled: input.enabled,
      note: input.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return id;
}

export async function updatePaymentMethodRecord(
  id: string,
  input: PaymentMethodInput,
): Promise<void> {
  await db
    .update(paymentMethods)
    .set({
      name: input.name,
      type: input.type,
      currency: input.currency,
      defaultAccountId: input.defaultAccountId,
      enabled: input.enabled,
      note: input.note,
      updatedAt: nowIso(),
    })
    .where(eq(paymentMethods.id, id))
    .run();
}

export async function deletePaymentMethodRecord(id: string): Promise<DeletePaymentMethodResult> {
  const refs = await getPaymentMethodReferenceCounts(id);
  if (refs.transactions > 0) return { ok: false, error: "已有交易使用该支付方式，不能删除" };
  if (refs.templates > 0) return { ok: false, error: "已有快捷模板使用该支付方式，不能删除" };
  if (refs.recurring > 0) return { ok: false, error: "已有周期项目使用该支付方式，不能删除" };

  await db.delete(paymentMethods).where(eq(paymentMethods.id, id)).run();
  return { ok: true };
}

type DeletePaymentMethodResult = { ok: true } | { ok: false; error: string };

async function getPaymentMethodReferenceCounts(id: string) {
  const [counts] = await db
    .select({
      transactions: sql<number>`(
        select count(*)
        from ${transactions}
        where ${transactions.paymentMethodId} = ${id}
      )`,
      templates: sql<number>`(
        select count(*)
        from ${quickEntryTemplates}
        where ${quickEntryTemplates.paymentMethodId} = ${id}
      )`,
      recurring: sql<number>`(
        select count(*)
        from ${recurringItems}
        where ${recurringItems.paymentMethodId} = ${id}
      )`,
    })
    .from(paymentMethods)
    .limit(1);

  return {
    transactions: counts?.transactions ?? 0,
    templates: counts?.templates ?? 0,
    recurring: counts?.recurring ?? 0,
  };
}
