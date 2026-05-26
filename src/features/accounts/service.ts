import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts } from "@/db/schema";
import type { AccountType, Currency } from "@/domain/finance";
import { getCurrentUserId } from "@/lib/auth";
import { nowIso } from "@/lib/dates";

export type CreateAccountInput = {
  name: string;
  lastDigits?: string;
  type: AccountType;
  currency: Currency;
  balanceMinor: number;
  includeInNetWorth: boolean;
  note?: string;
};

export async function createAccountRecord(input: CreateAccountInput): Promise<string> {
  const ownerUserId = await getCurrentUserId();
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  await db
    .insert(accounts)
    .values({
      id,
      ownerUserId,
      name: input.name,
      lastDigits: input.lastDigits,
      type: input.type,
      currency: input.currency,
      balanceMinor: input.balanceMinor,
      includeInNetWorth: input.includeInNetWorth,
      note: input.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return id;
}

export type UpdateAccountInput = {
  name: string;
  lastDigits?: string;
  type: AccountType;
  currency: Currency;
  includeInNetWorth: boolean;
  note?: string;
};

export async function updateAccountRecord(id: string, input: UpdateAccountInput): Promise<void> {
  const ownerUserId = await getCurrentUserId();
  await db
    .update(accounts)
    .set({
      name: input.name,
      lastDigits: input.lastDigits,
      type: input.type,
      currency: input.currency,
      includeInNetWorth: input.includeInNetWorth,
      note: input.note,
      updatedAt: nowIso(),
    })
    .where(and(eq(accounts.id, id), eq(accounts.ownerUserId, ownerUserId)))
    .run();
}
