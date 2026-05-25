import { and, desc, eq, gte, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, paymentMethods, transactions } from "@/db/schema";
import { buildCategoryOptions } from "@/features/categories/data";
import { addDays, addMonths, todayIsoDate } from "@/lib/dates";
import type { TransactionFilters } from "./filters";

export async function listTransactions(limit = 50, filters: TransactionFilters = {}) {
  const conditions = await buildTransactionFilterConditions(filters);
  const query = db.select().from(transactions);
  const orderedQuery =
    conditions.length > 0
      ? query
          .where(and(...conditions))
          .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
      : query.orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));

  const transactionRows = await orderedQuery.limit(limit);

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

async function buildTransactionFilterConditions(filters: TransactionFilters): Promise<SQL[]> {
  const conditions: SQL[] = [];

  if (filters.date) {
    const today = todayIsoDate();
    if (filters.date === "7d") {
      conditions.push(gte(transactions.occurredOn, addDays(today, -6)));
    } else if (filters.date === "30d") {
      conditions.push(gte(transactions.occurredOn, addDays(today, -29)));
    } else if (filters.date === "6m") {
      conditions.push(gte(transactions.occurredOn, addMonths(today, -6)));
    } else if (filters.date === "month") {
      conditions.push(gte(transactions.occurredOn, `${today.slice(0, 7)}-01`));
    } else if (filters.date === "year") {
      conditions.push(gte(transactions.occurredOn, `${today.slice(0, 4)}-01-01`));
    }
  }

  if (filters.categoryId) {
    const categoryIds = await getCategoryAndDescendantIds(filters.categoryId);
    conditions.push(inArray(transactions.categoryId, categoryIds));
  }

  if (filters.amount) {
    const amount = sql<number>`abs(${transactions.amountMinor})`;
    const threshold50 = amountThreshold(50);
    const threshold100 = amountThreshold(100);
    const threshold1000 = amountThreshold(1000);
    const threshold5000 = amountThreshold(5000);
    const threshold10000 = amountThreshold(10000);

    if (filters.amount === "lt50") {
      conditions.push(sql`${amount} < ${threshold50}`);
    } else if (filters.amount === "50-100") {
      conditions.push(and(sql`${amount} >= ${threshold50}`, sql`${amount} < ${threshold100}`)!);
    } else if (filters.amount === "100-1000") {
      conditions.push(and(sql`${amount} >= ${threshold100}`, sql`${amount} < ${threshold1000}`)!);
    } else if (filters.amount === "1000-5000") {
      conditions.push(and(sql`${amount} >= ${threshold1000}`, sql`${amount} < ${threshold5000}`)!);
    } else if (filters.amount === "5000-10000") {
      conditions.push(and(sql`${amount} >= ${threshold5000}`, sql`${amount} < ${threshold10000}`)!);
    } else if (filters.amount === "gte10000") {
      conditions.push(sql`${amount} >= ${threshold10000}`);
    }
  }

  if (filters.accountId) {
    conditions.push(
      or(
        eq(transactions.sourceAccountId, filters.accountId),
        eq(transactions.targetAccountId, filters.accountId),
      )!,
    );
  }

  if (filters.paymentMethodId) {
    conditions.push(eq(transactions.paymentMethodId, filters.paymentMethodId));
  }

  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type));
  }

  if (filters.currency) {
    conditions.push(eq(transactions.currency, filters.currency));
  }

  return conditions;
}

function amountThreshold(majorAmount: number): SQL<number> {
  return sql`case when ${transactions.currency} = 'CNY' then ${majorAmount * 100} else ${majorAmount} end`;
}

async function getCategoryAndDescendantIds(categoryId: string): Promise<string[]> {
  const rows = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories);
  const childrenByParent = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.parentId) continue;
    const children = childrenByParent.get(row.parentId) ?? [];
    children.push(row.id);
    childrenByParent.set(row.parentId, children);
  }

  const ids = new Set([categoryId]);
  const stack = [...(childrenByParent.get(categoryId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || ids.has(id)) continue;
    ids.add(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }

  return [...ids];
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
