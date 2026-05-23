"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, refundTrackers, transactions } from "@/db/schema";
import { currencies, parseMoneyToMinor, type Currency } from "@/domain/finance";
import { computeRefundStatus, refundRemainingMinor } from "@/domain/refund";
import {
  createRefundTrackerRecord,
  deleteRefundReceiptAtomic,
  deleteRefundTrackerRecord,
  recordRefundReceiptAtomic,
  setRefundTrackerStatus,
  updateRefundTrackerRecord,
} from "@/features/refunds/service";
import { normalize, stringField as field } from "@/lib/form";
import { refundPaths, revalidatePaths } from "@/lib/revalidate";

// ── 创建 / 编辑 / 取消 / 删除 退款追踪 ───────────────────────────────────

const refundTrackerSchema = z.object({
  amount: z.string().trim().min(1, "请输入应退金额"),
  currency: z.enum(currencies),
  expectedAccountId: z.string().trim().optional(),
  expectedOn: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type RefundTrackerFormValues = {
  amount?: string;
  currency?: string;
  expectedAccountId?: string;
  expectedOn?: string;
  note?: string;
};

export type RefundTrackerActionState = {
  error?: string;
  values?: RefundTrackerFormValues;
};

function extract(formData: FormData): RefundTrackerFormValues {
  return {
    amount: field(formData, "amount"),
    currency: field(formData, "currency"),
    expectedAccountId: field(formData, "expectedAccountId"),
    expectedOn: field(formData, "expectedOn"),
    note: field(formData, "note"),
  };
}

export async function createRefundTracker(
  originalTransactionId: string,
  _prev: RefundTrackerActionState,
  formData: FormData,
): Promise<RefundTrackerActionState> {
  const values = extract(formData);

  const result = refundTrackerSchema.safeParse({
    amount: values.amount,
    currency: values.currency,
    expectedAccountId: normalize(values.expectedAccountId),
    expectedOn: normalize(values.expectedOn),
    note: normalize(values.note),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "退款内容不完整", values };
  }

  const parsed = result.data;
  let amountMinor: number;
  try {
    amountMinor = Math.abs(parseMoneyToMinor(parsed.amount, parsed.currency));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "金额格式不正确", values };
  }
  if (amountMinor === 0) return { error: "金额不能为 0", values };

  const [originalTx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, originalTransactionId))
    .limit(1);
  if (!originalTx) return { error: "原始交易不存在或已被删除", values };

  await createRefundTrackerRecord({
    originalTransactionId,
    amountMinor,
    currency: parsed.currency,
    expectedAccountId: parsed.expectedAccountId,
    expectedOn: parsed.expectedOn,
    note: parsed.note,
  });

  revalidatePaths(refundPaths());
  redirect("/refunds");
}

export async function updateRefundTracker(
  id: string,
  _prev: RefundTrackerActionState,
  formData: FormData,
): Promise<RefundTrackerActionState> {
  const values = extract(formData);

  const result = refundTrackerSchema.safeParse({
    amount: values.amount,
    currency: values.currency,
    expectedAccountId: normalize(values.expectedAccountId),
    expectedOn: normalize(values.expectedOn),
    note: normalize(values.note),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "退款内容不完整", values };
  }

  const parsed = result.data;
  let amountMinor: number;
  try {
    amountMinor = Math.abs(parseMoneyToMinor(parsed.amount, parsed.currency));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "金额格式不正确", values };
  }

  const [existing] = await db
    .select()
    .from(refundTrackers)
    .where(eq(refundTrackers.id, id))
    .limit(1);
  if (!existing) return { error: "退款追踪不存在", values };

  if (amountMinor < existing.receivedAmountMinor) {
    return {
      error: "应退金额不能小于已收到的金额，请先撤销最近一次到账或先调整其他字段",
      values,
    };
  }

  const newStatus = computeRefundStatus(
    amountMinor,
    existing.receivedAmountMinor,
    existing.status === "cancelled",
  );

  await updateRefundTrackerRecord(id, {
    amountMinor,
    currency: parsed.currency,
    expectedAccountId: parsed.expectedAccountId,
    expectedOn: parsed.expectedOn,
    note: parsed.note,
    status: newStatus,
  });

  revalidatePaths(refundPaths(id));
  redirect(`/refunds/${id}`);
}

export async function cancelRefundTracker(id: string) {
  await setRefundTrackerStatus(id, "cancelled");
  revalidatePaths(refundPaths(id));
  redirect(`/refunds/${id}`);
}

export async function deleteRefundTracker(id: string) {
  const [existing] = await db
    .select()
    .from(refundTrackers)
    .where(eq(refundTrackers.id, id))
    .limit(1);
  if (!existing) return;
  // 安全网：已有到账时不允许直接删（UI 应已 disable）
  if (existing.receivedAmountMinor > 0) {
    redirect(`/refunds/${id}`);
  }

  await deleteRefundTrackerRecord(id);
  revalidatePaths(refundPaths());
  redirect("/refunds");
}

// ── 记录到账 / 撤销到账 ──────────────────────────────────────────────────

const receiptSchema = z.object({
  amount: z.string().trim().min(1, "请输入到账金额"),
  occurredOn: z.string().trim().min(1, "请选择到账日期"),
  targetAccountId: z.string().trim().min(1, "请选择到账账户"),
  note: z.string().trim().optional(),
});

export type ReceiptFormValues = {
  amount?: string;
  occurredOn?: string;
  targetAccountId?: string;
  note?: string;
};

export type ReceiptActionState = {
  error?: string;
  values?: ReceiptFormValues;
};

export async function recordRefundReceipt(
  trackerId: string,
  _prev: ReceiptActionState,
  formData: FormData,
): Promise<ReceiptActionState> {
  const values: ReceiptFormValues = {
    amount: field(formData, "amount"),
    occurredOn: field(formData, "occurredOn"),
    targetAccountId: field(formData, "targetAccountId"),
    note: field(formData, "note"),
  };

  const result = receiptSchema.safeParse({
    amount: values.amount,
    occurredOn: values.occurredOn,
    targetAccountId: normalize(values.targetAccountId),
    note: normalize(values.note),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "到账信息不完整", values };
  }

  const parsed = result.data;

  const [tracker] = await db
    .select()
    .from(refundTrackers)
    .where(eq(refundTrackers.id, trackerId))
    .limit(1);
  if (!tracker) return { error: "退款追踪不存在", values };
  if (tracker.status === "cancelled") {
    return { error: "已取消的退款不能记录到账，请先重新启用", values };
  }

  let amountMinor: number;
  try {
    amountMinor = Math.abs(parseMoneyToMinor(parsed.amount, tracker.currency as Currency));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "金额格式不正确", values };
  }
  if (amountMinor === 0) return { error: "金额不能为 0", values };

  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, parsed.targetAccountId))
    .limit(1);
  if (!account) return { error: "到账账户不存在", values };
  if (account.currency !== tracker.currency) {
    return { error: "到账账户币种必须与退款币种一致", values };
  }

  const remainingBefore = refundRemainingMinor(tracker.amountMinor, tracker.receivedAmountMinor);
  if (amountMinor > remainingBefore) {
    return {
      error: `本次到账金额超过待退款金额 ${remainingBefore}（minor）`,
      values,
    };
  }

  await recordRefundReceiptAtomic({
    tracker,
    amountMinor,
    occurredOn: parsed.occurredOn,
    targetAccountId: parsed.targetAccountId,
    note: parsed.note ?? `退款到账 - ${tracker.note ?? ""}`.trim(),
  });

  revalidatePaths(refundPaths(tracker.id, parsed.targetAccountId));
  redirect(`/refunds/${tracker.id}?received=1`);
}

export async function deleteRefundReceipt(receiptTransactionId: string) {
  // 先抓 trackerId 用于跳转
  const [receipt] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, receiptTransactionId))
    .limit(1);
  const trackerId = receipt?.refundTrackerId ?? null;

  await deleteRefundReceiptAtomic(receiptTransactionId);

  revalidatePaths(refundPaths(trackerId ?? undefined));
  redirect(trackerId ? `/refunds/${trackerId}` : "/refunds");
}
