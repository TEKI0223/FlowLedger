"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currencies, parseMoneyToMinor } from "@/domain/finance";
import {
  createQuickEntryTemplateRecord,
  deleteQuickEntryTemplateRecord,
  updateQuickEntryTemplateRecord,
} from "@/features/quick-entry/service";
import { normalize, stringField as field } from "@/lib/form";
import { revalidatePaths, templatePaths } from "@/lib/revalidate";

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
    enabled: formData.get("enabled") === "on",
  };
}

/** 模板的金额允许为空（"自填"），所以单独处理；不复用 lib/form 里的 parseAmount。 */
function parseOptionalAmount(
  raw: string | undefined,
  currency: "JPY" | "CNY",
): { ok: true; amountMinor: number | null } | { ok: false; error: string } {
  if (!raw || raw.trim() === "") return { ok: true, amountMinor: null };
  try {
    return { ok: true, amountMinor: Math.abs(parseMoneyToMinor(raw, currency)) };
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
  const amountResult = parseOptionalAmount(parsed.amount, parsed.currency);
  if (!amountResult.ok) return { error: amountResult.error, values };

  await createQuickEntryTemplateRecord({
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
  });

  revalidatePaths(templatePaths());
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
  const amountResult = parseOptionalAmount(parsed.amount, parsed.currency);
  if (!amountResult.ok) return { error: amountResult.error, values };

  await updateQuickEntryTemplateRecord(id, {
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
  });

  revalidatePaths(templatePaths(id));
  redirect("/templates");
}

export async function deleteQuickEntryTemplate(id: string) {
  await deleteQuickEntryTemplateRecord(id);
  revalidatePaths(templatePaths());
  redirect("/templates");
}
