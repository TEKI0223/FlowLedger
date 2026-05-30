import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods, recurringItems } from "@/db/schema";
import { getEffectiveRecurringDate, type DateShiftPolicy } from "@/domain/date-shift";
import {
  buildResolvedCategoryIconKeyMap,
  type CategoryIconKey,
} from "@/features/categories/icon-utils";
import { getCurrentUserId } from "@/lib/auth";
import { addDays, todayIsoDate } from "@/lib/dates";

type RecurringItemRow = typeof recurringItems.$inferSelect;

type HydratedCategory = typeof categories.$inferSelect & {
  resolvedIconKey: CategoryIconKey;
};

export type HydratedRecurringItem = RecurringItemRow & {
  category: HydratedCategory | null;
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

// 调整方向最多把名义日期提前几天，所以查询时多取一段缓冲，再在代码里按调整后日期复筛。
const PENDING_LOOKAHEAD_DAYS = 14;

function isPendingByEffectiveDate(
  row: {
    type: "income" | "expense" | "transfer";
    nextDate: string;
    dateShiftPolicy: DateShiftPolicy;
  },
  today: string,
): boolean {
  return getEffectiveRecurringDate(row) <= today;
}

export async function listPendingRecurringItems(
  today: string = todayIsoDate(),
): Promise<HydratedRecurringItem[]> {
  const ownerUserId = await getCurrentUserId();
  const cutoff = addDays(today, PENDING_LOOKAHEAD_DAYS);
  const rows = await db
    .select()
    .from(recurringItems)
    .where(
      and(
        eq(recurringItems.enabled, true),
        eq(recurringItems.ownerUserId, ownerUserId),
        lte(recurringItems.nextDate, cutoff),
      ),
    )
    .orderBy(asc(recurringItems.nextDate));

  const pending = rows.filter((row) => isPendingByEffectiveDate(row, today));
  return hydrate(pending);
}

export async function countPendingRecurringItems(today: string = todayIsoDate()): Promise<number> {
  const ownerUserId = await getCurrentUserId();
  const cutoff = addDays(today, PENDING_LOOKAHEAD_DAYS);
  const rows = await db
    .select({
      type: recurringItems.type,
      nextDate: recurringItems.nextDate,
      dateShiftPolicy: recurringItems.dateShiftPolicy,
    })
    .from(recurringItems)
    .where(
      and(
        eq(recurringItems.enabled, true),
        eq(recurringItems.ownerUserId, ownerUserId),
        lte(recurringItems.nextDate, cutoff),
      ),
    );

  return rows.filter((row) => isPendingByEffectiveDate(row, today)).length;
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

  // 分类要全表抓：图标继承需要沿 parentId 一路找到祖先节点。
  // 仅按 categoryId in (...) 抓的话，层级 ≥ 3 的子分类无法继承上层 icon。
  const [accountRows, categoryRows, paymentMethodRows] = await Promise.all([
    accountIds.size > 0
      ? db
          .select()
          .from(accounts)
          .where(and(inArray(accounts.id, [...accountIds]), eq(accounts.ownerUserId, ownerUserId)))
      : [],
    categoryIds.size > 0 ? db.select().from(categories) : [],
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
  const resolvedIconKeyById = buildResolvedCategoryIconKeyMap(categoryRows);
  const paymentMethodById = new Map(
    paymentMethodRows.map((paymentMethod) => [paymentMethod.id, paymentMethod]),
  );

  function hydrateCategory(id: string | null): HydratedCategory | null {
    if (!id) return null;
    const row = categoryById.get(id);
    if (!row) return null;
    return { ...row, resolvedIconKey: resolvedIconKeyById.get(id) ?? "other" };
  }

  return rows.map((item) => ({
    ...item,
    category: hydrateCategory(item.categoryId),
    sourceAccount: item.sourceAccountId ? (accountById.get(item.sourceAccountId) ?? null) : null,
    targetAccount: item.targetAccountId ? (accountById.get(item.targetAccountId) ?? null) : null,
    paymentMethod: item.paymentMethodId
      ? (paymentMethodById.get(item.paymentMethodId) ?? null)
      : null,
  }));
}
