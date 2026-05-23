"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { quickEntryTemplates } from "@/db/schema";
import { currencies, parseMoneyToMinor } from "@/domain/finance";
import { nowIso } from "@/lib/dates";

const templateSchema = z.object({
  name: z.string().trim().min(1, "请输入名称"),
  type: z.enum(["income", "expense", "transfer", "adjustment"]),
  currency: z.enum(currencies),
  amount: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  sourceAccountId: z.string().trim().optional(),
  targetAccountId: z.string().trim().optional(),
  paymentMethodId: z.string().trim().optional(),
  note: z.string().trim().optional(),
  enabled: z.boolean(),
});

export type QuickEntryTemplateFormValues = {
  name?: string;
  type?: string;
  currency?: string;
  amount?: string;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
  enabled?: boolean;
};

export type QuickEntryTemplateActionState = {
  error?: string;
  values?: QuickEntryTemplateFormValues;
};

function field(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extract(formData: FormData): QuickEntryTemplateFormValues {
  return {
    name: field(formData, "name"),
    type: field(formData, "type"),
    currency: field(formData, "currency"),
    amount: field(formData, "amount"),
    categoryId: field(formData, "categoryId"),
    sourceAccountId: field(formData, "sourceAccountId"),
    targetAccountId: field(formData, "targetAccountId"),
    paymentMethodId: field(formData, "paymentMethodId"),
    note: field(formData, "note"),
    enabled: formData.has("enabled") ? formData.get("enabled") === "on" : true,
  };
}

function parseAmount(
  raw: string | undefined,
  currency: "JPY" | "CNY",
): { ok: true; amountMinor: number | null } | { ok: false; error: string } {
  if (!raw || raw.trim() === "") return { ok: true, amountMinor: null };
  try {
    const minor = Math.abs(parseMoneyToMinor(raw, currency));
    return { ok: true, amountMinor: minor };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "金额格式不正确" };
  }
}

export async function createQuickEntryTemplate(
  _prev: QuickEntryTemplateActionState,
  formData: FormData,
): Promise<QuickEntryTemplateActionState> {
  const values = extract(formData);

  const result = templateSchema.safeParse({
    name: values.name,
    type: values.type,
    currency: values.currency,
    amount: values.amount,
    categoryId: normalize(values.categoryId),
    sourceAccountId: normalize(values.sourceAccountId),
    targetAccountId: normalize(values.targetAccountId),
    paymentMethodId: normalize(values.paymentMethodId),
    note: normalize(values.note),
    enabled: values.enabled,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "模板内容不完整", values };
  }

  const parsed = result.data;
  const amountResult = parseAmount(parsed.amount, parsed.currency);
  if (!amountResult.ok) {
    return { error: amountResult.error, values };
  }

  // 新模板放到列表最后（用现有最大 sortOrder + 10），同频次场景下保持稳定顺序
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${quickEntryTemplates.sortOrder}), 0)` })
    .from(quickEntryTemplates);
  const nextSortOrder = (maxRow?.max ?? 0) + 10;

  const timestamp = nowIso();

  await db
    .insert(quickEntryTemplates)
    .values({
      id: crypto.randomUUID(),
      name: parsed.name,
      type: parsed.type,
      currency: parsed.currency,
      amountMinor: amountResult.amountMinor,
      categoryId: parsed.categoryId,
      sourceAccountId: parsed.sourceAccountId,
      targetAccountId: parsed.targetAccountId,
      paymentMethodId: parsed.paymentMethodId,
      note: parsed.note,
      sortOrder: nextSortOrder,
      enabled: parsed.enabled,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/templates");
  redirect("/templates");
}

export async function updateQuickEntryTemplate(
  id: string,
  _prev: QuickEntryTemplateActionState,
  formData: FormData,
): Promise<QuickEntryTemplateActionState> {
  const values = extract(formData);

  const result = templateSchema.safeParse({
    name: values.name,
    type: values.type,
    currency: values.currency,
    amount: values.amount,
    categoryId: normalize(values.categoryId),
    sourceAccountId: normalize(values.sourceAccountId),
    targetAccountId: normalize(values.targetAccountId),
    paymentMethodId: normalize(values.paymentMethodId),
    note: normalize(values.note),
    enabled: values.enabled,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "模板内容不完整", values };
  }

  const parsed = result.data;
  const amountResult = parseAmount(parsed.amount, parsed.currency);
  if (!amountResult.ok) {
    return { error: amountResult.error, values };
  }

  await db
    .update(quickEntryTemplates)
    .set({
      name: parsed.name,
      type: parsed.type,
      currency: parsed.currency,
      amountMinor: amountResult.amountMinor,
      categoryId: parsed.categoryId,
      sourceAccountId: parsed.sourceAccountId,
      targetAccountId: parsed.targetAccountId,
      paymentMethodId: parsed.paymentMethodId,
      note: parsed.note,
      enabled: parsed.enabled,
      updatedAt: nowIso(),
    })
    .where(eq(quickEntryTemplates.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  redirect("/templates");
}

export async function deleteQuickEntryTemplate(id: string) {
  await db.delete(quickEntryTemplates).where(eq(quickEntryTemplates.id, id)).run();
  revalidatePath("/");
  revalidatePath("/templates");
  redirect("/templates");
}

export async function resetQuickEntryTemplateUsage(id: string) {
  await db
    .update(quickEntryTemplates)
    .set({ usageCount: 0, lastUsedAt: null, updatedAt: nowIso() })
    .where(eq(quickEntryTemplates.id, id))
    .run();
  revalidatePath("/");
  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  redirect(`/templates/${id}`);
}
