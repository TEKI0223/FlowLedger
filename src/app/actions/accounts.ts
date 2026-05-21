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
  note: z.string().trim().optional()
});

export async function createAccount(formData: FormData) {
  const result = accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency"),
    includeInNetWorth: formData.get("includeInNetWorth") === "on",
    initialBalance: formData.get("initialBalance") || "0",
    note: formData.get("note") || undefined
  });

  if (!result.success) {
    redirectWithError("/accounts", result.error.issues[0]?.message ?? "账户内容不完整");
  }

  const parsed = result.data;
  const timestamp = nowIso();
  let balanceMinor: number;

  try {
    balanceMinor = parseMoneyToMinor(parsed.initialBalance ?? "0", parsed.currency);
  } catch (error) {
    redirectWithError("/accounts", error instanceof Error ? error.message : "初始余额格式不正确");
  }

  db.insert(accounts).values({
    id: crypto.randomUUID(),
    name: parsed.name,
    type: parsed.type,
    currency: parsed.currency,
    balanceMinor,
    includeInNetWorth: parsed.includeInNetWorth,
    note: parsed.note,
    createdAt: timestamp,
    updatedAt: timestamp
  }).run();

  revalidatePath("/");
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function updateAccount(id: string, formData: FormData) {
  const result = accountSchema.omit({ initialBalance: true }).safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency"),
    includeInNetWorth: formData.get("includeInNetWorth") === "on",
    note: formData.get("note") || undefined
  });

  if (!result.success) {
    redirectWithError(`/accounts/${id}`, result.error.issues[0]?.message ?? "账户内容不完整");
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
      updatedAt: nowIso()
    })
    .where(eq(accounts.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  redirect("/accounts");
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
