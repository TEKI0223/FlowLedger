import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, installmentPlans, transactions } from "@/db/schema";
import type { InstallmentStatus } from "@/domain/installment";
import { getCurrentUserId } from "@/lib/auth";

type InstallmentPlanRow = typeof installmentPlans.$inferSelect;
type TransactionRow = typeof transactions.$inferSelect;

export type HydratedInstallmentPlan = InstallmentPlanRow & {
  originalTransaction: TransactionRow | null;
  category: { id: string; name: string } | null;
  sourceAccount: { id: string; name: string } | null;
};

export async function listInstallmentPlans(): Promise<HydratedInstallmentPlan[]> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(installmentPlans)
    .where(eq(installmentPlans.ownerUserId, ownerUserId))
    .orderBy(desc(installmentPlans.firstPaymentOn));
  return hydrate(rows);
}

export async function getInstallmentPlan(id: string): Promise<HydratedInstallmentPlan | null> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(installmentPlans)
    .where(and(eq(installmentPlans.id, id), eq(installmentPlans.ownerUserId, ownerUserId)))
    .limit(1);
  const [plan] = await hydrate(rows);
  return plan ?? null;
}

export async function countActiveInstallments(): Promise<number> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select({ id: installmentPlans.id })
    .from(installmentPlans)
    .where(
      and(
        ne(installmentPlans.status, "completed" satisfies InstallmentStatus),
        ne(installmentPlans.status, "cancelled" satisfies InstallmentStatus),
        eq(installmentPlans.ownerUserId, ownerUserId),
      ),
    );
  return rows.length;
}

async function hydrate(rows: InstallmentPlanRow[]): Promise<HydratedInstallmentPlan[]> {
  const ownerUserId = await getCurrentUserId();
  const txIds = new Set<string>();
  for (const row of rows) {
    if (row.originalTransactionId) txIds.add(row.originalTransactionId);
  }

  const txRows =
    txIds.size > 0
      ? await db
          .select()
          .from(transactions)
          .where(
            and(inArray(transactions.id, [...txIds]), eq(transactions.ownerUserId, ownerUserId)),
          )
      : [];

  const categoryIds = new Set<string>();
  const accountIds = new Set<string>();
  for (const tx of txRows) {
    if (tx.categoryId) categoryIds.add(tx.categoryId);
    if (tx.sourceAccountId) accountIds.add(tx.sourceAccountId);
  }

  const [categoryRows, accountRows] = await Promise.all([
    categoryIds.size > 0
      ? db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, [...categoryIds]))
          .orderBy(asc(categories.name))
      : [],
    accountIds.size > 0
      ? db
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(and(inArray(accounts.id, [...accountIds]), eq(accounts.ownerUserId, ownerUserId)))
      : [],
  ]);

  const txById = new Map(txRows.map((tx) => [tx.id, tx]));
  const categoryById = new Map(categoryRows.map((row) => [row.id, row]));
  const accountById = new Map(accountRows.map((row) => [row.id, row]));

  return rows.map((row) => {
    const tx = row.originalTransactionId ? (txById.get(row.originalTransactionId) ?? null) : null;
    return {
      ...row,
      originalTransaction: tx,
      category: tx?.categoryId ? (categoryById.get(tx.categoryId) ?? null) : null,
      sourceAccount: tx?.sourceAccountId ? (accountById.get(tx.sourceAccountId) ?? null) : null,
    };
  });
}
