import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { quickEntryTemplates } from "@/db/schema";
import type { Currency, TransactionType } from "@/domain/finance";
import { getCurrentUserId } from "@/lib/auth";
import { nowIso } from "@/lib/dates";

export type CreateTemplateInput = {
  name: string;
  type: TransactionType;
  currency: Currency;
  amountMinor: number | null;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
  enabled: boolean;
};

export async function createQuickEntryTemplateRecord(input: CreateTemplateInput): Promise<string> {
  const ownerUserId = await getCurrentUserId();
  // 新模板放到列表末尾：max(sortOrder) + 10
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${quickEntryTemplates.sortOrder}), 0)` })
    .from(quickEntryTemplates)
    .where(eq(quickEntryTemplates.ownerUserId, ownerUserId));
  const nextSortOrder = (maxRow?.max ?? 0) + 10;

  const id = crypto.randomUUID();
  const timestamp = nowIso();

  await db
    .insert(quickEntryTemplates)
    .values({
      id,
      ownerUserId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      amountMinor: input.amountMinor,
      categoryId: input.categoryId,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      paymentMethodId: input.paymentMethodId,
      note: input.note,
      sortOrder: nextSortOrder,
      enabled: input.enabled,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return id;
}

export type UpdateTemplateInput = CreateTemplateInput;

export async function updateQuickEntryTemplateRecord(
  id: string,
  input: UpdateTemplateInput,
): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  await db
    .update(quickEntryTemplates)
    .set({
      name: input.name,
      type: input.type,
      currency: input.currency,
      amountMinor: input.amountMinor,
      categoryId: input.categoryId,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      paymentMethodId: input.paymentMethodId,
      note: input.note,
      enabled: input.enabled,
      updatedAt: nowIso(),
    })
    .where(and(eq(quickEntryTemplates.id, id), eq(quickEntryTemplates.ownerUserId, ownerUserId)))
    .run();
}

export async function deleteQuickEntryTemplateRecord(id: string): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  await db
    .delete(quickEntryTemplates)
    .where(and(eq(quickEntryTemplates.id, id), eq(quickEntryTemplates.ownerUserId, ownerUserId)))
    .run();
}

/** 累加模板使用次数。失败静默，不阻断主流程。 */
export async function bumpQuickEntryTemplateUsage(id: string): Promise<void> {
  try {
    const ownerUserId = await getCurrentUserId();
    await db
      .update(quickEntryTemplates)
      .set({
        usageCount: sql`${quickEntryTemplates.usageCount} + 1`,
        lastUsedAt: nowIso(),
      })
      .where(and(eq(quickEntryTemplates.id, id), eq(quickEntryTemplates.ownerUserId, ownerUserId)))
      .run();
  } catch {
    // 模板被并发删除等极端情况
  }
}
