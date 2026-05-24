import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods, transactions } from "@/db/schema";
import { buildCategoryOptions } from "@/features/categories/data";

export async function listTransactions(limit = 50) {
  const transactionRows = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
    .limit(limit);

  return hydrateTransactions(transactionRows);
}

export async function getTransaction(id: string) {
  const transactionRows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  const [transaction] = await hydrateTransactions(transactionRows);

  return transaction ?? null;
}

async function hydrateTransactions(transactionRows: Array<typeof transactions.$inferSelect>) {
  const accountIds = new Set<string>();
  const categoryIds = new Set<string>();
  const paymentMethodIds = new Set<string>();

  for (const transaction of transactionRows) {
    if (transaction.sourceAccountId) {
      accountIds.add(transaction.sourceAccountId);
    }

    if (transaction.targetAccountId) {
      accountIds.add(transaction.targetAccountId);
    }

    if (transaction.categoryId) {
      categoryIds.add(transaction.categoryId);
    }

    if (transaction.paymentMethodId) {
      paymentMethodIds.add(transaction.paymentMethodId);
    }
  }

  const [accountRows, categoryRows, paymentMethodRows] = await Promise.all([
    accountIds.size > 0
      ? db
          .select()
          .from(accounts)
          .where(inArray(accounts.id, [...accountIds]))
      : [],
    categoryIds.size > 0 ? db.select().from(categories) : [],
    paymentMethodIds.size > 0
      ? db
          .select()
          .from(paymentMethods)
          .where(inArray(paymentMethods.id, [...paymentMethodIds]))
      : [],
  ]);

  const accountById = new Map(accountRows.map((account) => [account.id, account]));
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const categoryLabelById = new Map(
    buildCategoryOptions(categoryRows).map((category) => [category.id, category.label]),
  );
  const paymentMethodById = new Map(
    paymentMethodRows.map((paymentMethod) => [paymentMethod.id, paymentMethod]),
  );

  return transactionRows.map((transaction) => ({
    ...transaction,
    sourceAccount: transaction.sourceAccountId
      ? (accountById.get(transaction.sourceAccountId) ?? null)
      : null,
    targetAccount: transaction.targetAccountId
      ? (accountById.get(transaction.targetAccountId) ?? null)
      : null,
    category: transaction.categoryId
      ? addCategoryLabel(
          categoryById.get(transaction.categoryId) ?? null,
          categoryLabelById.get(transaction.categoryId),
        )
      : null,
    paymentMethod: transaction.paymentMethodId
      ? (paymentMethodById.get(transaction.paymentMethodId) ?? null)
      : null,
  }));
}

function addCategoryLabel<T extends { id: string }>(
  category: T | null,
  label: string | undefined,
): (T & { label: string }) | null {
  if (!category) return null;
  return { ...category, label: label ?? "" };
}
