import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { installmentPlans } from "@/db/schema";
import type { Currency } from "@/domain/finance";
import { computeInstallmentStatus, type InstallmentStatus } from "@/domain/installment";
import { nowIso } from "@/lib/dates";

export type InstallmentInput = {
  totalAmountMinor: number;
  currency: Currency;
  periods: number;
  amountPerPeriodMinor: number;
  firstPaymentOn: string;
  feeAmountMinor: number;
};

export async function createInstallmentPlanRecord(
  originalTransactionId: string,
  input: InstallmentInput,
): Promise<string> {
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  await db
    .insert(installmentPlans)
    .values({
      id,
      originalTransactionId,
      totalAmountMinor: input.totalAmountMinor,
      currency: input.currency,
      periods: input.periods,
      amountPerPeriodMinor: input.amountPerPeriodMinor,
      firstPaymentOn: input.firstPaymentOn,
      completedPeriods: 0,
      status: "active",
      feeAmountMinor: input.feeAmountMinor,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return id;
}

export async function updateInstallmentPlanRecord(
  id: string,
  input: InstallmentInput & { status: InstallmentStatus },
): Promise<void> {
  await db
    .update(installmentPlans)
    .set({
      totalAmountMinor: input.totalAmountMinor,
      currency: input.currency,
      periods: input.periods,
      amountPerPeriodMinor: input.amountPerPeriodMinor,
      firstPaymentOn: input.firstPaymentOn,
      feeAmountMinor: input.feeAmountMinor,
      status: input.status,
      updatedAt: nowIso(),
    })
    .where(eq(installmentPlans.id, id))
    .run();
}

export async function shiftInstallmentCompletedPeriods(id: string, delta: 1 | -1): Promise<void> {
  const [existing] = await db
    .select()
    .from(installmentPlans)
    .where(eq(installmentPlans.id, id))
    .limit(1);
  if (!existing) return;
  if (delta === 1 && existing.status === "cancelled") return;
  if (delta === 1 && existing.completedPeriods >= existing.periods) return;
  if (delta === -1 && existing.completedPeriods === 0) return;

  const newCompleted = existing.completedPeriods + delta;
  const newStatus = computeInstallmentStatus(
    newCompleted,
    existing.periods,
    existing.status === "cancelled",
  );

  await db
    .update(installmentPlans)
    .set({
      completedPeriods: newCompleted,
      status: newStatus,
      updatedAt: nowIso(),
    })
    .where(eq(installmentPlans.id, id))
    .run();
}

export async function setInstallmentStatus(id: string, status: InstallmentStatus): Promise<void> {
  await db
    .update(installmentPlans)
    .set({ status, updatedAt: nowIso() })
    .where(eq(installmentPlans.id, id))
    .run();
}

export async function deleteInstallmentPlanRecord(id: string): Promise<void> {
  await db.delete(installmentPlans).where(eq(installmentPlans.id, id)).run();
}
