"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currencies, parseMoneyToMinor } from "@/domain/finance";
import { getCreditCard } from "@/features/credit-cards/data";
import {
  createCreditCardRecord,
  deleteCreditCardRecord,
  updateCreditCardRecord,
} from "@/features/credit-cards/service";
import { normalize, stringField } from "@/lib/form";
import { creditCardPaths, revalidatePaths } from "@/lib/revalidate";

const creditCardSchema = z.object({
  name: z.string().trim().min(1, "请输入信用卡名称"),
  lastDigits: z.string().trim().max(8, "尾号最多 8 个字符").optional(),
  currency: z.enum(currencies),
  currentDebt: z.string().trim().optional(),
  closingDay: z.coerce
    .number()
    .int()
    .min(1, "账单日必须在 1-31 之间")
    .max(31, "账单日必须在 1-31 之间"),
  paymentDay: z.coerce
    .number()
    .int()
    .min(1, "扣款日必须在 1-31 之间")
    .max(31, "扣款日必须在 1-31 之间"),
  cycleBoundary: z.enum(["inclusive", "exclusive"]),
  repaymentAccountId: z.string().trim().optional(),
  enabled: z.boolean(),
  note: z.string().trim().optional(),
});

export type CreditCardFormValues = {
  name?: string;
  lastDigits?: string;
  currency?: string;
  currentDebt?: string;
  closingDay?: string;
  paymentDay?: string;
  cycleBoundary?: string;
  repaymentAccountId?: string;
  enabled?: boolean;
  note?: string;
};

export type CreditCardActionState = {
  error?: string;
  values?: CreditCardFormValues;
};

function extract(formData: FormData): CreditCardFormValues {
  return {
    name: stringField(formData, "name"),
    lastDigits: stringField(formData, "lastDigits"),
    currency: stringField(formData, "currency"),
    currentDebt: stringField(formData, "currentDebt"),
    closingDay: stringField(formData, "closingDay"),
    paymentDay: stringField(formData, "paymentDay"),
    cycleBoundary: stringField(formData, "cycleBoundary"),
    repaymentAccountId: stringField(formData, "repaymentAccountId"),
    enabled: formData.get("enabled") === "on",
    note: stringField(formData, "note"),
  };
}

export async function createCreditCard(
  _prev: CreditCardActionState,
  formData: FormData,
): Promise<CreditCardActionState> {
  const values = extract(formData);
  const result = creditCardSchema.safeParse({
    ...values,
    lastDigits: values.lastDigits || undefined,
    repaymentAccountId: normalize(values.repaymentAccountId),
    note: values.note || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "信用卡内容不完整", values };
  }

  const parsed = result.data;
  const balanceResult = parseDebtToBalanceMinor(parsed.currentDebt, parsed.currency);
  if (!balanceResult.ok) {
    return { error: balanceResult.error, values };
  }

  const id = await createCreditCardRecord({
    name: parsed.name,
    lastDigits: parsed.lastDigits,
    currency: parsed.currency,
    balanceMinor: balanceResult.balanceMinor,
    closingDay: parsed.closingDay,
    paymentDay: parsed.paymentDay,
    cycleBoundary: parsed.cycleBoundary,
    repaymentAccountId: parsed.repaymentAccountId,
    enabled: parsed.enabled,
    note: parsed.note,
  });

  revalidatePaths(creditCardPaths(id));
  redirect(`/credit-cards/${id}`);
}

export async function updateCreditCard(
  id: string,
  _prev: CreditCardActionState,
  formData: FormData,
): Promise<CreditCardActionState> {
  const card = await getCreditCard(id);
  if (!card) redirect("/credit-cards");

  const values = extract(formData);
  const result = creditCardSchema.safeParse({
    ...values,
    lastDigits: values.lastDigits || undefined,
    repaymentAccountId: normalize(values.repaymentAccountId),
    note: values.note || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "信用卡内容不完整", values };
  }

  const parsed = result.data;
  const balanceResult = parseDebtToBalanceMinor(parsed.currentDebt, parsed.currency);
  if (!balanceResult.ok) {
    return { error: balanceResult.error, values };
  }

  await updateCreditCardRecord(id, card.accountId, {
    name: parsed.name,
    lastDigits: parsed.lastDigits,
    currency: parsed.currency,
    balanceMinor: balanceResult.balanceMinor,
    closingDay: parsed.closingDay,
    paymentDay: parsed.paymentDay,
    cycleBoundary: parsed.cycleBoundary,
    repaymentAccountId: parsed.repaymentAccountId,
    enabled: parsed.enabled,
    note: parsed.note,
  });

  revalidatePaths(creditCardPaths(id, card.accountId));
  redirect(`/credit-cards/${id}`);
}

export async function deleteCreditCard(id: string) {
  const card = await getCreditCard(id);
  if (!card) redirect("/credit-cards");

  const result = await deleteCreditCardRecord(id, card.accountId);
  revalidatePaths(creditCardPaths(id, card.accountId));

  if (!result.ok) {
    redirect(`/credit-cards/${id}?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/credit-cards");
}

function parseDebtToBalanceMinor(
  raw: string | undefined,
  currency: "JPY" | "CNY",
): { ok: true; balanceMinor: number } | { ok: false; error: string } {
  if (!raw || raw.trim() === "") return { ok: true, balanceMinor: 0 };

  try {
    return { ok: true, balanceMinor: -Math.abs(parseMoneyToMinor(raw, currency)) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "当前欠款格式不正确",
    };
  }
}
