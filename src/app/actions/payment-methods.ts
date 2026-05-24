"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { currencies, paymentMethodTypes } from "@/domain/finance";
import { getAccount } from "@/features/accounts/data";
import { getPaymentMethod } from "@/features/payment-methods/data";
import {
  createPaymentMethodRecord,
  deletePaymentMethodRecord,
  updatePaymentMethodRecord,
} from "@/features/payment-methods/service";
import { normalize, stringField } from "@/lib/form";
import { paymentMethodPaths, revalidatePaths } from "@/lib/revalidate";

const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, "请输入支付方式名称"),
  type: z.enum(paymentMethodTypes),
  currency: z.enum(currencies),
  defaultAccountId: z.string().trim().optional(),
  enabled: z.boolean(),
  note: z.string().trim().optional(),
});

export type PaymentMethodFormValues = {
  name?: string;
  type?: string;
  currency?: string;
  defaultAccountId?: string;
  enabled?: boolean;
  note?: string;
};

export type PaymentMethodActionState = {
  error?: string;
  values?: PaymentMethodFormValues;
};

function extractValues(formData: FormData): PaymentMethodFormValues {
  return {
    name: stringField(formData, "name"),
    type: stringField(formData, "type"),
    currency: stringField(formData, "currency"),
    defaultAccountId: stringField(formData, "defaultAccountId"),
    enabled: formData.get("enabled") === "on",
    note: stringField(formData, "note"),
  };
}

export async function createPaymentMethod(
  _prev: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  const values = extractValues(formData);
  const result = paymentMethodSchema.safeParse({
    name: values.name,
    type: values.type,
    currency: values.currency,
    defaultAccountId: normalize(values.defaultAccountId),
    enabled: values.enabled,
    note: values.note || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "支付方式内容不完整", values };
  }

  const accountError = await validateDefaultAccountCurrency(
    result.data.defaultAccountId,
    result.data.currency,
  );
  if (accountError) {
    return { error: accountError, values };
  }

  const id = await createPaymentMethodRecord(result.data);
  revalidatePaths(paymentMethodPaths(id));
  redirect("/manage/payment-methods");
}

export async function updatePaymentMethod(
  id: string,
  _prev: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  const values = extractValues(formData);
  const result = paymentMethodSchema.safeParse({
    name: values.name,
    type: values.type,
    currency: values.currency,
    defaultAccountId: normalize(values.defaultAccountId),
    enabled: values.enabled,
    note: values.note || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "支付方式内容不完整", values };
  }

  const accountError = await validateDefaultAccountCurrency(
    result.data.defaultAccountId,
    result.data.currency,
  );
  if (accountError) {
    return { error: accountError, values };
  }

  await updatePaymentMethodRecord(id, result.data);
  revalidatePaths(paymentMethodPaths(id));
  redirect("/manage/payment-methods");
}

export async function deletePaymentMethod(id: string) {
  const paymentMethod = await getPaymentMethod(id);
  if (!paymentMethod) redirect("/manage/payment-methods");

  const result = await deletePaymentMethodRecord(id);
  revalidatePaths(paymentMethodPaths(id));

  if (!result.ok) {
    redirect(`/manage/payment-methods/${id}?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/manage/payment-methods");
}

async function validateDefaultAccountCurrency(
  defaultAccountId: string | undefined,
  currency: string,
) {
  if (!defaultAccountId) return null;

  const account = await getAccount(defaultAccountId);
  if (!account) return "默认资金来源账户不存在";
  if (account.currency !== currency) return "默认资金来源账户币种必须和支付方式默认币种一致";

  return null;
}
