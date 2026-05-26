import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods, recurringItems } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { todayIsoDate } from "@/lib/dates";

type RecurringItemRow = typeof recurringItems.$inferSelect;

export type HydratedRecurringItem = RecurringItemRow & {
  category: typeof categories.$inferSelect | null;
  sourceAccount: typeof accounts.$inferSelect | null;
  targetAccount: typeof accounts.$inferSelect | null;
  paymentMethod: typeof paymentMethods.$inferSelect | null;
};

export async function listRecurringItems(): Promise<HydratedRecurringItem[]> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(recurringItems)
    .where(eq(recurringItems.ownerUserId, ownerUserId))
    .orderBy(asc(recurringItems.nextDate));
  return hydrate(rows);
}

export async function getRecurringItem(id: string): Promise<HydratedRecurringItem | null> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(recurringItems)
    .where(and(eq(recurringItems.id, id), eq(recurringItems.ownerUserId, ownerUserId)))
    .limit(1);
  const [item] = await hydrate(rows);
  return item ?? null;
}

export async function listPendingRecurringItems(
  today: string = todayIsoDate(),
): Promise<HydratedRecurringItem[]> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(recurringItems)
    .where(
      and(
        eq(recurringItems.enabled, true),
        eq(recurringItems.ownerUserId, ownerUserId),
        lte(recurringItems.nextDate, today),
      ),
    )
    .orderBy(asc(recurringItems.nextDate));

  return hydrate(rows);
}

export async function countPendingRecurringItems(today: string = todayIsoDate()): Promise<number> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select({ id: recurringItems.id })
    .from(recurringItems)
    .where(
      and(
        eq(recurringItems.enabled, true),
        eq(recurringItems.ownerUserId, ownerUserId),
        lte(recurringItems.nextDate, today),
      ),
    );

  return rows.length;
}

async function hydrate(rows: RecurringItemRow[]): Promise<HydratedRecurringItem[]> {
  const ownerUserId = await getCurrentUserId();
  const accountIds = new Set<string>();
  const categoryIds = new Set<string>();
  const paymentMethodIds = new Set<string>();

  for (const item of rows) {
    if (item.sourceAccountId) accountIds.add(item.sourceAccountId);
    if (item.targetAccountId) accountIds.add(item.targetAccountId);
    if (item.categoryId) categoryIds.add(item.categoryId);
    if (item.paymentMethodId) paymentMethodIds.add(item.paymentMethodId);
  }

  const [accountRows, categoryRows, paymentMethodRows] = await Promise.all([
    accountIds.size > 0
      ? db
          .select()
          .from(accounts)
          .where(and(inArray(accounts.id, [...accountIds]), eq(accounts.ownerUserId, ownerUserId)))
      : [],
    categoryIds.size > 0
      ? db
          .select()
          .from(categories)
          .where(inArray(categories.id, [...categoryIds]))
      : [],
    paymentMethodIds.size > 0
      ? db
          .select()
          .from(paymentMethods)
          .where(
            and(
              inArray(paymentMethods.id, [...paymentMethodIds]),
              eq(paymentMethods.ownerUserId, ownerUserId),
            ),
          )
      : [],
  ]);

  const accountById = new Map(accountRows.map((account) => [account.id, account]));
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const paymentMethodById = new Map(
    paymentMethodRows.map((paymentMethod) => [paymentMethod.id, paymentMethod]),
  );

  return rows.map((item) => ({
    ...item,
    category: item.categoryId ? (categoryById.get(item.categoryId) ?? null) : null,
    sourceAccount: item.sourceAccountId ? (accountById.get(item.sourceAccountId) ?? null) : null,
    targetAccount: item.targetAccountId ? (accountById.get(item.targetAccountId) ?? null) : null,
    paymentMethod: item.paymentMethodId
      ? (paymentMethodById.get(item.paymentMethodId) ?? null)
      : null,
  }));
}
