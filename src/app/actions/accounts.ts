"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts } from "@/db/schema";
import { accountTypes, currencies, parseMoneyToMinor } from "@/domain/finance";
import { nowIso } from "@/lib/dates";

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

function stringField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
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
    return {
      error: result.error.issues[0]?.message ?? "账户内容不完整",
      values,
    };
  }

  const parsed = result.data;
  let balanceMinor: number;

  try {
    balanceMinor = parseMoneyToMinor(parsed.initialBalance ?? "0", parsed.currency);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "初始余额格式不正确",
      values,
    };
  }

  const timestamp = nowIso();

  await db
    .insert(accounts)
    .values({
      id: crypto.randomUUID(),
      name: parsed.name,
      type: parsed.type,
      currency: parsed.currency,
      balanceMinor,
      includeInNetWorth: parsed.includeInNetWorth,
      note: parsed.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/accounts");
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
    return {
      error: result.error.issues[0]?.message ?? "账户内容不完整",
      values,
    };
  }

  const parsed = result.data;

  await db
    .update(accounts)
    .set({
      name: parsed.name,
      type: parsed.type,
      currency: parsed.currency,
      includeInNetWorth: parsed.includeInNetWorth,
      note: parsed.note,
      updatedAt: nowIso(),
    })
    .where(eq(accounts.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  redirect(`/accounts/${id}`);
}
