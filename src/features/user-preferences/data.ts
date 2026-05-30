import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { userPreferences } from "@/db/schema";

export async function getUserPreference(
  ownerUserId: string,
  key: string,
): Promise<string | null> {
  const [row] = await db
    .select({ value: userPreferences.value })
    .from(userPreferences)
    .where(and(eq(userPreferences.ownerUserId, ownerUserId), eq(userPreferences.key, key)))
    .limit(1);
  return row?.value ?? null;
}

export async function setUserPreference(
  ownerUserId: string,
  key: string,
  value: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(userPreferences)
    .values({ ownerUserId, key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: [userPreferences.ownerUserId, userPreferences.key],
      set: { value, updatedAt: now },
    });
}
