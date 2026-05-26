import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods, quickEntryTemplates } from "@/db/schema";
import { buildCategoryPathLabelMap } from "@/features/categories/data";
import {
  buildResolvedCategoryIconKeyMap,
  type CategoryIconKey,
} from "@/features/categories/icon-utils";
import { getCurrentUserId } from "@/lib/auth";

type QuickEntryTemplateRow = typeof quickEntryTemplates.$inferSelect;

export type HydratedQuickEntryTemplate = QuickEntryTemplateRow & {
  category:
    | (typeof categories.$inferSelect & { label: string; resolvedIconKey: CategoryIconKey })
    | null;
  sourceAccount: typeof accounts.$inferSelect | null;
  targetAccount: typeof accounts.$inferSelect | null;
  paymentMethod: typeof paymentMethods.$inferSelect | null;
};

export type TemporaryEntryDefaults = {
  categoryId?: string;
  sourceAccountId: string;
  paymentMethodId?: string;
};

export async function listQuickEntryTemplates() {
  const ownerUserId = await getCurrentUserId();
  // 使用频率高的排在前面；同频次按 sortOrder（seed 顺序）兜底；再按 name
  const templateRows = await db
    .select()
    .from(quickEntryTemplates)
    .where(
      and(eq(quickEntryTemplates.enabled, true), eq(quickEntryTemplates.ownerUserId, ownerUserId)),
    )
    .orderBy(
      desc(quickEntryTemplates.usageCount),
      asc(quickEntryTemplates.sortOrder),
      asc(quickEntryTemplates.name),
    );

  return hydrateQuickEntryTemplates(templateRows);
}

/** 管理页用 —— 包括已停用的，统一按 sortOrder 排序方便维护 */
export async function listAllQuickEntryTemplates() {
  const ownerUserId = await getCurrentUserId();
  const templateRows = await db
    .select()
    .from(quickEntryTemplates)
    .where(eq(quickEntryTemplates.ownerUserId, ownerUserId))
    .orderBy(
      desc(quickEntryTemplates.enabled),
      desc(quickEntryTemplates.usageCount),
      asc(quickEntryTemplates.sortOrder),
      asc(quickEntryTemplates.name),
    );

  return hydrateQuickEntryTemplates(templateRows);
}

export async function getQuickEntryTemplate(id: string) {
  const ownerUserId = await getCurrentUserId();
  const templateRows = await db
    .select()
    .from(quickEntryTemplates)
    .where(and(eq(quickEntryTemplates.id, id), eq(quickEntryTemplates.ownerUserId, ownerUserId)))
    .limit(1);

  const [template] = await hydrateQuickEntryTemplates(templateRows.filter((row) => row.enabled));

  return template ?? null;
}

/** 管理用：不过滤 enabled，编辑停用的模板时也能拿到 */
export async function getQuickEntryTemplateAnyStatus(id: string) {
  const ownerUserId = await getCurrentUserId();
  const templateRows = await db
    .select()
    .from(quickEntryTemplates)
    .where(and(eq(quickEntryTemplates.id, id), eq(quickEntryTemplates.ownerUserId, ownerUserId)))
    .limit(1);

  const [template] = await hydrateQuickEntryTemplates(templateRows);

  return template ?? null;
}

export async function getTemporaryEntryDefaults(): Promise<TemporaryEntryDefaults | null> {
  const ownerUserId = await getCurrentUserId();
  const [accountRows, categoryRows, paymentMethodRows] = await Promise.all([
    db
      .select()
      .from(accounts)
      .where(and(eq(accounts.currency, "JPY"), eq(accounts.ownerUserId, ownerUserId))),
    db.select().from(categories).where(eq(categories.id, "other")).limit(1),
    db
      .select()
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, "jpy-cash"), eq(paymentMethods.ownerUserId, ownerUserId)))
      .limit(1),
  ]);

  const sourceAccount =
    accountRows.find((account) => account.id === "jpy-cash") ??
    accountRows.find((account) => account.id === "jp-bank-main") ??
    accountRows[0];

  if (!sourceAccount) {
    return null;
  }

  return {
    categoryId: categoryRows[0]?.id,
    sourceAccountId: sourceAccount.id,
    paymentMethodId: paymentMethodRows[0]?.id,
  };
}

async function hydrateQuickEntryTemplates(templateRows: QuickEntryTemplateRow[]) {
  const ownerUserId = await getCurrentUserId();
  const accountIds = new Set<string>();
  const categoryIds = new Set<string>();
  const paymentMethodIds = new Set<string>();

  for (const template of templateRows) {
    if (template.sourceAccountId) {
      accountIds.add(template.sourceAccountId);
    }

    if (template.targetAccountId) {
      accountIds.add(template.targetAccountId);
    }

    if (template.categoryId) {
      categoryIds.add(template.categoryId);
    }

    if (template.paymentMethodId) {
      paymentMethodIds.add(template.paymentMethodId);
    }
  }

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
  const categoryLabelById = buildCategoryPathLabelMap(categoryRows);
  const categoryIconKeyById = buildResolvedCategoryIconKeyMap(categoryRows);
  const categoryById = new Map(
    categoryRows.map((category) => [
      category.id,
      {
        ...category,
        label: categoryLabelById.get(category.id) ?? category.name,
        resolvedIconKey: categoryIconKeyById.get(category.id) ?? "other",
      },
    ]),
  );
  const paymentMethodById = new Map(
    paymentMethodRows.map((paymentMethod) => [paymentMethod.id, paymentMethod]),
  );

  return templateRows.map((template) => ({
    ...template,
    category: template.categoryId ? (categoryById.get(template.categoryId) ?? null) : null,
    sourceAccount: template.sourceAccountId
      ? (accountById.get(template.sourceAccountId) ?? null)
      : null,
    targetAccount: template.targetAccountId
      ? (accountById.get(template.targetAccountId) ?? null)
      : null,
    paymentMethod: template.paymentMethodId
      ? (paymentMethodById.get(template.paymentMethodId) ?? null)
      : null,
  }));
}
