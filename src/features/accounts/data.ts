import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts } from "@/db/schema";

export async function listAccounts() {
  return db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.currency), asc(accounts.type), asc(accounts.name));
}

export async function getAccount(id: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);

  return account ?? null;
}
