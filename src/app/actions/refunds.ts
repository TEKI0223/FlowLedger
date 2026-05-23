"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, refundTrackers, transactions } from "@/db/schema";
import { currencies, parseMoneyToMinor, type Currency } from "@/domain/finance";
import { computeRefundStatus, refundRemainingMinor } from "@/domain/refund";
import { nowIso } from "@/lib/dates";

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

function field(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

  if (amountMinor === 0) {
    return { error: "金额不能为 0", values };
  }

  // 校验原始交易存在
  const [originalTx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, originalTransactionId))
    .limit(1);

  if (!originalTx) {
    return { error: "原始交易不存在或已被删除", values };
  }

  const timestamp = nowIso();

  db.insert(refundTrackers)
    .values({
      id: crypto.randomUUID(),
      originalTransactionId,
      amountMinor,
      receivedAmountMinor: 0,
      currency: parsed.currency,
      expectedAccountId: parsed.expectedAccountId,
      expectedOn: parsed.expectedOn,
      receivedOn: null,
      status: "pending",
      note: parsed.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  revalidatePath("/");
  revalidatePath("/refunds");
  revalidatePath("/transactions");
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

  if (!existing) {
    return { error: "退款追踪不存在", values };
  }

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

  await db
    .update(refundTrackers)
    .set({
      amountMinor,
      currency: parsed.currency,
      expectedAccountId: parsed.expectedAccountId,
      expectedOn: parsed.expectedOn,
      note: parsed.note,
      status: newStatus,
      updatedAt: nowIso(),
    })
    .where(eq(refundTrackers.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/refunds");
  revalidatePath(`/refunds/${id}`);
  redirect(`/refunds/${id}`);
}

export async function cancelRefundTracker(id: string) {
  await db
    .update(refundTrackers)
    .set({ status: "cancelled", updatedAt: nowIso() })
    .where(eq(refundTrackers.id, id))
    .run();

  revalidatePath("/");
  revalidatePath("/refunds");
  revalidatePath(`/refunds/${id}`);
  redirect(`/refunds/${id}`);
}

export async function deleteRefundTracker(id: string) {
  const [existing] = await db
    .select()
    .from(refundTrackers)
    .where(eq(refundTrackers.id, id))
    .limit(1);

  if (!existing) return;
  // 安全网：仍有已到账金额时不删（UI 应已经把删除按钮 disable）
  if (existing.receivedAmountMinor > 0) {
    redirect(`/refunds/${id}`);
  }

  await db.delete(refundTrackers).where(eq(refundTrackers.id, id)).run();

  revalidatePath("/");
  revalidatePath("/refunds");
  redirect("/refunds");
}

// ── 记录到账 ────────────────────────────────────────────────────────────

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

  if (!tracker) {
    return { error: "退款追踪不存在", values };
  }

  if (tracker.status === "cancelled") {
    return { error: "已取消的退款不能记录到账，请先重新启用", values };
  }

  let amountMinor: number;
  try {
    amountMinor = Math.abs(parseMoneyToMinor(parsed.amount, tracker.currency as Currency));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "金额格式不正确", values };
  }

  if (amountMinor === 0) {
    return { error: "金额不能为 0", values };
  }

  // 校验账户币种一致
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, parsed.targetAccountId))
    .limit(1);

  if (!account) {
    return { error: "到账账户不存在", values };
  }
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

  const newReceivedMinor = tracker.receivedAmountMinor + amountMinor;
  const newStatus = computeRefundStatus(tracker.amountMinor, newReceivedMinor, false);

  const timestamp = nowIso();
  const transactionId = crypto.randomUUID();

  db.transaction((tx) => {
    // 1. 创建收入交易：type=income, category=refund, target=account
    tx.insert(transactions)
      .values({
        id: transactionId,
        occurredOn: parsed.occurredOn,
        type: "income",
        amountMinor,
        currency: tracker.currency,
        categoryId: "refund",
        sourceAccountId: null,
        targetAccountId: parsed.targetAccountId,
        paymentMethodId: null,
        recurringItemId: null,
        refundTrackerId: tracker.id,
        includeInExpenseStats: false,
        includeInCashflowStats: true,
        note: parsed.note ?? `退款到账 - ${tracker.note ?? ""}`.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    // 2. 更新账户余额（收入 = 目标账户加余额）
    tx.update(accounts)
      .set({
        balanceMinor: sql`${accounts.balanceMinor} + ${amountMinor}`,
        updatedAt: timestamp,
      })
      .where(eq(accounts.id, parsed.targetAccountId))
      .run();

    // 3. 更新退款追踪：累计金额 + status + receivedOn（如果完成）
    tx.update(refundTrackers)
      .set({
        receivedAmountMinor: newReceivedMinor,
        status: newStatus,
        receivedOn: newStatus === "received" ? parsed.occurredOn : tracker.receivedOn,
        updatedAt: timestamp,
      })
      .where(eq(refundTrackers.id, tracker.id))
      .run();
  });

  revalidatePath("/");
  revalidatePath("/refunds");
  revalidatePath(`/refunds/${tracker.id}`);
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${parsed.targetAccountId}`);
  revalidatePath("/transactions");
  redirect(`/refunds/${tracker.id}?received=1`);
}

// 删除一笔到账记录 → 回滚账户余额 + 回退 tracker
export async function deleteRefundReceipt(receiptTransactionId: string) {
  const [receipt] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, receiptTransactionId))
    .limit(1);

  if (!receipt || !receipt.refundTrackerId) return;

  const [tracker] = await db
    .select()
    .from(refundTrackers)
    .where(eq(refundTrackers.id, receipt.refundTrackerId))
    .limit(1);

  if (!tracker) return;

  const newReceivedMinor = Math.max(0, tracker.receivedAmountMinor - receipt.amountMinor);
  const newStatus = computeRefundStatus(
    tracker.amountMinor,
    newReceivedMinor,
    tracker.status === "cancelled",
  );
  const timestamp = nowIso();

  db.transaction((tx) => {
    // 回滚账户余额
    if (receipt.targetAccountId) {
      tx.update(accounts)
        .set({
          balanceMinor: sql`${accounts.balanceMinor} - ${receipt.amountMinor}`,
          updatedAt: timestamp,
        })
        .where(eq(accounts.id, receipt.targetAccountId))
        .run();
    }

    // 删除交易
    tx.delete(transactions).where(eq(transactions.id, receipt.id)).run();

    // 更新 tracker
    tx.update(refundTrackers)
      .set({
        receivedAmountMinor: newReceivedMinor,
        status: newStatus,
        receivedOn: newStatus === "received" ? tracker.receivedOn : null,
        updatedAt: timestamp,
      })
      .where(eq(refundTrackers.id, tracker.id))
      .run();
  });

  revalidatePath("/");
  revalidatePath("/refunds");
  revalidatePath(`/refunds/${tracker.id}`);
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  redirect(`/refunds/${tracker.id}`);
}

