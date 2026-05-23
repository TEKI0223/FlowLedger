"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recurringItems } from "@/db/schema";
import { currencies, parseMoneyToMinor } from "@/domain/finance";
import { recurringFrequencies } from "@/domain/recurring";
import { nowIso } from "@/lib/dates";

const recurringSchema = z
  .object({
    name: z.string().trim().min(1, "请输入名称"),
    type: z.enum(["income", "expense", "transfer"]),
    amount: z.string().trim().optional(),
    amountFixed: z.boolean(),
    currency: z.enum(currencies),
    frequency: z.enum(recurringFrequencies),
    nextDate: z.string().trim().min(1, "请选择下次发生日期"),
    categoryId: z.string().trim().optional(),
    sourceAccountId: z.string().trim().optional(),
    targetAccountId: z.string().trim().optional(),
    paymentMethodId: z.string().trim().optional(),
    note: z.string().trim().optional(),
    enabled: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.amountFixed && (!data.amount || data.amount.trim() === "")) {
        return false;
      }
      return true;
    },
    { message: "固定金额时需要填写金额", path: ["amount"] },
  );

export type RecurringFormValues = {
  name?: string;
  type?: string;
  amount?: string;
  amountFixed?: boolean;
  currency?: string;
  frequency?: string;
  nextDate?: string;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
  enabled?: boolean;
};

export type RecurringActionState = {
  error?: string;
  values?: RecurringFormValues;
};

function field(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extract(formData: FormData): RecurringFormValues {
  return {
    name: field(formData, "name"),
    type: field(formData, "type"),
    amount: field(formData, "amount"),
    amountFixed: formData.get("amountFixed") === "on",
    currency: field(formData, "currency"),
    frequency: field(formData, "frequency"),
    nextDate: field(formData, "nextDate"),
    categoryId: field(formData, "categoryId"),
    sourceAccountId: field(formData, "sourceAccountId"),
    targetAccountId: field(formData, "targetAccountId"),
    paymentMethodId: field(formData, "paymentMethodId"),
    note: field(formData, "note"),
    // 未传 enabled 时（例如表单未渲染该复选框）默认启用
    enabled: formData.has("enabled") ? formData.get("enabled") === "on" : true,
  };
}

function parseAmount(
  rawAmount: string | undefined,
  amountFixed: boolean,
  currency: "JPY" | "CNY",
): { ok: true; amountMinor: number | null } | { ok: false; error: string } {
  if (!rawAmount || rawAmount.trim() === "") {
    if (amountFixed) {
      return { ok: false, error: "固定金额时需要填写金额" };
    }
    return { ok: true, amountMinor: null };
  }

  try {
    const minor = Math.abs(parseMoneyToMinor(rawAmount, currency));
    return { ok: true, amountMinor: minor };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "金额格式不正确" };
  }
}

export async function createRecurringItem(
  _prev: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const values = extract(formData);

  const result = recurringSchema.safeParse({
    name: values.name,
    type: values.type,
    amount: values.amount,
    amountFixed: values.amountFixed,
    currency: values.currency,
    frequency: values.frequency,
    nextDate: values.nextDate,
    categoryId: normalize(values.categoryId),
    sourceAccountId: normalize(values.sourceAccountId),
    targetAccountId: normalize(values.targetAccountId),
    paymentMethodId: normalize(values.paymentMethodId),
    note: normalize(values.note),
    enabled: values.enabled,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "周期项内容不完整", values };
  }

  const parsed = result.data;
  const amountResult = parseAmount(parsed.amount, parsed.amountFixed, parsed.currency);

  if (!amountResult.ok) {
    return { error: amountResult.error, values };
  }

  const timestamp = nowIso();

  db.insert(recurringItems)
    .values({
      id: crypto.randomUUID(),
      name: parsed.name,
      type: parsed.type,
      amountMinor: amountResult.amountMinor,
      amountFixed: parsed.amountFixed,
      currency: parsed.currency,
      frequency: parsed.frequency,
      nextDate: parsed.nextDate,
      categoryId: parsed.categoryId,
      sourceAccountId: parsed.sourceAccountId,
      targetAccountId: parsed.targetAccountId,
      paymentMethodId: parsed.paymentMethodId,
      note: parsed.note,
      enabled: parsed.enabled,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function updateRecurringItem(
  id: string,
  _prev: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const values = extract(formData);

  const result = recurringSchema.safeParse({
    name: values.name,
    type: values.type,
    amount: values.amount,
    amountFixed: values.amountFixed,
    currency: values.currency,
    frequency: values.frequency,
    nextDate: values.nextDate,
    categoryId: normalize(values.categoryId),
    sourceAccountId: normalize(values.sourceAccountId),
    targetAccountId: normalize(values.targetAccountId),
    paymentMethodId: normalize(values.paymentMethodId),
    note: normalize(values.note),
    enabled: values.enabled,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "周期项内容不完整", values };
  }

  const parsed = result.data;
  const amountResult = parseAmount(parsed.amount, parsed.amountFixed, parsed.currency);

  if (!amountResult.ok) {
    return { error: amountResult.error, values };
  }

  await db
    .update(recurringItems)
    .set({
      name: parsed.name,
      type: parsed.type,
      amountMinor: amountResult.amountMinor,
      amountFixed: parsed.amountFixed,
      currency: parsed.currency,
      frequency: parsed.frequency,
      nextDate: parsed.nextDate,
      categoryId: parsed.categoryId,
      sourceAccountId: parsed.sourceAccountId,
      targetAccountId: parsed.targetAccountId,
      paymentMethodId: parsed.paymentMethodId,
      note: parsed.note,
      enabled: parsed.enabled,
      updatedAt: nowIso(),
    })
    .where(eq(recurringItems.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/recurring");
  revalidatePath(`/recurring/${id}`);
  redirect("/recurring");
}

export async function deleteRecurringItem(id: string) {
  await db.delete(recurringItems).where(eq(recurringItems.id, id)).run();

  revalidatePath("/");
  revalidatePath("/recurring");
  redirect("/recurring");
}
