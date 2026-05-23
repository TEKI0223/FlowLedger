"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { installmentPlans, transactions } from "@/db/schema";
import { currencies, parseMoneyToMinor } from "@/domain/finance";
import { computeInstallmentStatus } from "@/domain/installment";
import { nowIso } from "@/lib/dates";

const installmentSchema = z.object({
  totalAmount: z.string().trim().min(1, "请输入总金额"),
  currency: z.enum(currencies),
  periods: z.coerce.number().int().min(2, "期数至少 2"),
  amountPerPeriod: z.string().trim().min(1, "请输入每期金额"),
  firstPaymentOn: z.string().trim().min(1, "请选择首期扣款日期"),
});

export type InstallmentFormValues = {
  totalAmount?: string;
  currency?: string;
  periods?: string;
  amountPerPeriod?: string;
  firstPaymentOn?: string;
};

export type InstallmentActionState = {
  error?: string;
  values?: InstallmentFormValues;
};

function field(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function extract(formData: FormData): InstallmentFormValues {
  return {
    totalAmount: field(formData, "totalAmount"),
    currency: field(formData, "currency"),
    periods: field(formData, "periods"),
    amountPerPeriod: field(formData, "amountPerPeriod"),
    firstPaymentOn: field(formData, "firstPaymentOn"),
  };
}

export async function createInstallmentPlan(
  originalTransactionId: string,
  _prev: InstallmentActionState,
  formData: FormData,
): Promise<InstallmentActionState> {
  const values = extract(formData);

  const result = installmentSchema.safeParse({
    totalAmount: values.totalAmount,
    currency: values.currency,
    periods: values.periods,
    amountPerPeriod: values.amountPerPeriod,
    firstPaymentOn: values.firstPaymentOn,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "分期内容不完整", values };
  }

  const parsed = result.data;

  let totalAmountMinor: number;
  let amountPerPeriodMinor: number;

  try {
    totalAmountMinor = Math.abs(parseMoneyToMinor(parsed.totalAmount, parsed.currency));
    amountPerPeriodMinor = Math.abs(parseMoneyToMinor(parsed.amountPerPeriod, parsed.currency));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "金额格式不正确", values };
  }

  if (totalAmountMinor === 0 || amountPerPeriodMinor === 0) {
    return { error: "金额不能为 0", values };
  }

  // 校验原始交易
  const [originalTx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, originalTransactionId))
    .limit(1);

  if (!originalTx) {
    return { error: "原始交易不存在", values };
  }

  if (originalTx.currency !== parsed.currency) {
    return { error: "分期币种必须与原始交易一致", values };
  }

  // 利息 / 手续费 = 期数 × 每期金额 − 总金额，自动派生
  const feeAmountMinor = parsed.periods * amountPerPeriodMinor - totalAmountMinor;

  const timestamp = nowIso();

  db.insert(installmentPlans)
    .values({
      id: crypto.randomUUID(),
      originalTransactionId,
      totalAmountMinor,
      currency: parsed.currency,
      periods: parsed.periods,
      amountPerPeriodMinor,
      firstPaymentOn: parsed.firstPaymentOn,
      completedPeriods: 0,
      status: "active",
      feeAmountMinor,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/installments");
  revalidatePath(`/transactions/${originalTransactionId}`);
  redirect("/installments");
}

export async function updateInstallmentPlan(
  id: string,
  _prev: InstallmentActionState,
  formData: FormData,
): Promise<InstallmentActionState> {
  const values = extract(formData);

  const result = installmentSchema.safeParse({
    totalAmount: values.totalAmount,
    currency: values.currency,
    periods: values.periods,
    amountPerPeriod: values.amountPerPeriod,
    firstPaymentOn: values.firstPaymentOn,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "分期内容不完整", values };
  }

  const parsed = result.data;
  let totalAmountMinor: number;
  let amountPerPeriodMinor: number;

  try {
    totalAmountMinor = Math.abs(parseMoneyToMinor(parsed.totalAmount, parsed.currency));
    amountPerPeriodMinor = Math.abs(parseMoneyToMinor(parsed.amountPerPeriod, parsed.currency));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "金额格式不正确", values };
  }

  const feeAmountMinor = parsed.periods * amountPerPeriodMinor - totalAmountMinor;

  const [existing] = await db
    .select()
    .from(installmentPlans)
    .where(eq(installmentPlans.id, id))
    .limit(1);

  if (!existing) {
    return { error: "分期计划不存在", values };
  }

  if (parsed.periods < existing.completedPeriods) {
    return { error: `期数不能小于已完成期数 ${existing.completedPeriods}`, values };
  }

  const newStatus = computeInstallmentStatus(
    existing.completedPeriods,
    parsed.periods,
    existing.status === "cancelled",
  );

  await db
    .update(installmentPlans)
    .set({
      totalAmountMinor,
      currency: parsed.currency,
      periods: parsed.periods,
      amountPerPeriodMinor,
      firstPaymentOn: parsed.firstPaymentOn,
      feeAmountMinor,
      status: newStatus,
      updatedAt: nowIso(),
    })
    .where(eq(installmentPlans.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/installments");
  revalidatePath(`/installments/${id}`);
  redirect(`/installments/${id}`);
}

export async function markInstallmentPeriodPaid(id: string) {
  const [existing] = await db
    .select()
    .from(installmentPlans)
    .where(eq(installmentPlans.id, id))
    .limit(1);

  if (!existing) return;
  if (existing.status === "cancelled") return;
  if (existing.completedPeriods >= existing.periods) return;

  const newCompleted = existing.completedPeriods + 1;
  const newStatus = computeInstallmentStatus(newCompleted, existing.periods, false);

  await db
    .update(installmentPlans)
    .set({
      completedPeriods: newCompleted,
      status: newStatus,
      updatedAt: nowIso(),
    })
    .where(eq(installmentPlans.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/installments");
  revalidatePath(`/installments/${id}`);
  redirect(`/installments/${id}`);
}

export async function unmarkInstallmentPeriodPaid(id: string) {
  const [existing] = await db
    .select()
    .from(installmentPlans)
    .where(eq(installmentPlans.id, id))
    .limit(1);

  if (!existing) return;
  if (existing.completedPeriods === 0) return;

  const newCompleted = existing.completedPeriods - 1;
  const newStatus = computeInstallmentStatus(
    newCompleted,
    existing.periods,
    existing.status === "cancelled",
  );

  await db
    .update(installmentPlans)
    .set({
      completedPeriods: newCompleted,
      status: newStatus,
      updatedAt: nowIso(),
    })
    .where(eq(installmentPlans.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/installments");
  revalidatePath(`/installments/${id}`);
  redirect(`/installments/${id}`);
}

export async function cancelInstallmentPlan(id: string) {
  await db
    .update(installmentPlans)
    .set({ status: "cancelled", updatedAt: nowIso() })
    .where(eq(installmentPlans.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/installments");
  revalidatePath(`/installments/${id}`);
  redirect(`/installments/${id}`);
}

export async function reopenInstallmentPlan(id: string) {
  const [existing] = await db
    .select()
    .from(installmentPlans)
    .where(eq(installmentPlans.id, id))
    .limit(1);

  if (!existing) return;

  const status = computeInstallmentStatus(existing.completedPeriods, existing.periods, false);

  await db
    .update(installmentPlans)
    .set({ status, updatedAt: nowIso() })
    .where(eq(installmentPlans.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/installments");
  revalidatePath(`/installments/${id}`);
  redirect(`/installments/${id}`);
}

export async function deleteInstallmentPlan(id: string) {
  await db.delete(installmentPlans).where(eq(installmentPlans.id, id)).run();
  revalidatePath("/");
  revalidatePath("/installments");
  redirect("/installments");
}
