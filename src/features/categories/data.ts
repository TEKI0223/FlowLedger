import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, quickEntryTemplates, recurringItems, transactions } from "@/db/schema";

export type CategoryRow = typeof categories.$inferSelect;

export type CategoryWithRefs = CategoryRow & {
  transactionCount: number;
  templateCount: number;
  recurringCount: number;
};

export async function listCategories(): Promise<CategoryRow[]> {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.parentId), desc(categories.usageCount), asc(categories.name));
}

export async function listParentCategoryOptions(excludeId?: string): Promise<CategoryRow[]> {
  const rows = await listCategories();
  return rows.filter((category) => category.id !== excludeId);
}

export async function getCategory(id: string): Promise<CategoryWithRefs | null> {
  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!category) return null;

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
  };
}
