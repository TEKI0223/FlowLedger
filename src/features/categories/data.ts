import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, quickEntryTemplates, recurringItems, transactions } from "@/db/schema";
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

export async function listCategories(): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.parentId), desc(categories.usageCount), asc(categories.name));
}

export async function listCategoryOptions(): Promise<CategoryOption[]> {
  const rows = await listCategories();
  return buildCategoryOptions(rows);
}

export async function listParentCategoryOptions(excludeId?: string): Promise<CategoryOption[]> {
  const rows = await listCategories();
  if (!excludeId) return buildCategoryOptions(rows);

  const excludedIds = new Set([excludeId, ...getDescendantCategoryIds(rows, excludeId)]);
  return buildCategoryOptions(rows.filter((category) => !excludedIds.has(category.id)));
}

export async function getCategory(id: string): Promise<CategoryWithRefs | null> {
  const rows = await listCategories();
  const category = rows.find((row) => row.id === id);
  if (!category) return null;
  const iconKeyById = buildResolvedCategoryIconKeyMap(rows);

  const [refs] = await db
    .select({
      transactionCount: sql<number>`(
        select count(*)
        from ${transactions}
        where ${transactions.categoryId} = ${category.id}
      )`,
      templateCount: sql<number>`(
        select count(*)
        from ${quickEntryTemplates}
        where ${quickEntryTemplates.categoryId} = ${category.id}
      )`,
      recurringCount: sql<number>`(
        select count(*)
        from ${recurringItems}
        where ${recurringItems.categoryId} = ${category.id}
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

  const rows = await listCategories();
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
