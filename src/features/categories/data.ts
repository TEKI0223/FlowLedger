import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, quickEntryTemplates, recurringItems, transactions } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { buildResolvedCategoryIconKeyMap, type CategoryIconKey } from "./icon-utils";

export type CategoryRow = typeof categories.$inferSelect;

export type CategoryOption = {
  id: string;
  name: string;
  label: string;
  level: number;
  usageCount: number;
  iconKey: CategoryIconKey;
};

export type CategoryWithRefs = CategoryRow & {
  transactionCount: number;
  templateCount: number;
  recurringCount: number;
  resolvedIconKey: CategoryIconKey;
};

/**
 * 分类本身是全局共享的（不绑定用户），但 usage_count / last_used_at
 * 按当前登录用户从 transactions 表实时算。category 表上同名的字段已废弃，
 * 不再维护也不再读取（暂留字段，待后续 migration 移除）。
 */
async function getCategoryUsageMap(
  ownerUserId: string,
): Promise<Map<string, { count: number; lastUsedAt: string | null }>> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      count: sql<number>`count(*)`,
      lastUsedAt: sql<string | null>`max(${transactions.occurredOn})`,
    })
    .from(transactions)
    .where(eq(transactions.ownerUserId, ownerUserId))
    .groupBy(transactions.categoryId);

  const map = new Map<string, { count: number; lastUsedAt: string | null }>();
  for (const row of rows) {
    if (row.categoryId) {
      map.set(row.categoryId, { count: row.count, lastUsedAt: row.lastUsedAt });
    }
  }
  return map;
}

/** 加载分类并叠加当前用户的 usage 统计，按 parent + usage DESC + name 排序。 */
export async function listCategories(ownerUserId?: string): Promise<CategoryRow[]> {
  const userId = ownerUserId ?? (await getCurrentUserId());
  const [rawRows, usageMap] = await Promise.all([
    db.select().from(categories),
    getCategoryUsageMap(userId),
  ]);

  const enriched: CategoryRow[] = rawRows.map((row) => {
    const usage = usageMap.get(row.id);
    return {
      ...row,
      usageCount: usage?.count ?? 0,
      lastUsedAt: usage?.lastUsedAt ?? null,
    };
  });

  enriched.sort((a, b) => {
    const parentA = a.parentId ?? "";
    const parentB = b.parentId ?? "";
    if (parentA !== parentB) return parentA < parentB ? -1 : 1;
    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
    return a.name.localeCompare(b.name, "zh-Hans");
  });

  return enriched;
}

export async function listCategoryOptions(ownerUserId?: string): Promise<CategoryOption[]> {
  const rows = await listCategories(ownerUserId);
  return buildCategoryOptions(rows);
}

export async function listParentCategoryOptions(
  excludeId?: string,
  ownerUserId?: string,
): Promise<CategoryOption[]> {
  const rows = await listCategories(ownerUserId);
  if (!excludeId) return buildCategoryOptions(rows);

  const excludedIds = new Set([excludeId, ...getDescendantCategoryIds(rows, excludeId)]);
  return buildCategoryOptions(rows.filter((category) => !excludedIds.has(category.id)));
}

export async function getCategory(
  id: string,
  ownerUserId?: string,
): Promise<CategoryWithRefs | null> {
  const userId = ownerUserId ?? (await getCurrentUserId());
  const rows = await listCategories(userId);
  const category = rows.find((row) => row.id === id);
  if (!category) return null;
  const iconKeyById = buildResolvedCategoryIconKeyMap(rows);

  // 引用统计也按当前用户过滤：交易看自己的，模板和周期项本来就是用户级。
  const [refs] = await db
    .select({
      transactionCount: sql<number>`(
        select count(*)
        from ${transactions}
        where ${transactions.categoryId} = ${category.id}
          and ${transactions.ownerUserId} = ${userId}
      )`,
      templateCount: sql<number>`(
        select count(*)
        from ${quickEntryTemplates}
        where ${quickEntryTemplates.categoryId} = ${category.id}
          and ${quickEntryTemplates.ownerUserId} = ${userId}
      )`,
      recurringCount: sql<number>`(
        select count(*)
        from ${recurringItems}
        where ${recurringItems.categoryId} = ${category.id}
          and ${recurringItems.ownerUserId} = ${userId}
      )`,
    })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return {
    ...category,
    transactionCount: refs?.transactionCount ?? 0,
    templateCount: refs?.templateCount ?? 0,
    recurringCount: refs?.recurringCount ?? 0,
    resolvedIconKey: iconKeyById.get(category.id) ?? "other",
  };
}

export async function wouldCreateCategoryCycle(
  categoryId: string,
  parentId: string | undefined,
): Promise<boolean> {
  if (!parentId) return false;
  if (parentId === categoryId) return true;

  // 只需要 id/parentId 做树遍历，跳过 listCategories 的 usage 叠加。
  const rows = await db.select().from(categories);
  const categoryById = new Map(rows.map((category) => [category.id, category]));
  let current = categoryById.get(parentId);
  const visited = new Set<string>();

  while (current) {
    if (current.id === categoryId) return true;
    if (visited.has(current.id)) return true;
    visited.add(current.id);
    current = current.parentId ? categoryById.get(current.parentId) : undefined;
  }

  return false;
}

function getDescendantCategoryIds(rows: CategoryRow[], parentId: string): string[] {
  const childrenByParent = new Map<string, CategoryRow[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const children = childrenByParent.get(row.parentId) ?? [];
    children.push(row);
    childrenByParent.set(row.parentId, children);
  }

  const descendants: string[] = [];
  const stack = [...(childrenByParent.get(parentId) ?? [])];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    descendants.push(current.id);
    stack.push(...(childrenByParent.get(current.id) ?? []));
  }

  return descendants;
}

export function buildCategoryOptions(rows: CategoryRow[]): CategoryOption[] {
  const ids = new Set(rows.map((category) => category.id));
  const iconKeyById = buildResolvedCategoryIconKeyMap(rows);
  const childrenByParent = new Map<string, CategoryRow[]>();
  const roots: CategoryRow[] = [];

  for (const category of rows) {
    if (category.parentId && ids.has(category.parentId)) {
      const children = childrenByParent.get(category.parentId) ?? [];
      children.push(category);
      childrenByParent.set(category.parentId, children);
    } else {
      roots.push(category);
    }
  }

  const sortSiblings = (items: CategoryRow[]) =>
    [...items].sort((a, b) => {
      const usageDiff = b.usageCount - a.usageCount;
      if (usageDiff !== 0) return usageDiff;
      return a.name.localeCompare(b.name, "zh-Hans");
    });

  for (const [parentId, children] of childrenByParent) {
    childrenByParent.set(parentId, sortSiblings(children));
  }

  const options: CategoryOption[] = [];

  function walk(category: CategoryRow, path: string[], level: number, visited: Set<string>) {
    if (visited.has(category.id)) return;

    const nextPath = [...path, category.name];
    options.push({
      id: category.id,
      name: category.name,
      label: nextPath.join("/"),
      level,
      usageCount: category.usageCount,
      iconKey: iconKeyById.get(category.id) ?? "other",
    });

    const nextVisited = new Set(visited);
    nextVisited.add(category.id);
    for (const child of childrenByParent.get(category.id) ?? []) {
      walk(child, nextPath, level + 1, nextVisited);
    }
  }

  for (const root of sortSiblings(roots)) {
    walk(root, [], 0, new Set());
  }

  return options;
}

export function buildCategoryPathLabelMap(rows: CategoryRow[]): Map<string, string> {
  return new Map(buildCategoryOptions(rows).map((category) => [category.id, category.label]));
}
