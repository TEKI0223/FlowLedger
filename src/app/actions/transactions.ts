"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, transactions } from "@/db/schema";
import { currencies, getTransactionBalanceImpacts, parseMoneyToMinor, transactionTypes, type Transaction } from "@/domain/finance";
import { nowIso, todayIsoDate } from "@/lib/dates";

const transactionSchema = z.object({
  occurredOn: z.string().trim().min(1),
  type: z.enum(transactionTypes),
  amount: z.string().trim().min(1, "请输入金额"),
  currency: z.enum(currencies),
  categoryId: z.string().trim().optional(),
  sourceAccountId: z.string().trim().optional(),
  targetAccountId: z.string().trim().optional(),
  paymentMethodId: z.string().trim().optional(),
  note: z.string().trim().optional()
});

export async function createTransaction(formData: FormData) {
  const parsed = transactionSchema.parse({
    occurredOn: formData.get("occurredOn") || todayIsoDate(),
    type: formData.get("type"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    categoryId: normalizeOptional(formData.get("categoryId")),
    sourceAccountId: normalizeOptional(formData.get("sourceAccountId")),
    targetAccountId: normalizeOptional(formData.get("targetAccountId")),
    paymentMethodId: normalizeOptional(formData.get("paymentMethodId")),
    note: normalizeOptional(formData.get("note"))
  });

  const rawAmountMinor = parseMoneyToMinor(parsed.amount, parsed.currency);
  const amountMinor = parsed.type === "adjustment" ? rawAmountMinor : Math.abs(rawAmountMinor);

  if (amountMinor === 0) {
    throw new Error("金额不能为 0");
  }

  assertRequiredAccounts(parsed);
  await assertAccountCurrencies(parsed.sourceAccountId, parsed.targetAccountId, parsed.currency);

  const timestamp = nowIso();
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    occurredOn: parsed.occurredOn,
    type: parsed.type,
    money: {
      amountMinor,
      currency: parsed.currency
    },
    categoryId: parsed.categoryId,
    sourceAccountId: parsed.sourceAccountId,
    targetAccountId: parsed.targetAccountId,
    paymentMethodId: parsed.paymentMethodId,
    note: parsed.note
  };

  await db.transaction((tx) => {
    tx.insert(transactions).values({
      id: transaction.id,
      occurredOn: transaction.occurredOn,
      type: transaction.type,
      amountMinor: transaction.money.amountMinor,
      currency: transaction.money.currency,
      categoryId: transaction.categoryId,
      sourceAccountId: transaction.sourceAccountId,
      targetAccountId: transaction.targetAccountId,
      paymentMethodId: transaction.paymentMethodId,
      includeInExpenseStats: transaction.type === "expense",
      includeInCashflowStats: transaction.type !== "adjustment",
      note: transaction.note,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    for (const impact of getTransactionBalanceImpacts(transaction)) {
      tx
        .update(accounts)
        .set({
          balanceMinor: sql`${accounts.balanceMinor} + ${impact.amountMinor}`,
          updatedAt: timestamp
        })
        .where(eq(accounts.id, impact.accountId));
    }
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  redirect("/transactions");
}

function normalizeOptional(value: FormDataEntryValue | null) {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized.length > 0 ? normalized : undefined;
}

function assertRequiredAccounts(transaction: z.infer<typeof transactionSchema>) {
  if (transaction.type === "income" && !transaction.targetAccountId) {
    throw new Error("收入需要选择入账账户");
  }

  if (transaction.type === "expense" && !transaction.sourceAccountId) {
    throw new Error("支出需要选择付款账户");
  }

  if (transaction.type === "transfer" && (!transaction.sourceAccountId || !transaction.targetAccountId)) {
    throw new Error("转账需要选择转出账户和转入账户");
  }

  if (transaction.type === "transfer" && transaction.sourceAccountId === transaction.targetAccountId) {
    throw new Error("转出账户和转入账户不能相同");
  }

  if (transaction.type === "adjustment" && !transaction.targetAccountId) {
    throw new Error("调整需要选择校准账户");
  }
}

async function assertAccountCurrencies(sourceAccountId: string | undefined, targetAccountId: string | undefined, currency: string) {
  const ids = [sourceAccountId, targetAccountId].filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return;
  }

  const accountRows = await db.select().from(accounts);
  const accountById = new Map(accountRows.map((account) => [account.id, account]));

  for (const id of ids) {
    const account = accountById.get(id);

    if (!account) {
      throw new Error("选择的账户不存在");
    }

    if (account.currency !== currency) {
      throw new Error("交易币种必须和所选账户币种一致");
    }
  }
}
