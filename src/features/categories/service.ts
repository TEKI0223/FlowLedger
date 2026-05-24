import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, quickEntryTemplates, recurringItems, transactions } from "@/db/schema";
import { nowIso } from "@/lib/dates";
import { defaultCategoryIconKey, resolveCategoryIconKey, type CategoryIconKey } from "./icon-utils";

export type CategoryInput = {
  name: string;
  parentId?: string;
  iconKey?: CategoryIconKey;
};

export async function createCategoryRecord(input: CategoryInput): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = nowIso();
  const iconKey = await defaultIconKeyForNewCategory(input);

  await db
    .insert(categories)
    .values({
      id,
      name: input.name,
      parentId: input.parentId,
      iconKey,
      usageCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return id;
}

async function defaultIconKeyForNewCategory(input: CategoryInput): Promise<CategoryIconKey> {
  if (input.iconKey) return input.iconKey;
  if (!input.parentId) return defaultCategoryIconKey;

  const categoryRows = await db.select().from(categories);
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));

  return resolveCategoryIconKey(categoryById.get(input.parentId), categoryById);
}

export async function updateCategoryRecord(id: string, input: CategoryInput): Promise<void> {
  await db
    .update(categories)
    .set({
      name: input.name,
      parentId: input.parentId,
      updatedAt: nowIso(),
    })
    .where(eq(categories.id, id))
    .run();
}

export async function deleteCategoryRecord(id: string): Promise<DeleteCategoryResult> {
  const refs = await getCategoryReferenceCounts(id);
  if (refs.children > 0) return { ok: false, error: "请先移除或调整它的子分类" };
  if (refs.transactions > 0) return { ok: false, error: "已有交易使用该分类，不能删除" };
  if (refs.templates > 0) return { ok: false, error: "已有快捷模板使用该分类，不能删除" };
  if (refs.recurring > 0) return { ok: false, error: "已有周期项目使用该分类，不能删除" };

  await db.delete(categories).where(eq(categories.id, id)).run();
  return { ok: true };
}

type DeleteCategoryResult = { ok: true } | { ok: false; error: string };

async function getCategoryReferenceCounts(id: string) {
  const [counts] = await db
    .select({
      children: sql<number>`(
        select count(*)
        from ${categories} as child
        where child.parent_id = ${id}
      )`,
      transactions: sql<number>`(
        select count(*)
        from ${transactions}
        where ${transactions.categoryId} = ${id}
      )`,
      templates: sql<number>`(
        select count(*)
        from ${quickEntryTemplates}
        where ${quickEntryTemplates.categoryId} = ${id}
      )`,
      recurring: sql<number>`(
        select count(*)
        from ${recurringItems}
        where ${recurringItems.categoryId} = ${id}
      )`,
    })
    .from(categories)
    .limit(1);

  return {
    children: counts?.children ?? 0,
    transactions: counts?.transactions ?? 0,
    templates: counts?.templates ?? 0,
    recurring: counts?.recurring ?? 0,
  };
}
