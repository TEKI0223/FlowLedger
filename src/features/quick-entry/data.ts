import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods, quickEntryTemplates } from "@/db/schema";

type QuickEntryTemplateRow = typeof quickEntryTemplates.$inferSelect;

export type HydratedQuickEntryTemplate = QuickEntryTemplateRow & {
  category: typeof categories.$inferSelect | null;
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
  const templateRows = await db
    .select()
    .from(quickEntryTemplates)
    .where(eq(quickEntryTemplates.enabled, true))
    .orderBy(asc(quickEntryTemplates.sortOrder), asc(quickEntryTemplates.name));

  return hydrateQuickEntryTemplates(templateRows);
}

export async function getQuickEntryTemplate(id: string) {
  const templateRows = await db
    .select()
    .from(quickEntryTemplates)
    .where(eq(quickEntryTemplates.id, id))
    .limit(1);

  const [template] = await hydrateQuickEntryTemplates(templateRows.filter((row) => row.enabled));

  return template ?? null;
}

export async function getTemporaryEntryDefaults(): Promise<TemporaryEntryDefaults | null> {
  const [accountRows, categoryRows, paymentMethodRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.currency, "JPY")),
    db.select().from(categories).where(eq(categories.id, "other")).limit(1),
    db.select().from(paymentMethods).where(eq(paymentMethods.id, "jpy-cash")).limit(1),
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
          .where(inArray(accounts.id, [...accountIds]))
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
          .where(inArray(paymentMethods.id, [...paymentMethodIds]))
      : [],
  ]);

  const accountById = new Map(accountRows.map((account) => [account.id, account]));
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
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
