"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { accountTypes, currencies } from "@/domain/finance";
import { createAccountRecord, updateAccountRecord } from "@/features/accounts/service";
import { parseAmount, stringField } from "@/lib/form";
import { accountPaths, revalidatePaths } from "@/lib/revalidate";

const accountSchema = z.object({
  name: z.string().trim().min(1, "请输入账户名称"),
  type: z.enum(accountTypes),
  currency: z.enum(currencies),
  includeInNetWorth: z.boolean(),
  initialBalance: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type AccountFormValues = {
  name?: string;
  type?: string;
  currency?: string;
  includeInNetWorth?: boolean;
  initialBalance?: string;
  note?: string;
};

export type AccountActionState = {
  error?: string;
  values?: AccountFormValues;
};

function extractValues(formData: FormData): AccountFormValues {
  return {
    name: stringField(formData, "name"),
    type: stringField(formData, "type"),
    currency: stringField(formData, "currency"),
    includeInNetWorth: formData.get("includeInNetWorth") === "on",
    initialBalance: stringField(formData, "initialBalance"),
    note: stringField(formData, "note"),
  };
}

export async function createAccount(
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const values = extractValues(formData);

  const result = accountSchema.safeParse({
    name: values.name,
    type: values.type,
    currency: values.currency,
    includeInNetWorth: values.includeInNetWorth,
    initialBalance: values.initialBalance || "0",
    note: values.note || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "账户内容不完整", values };
  }

  const parsed = result.data;
  const amount = parseAmount(parsed.initialBalance ?? "0", parsed.currency);
  if (!amount.ok) {
    return { error: amount.error, values };
  }

  await createAccountRecord({
    name: parsed.name,
    type: parsed.type,
    currency: parsed.currency,
    balanceMinor: amount.amountMinor,
    includeInNetWorth: parsed.includeInNetWorth,
    note: parsed.note,
  });

  revalidatePaths(accountPaths());
  redirect("/accounts");
}

export async function updateAccount(
  id: string,
  _prev: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const values = extractValues(formData);

  const result = accountSchema.omit({ initialBalance: true }).safeParse({
    name: values.name,
    type: values.type,
    currency: values.currency,
    includeInNetWorth: values.includeInNetWorth,
    note: values.note || undefined,
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "账户内容不完整", values };
  }

  const parsed = result.data;

  await updateAccountRecord(id, {
    name: parsed.name,
    type: parsed.type,
    currency: parsed.currency,
    includeInNetWorth: parsed.includeInNetWorth,
    note: parsed.note,
  });

  revalidatePaths(accountPaths(id));
  redirect(`/accounts/${id}`);
}
