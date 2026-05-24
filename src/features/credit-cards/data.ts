import { and, asc, desc, eq, gte, inArray, lte, ne, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, creditCards, installmentPlans, transactions } from "@/db/schema";
import {
  getPreviousStatementPeriodEnd,
  getStatementPeriod,
  type CreditCardConfig,
  type CycleBoundary,
  type StatementPeriod,
} from "@/domain/credit-card";
import type { Currency, TransactionType } from "@/domain/finance";
import { computeInstallmentDueDates, type InstallmentStatus } from "@/domain/installment";
import { todayIsoDate } from "@/lib/dates";

type CreditCardRow = typeof creditCards.$inferSelect;
type AccountRow = typeof accounts.$inferSelect;

export type HydratedCreditCard = CreditCardRow & {
  account: AccountRow;
  repaymentAccount: AccountRow | null;
};

export async function listCreditCards(): Promise<HydratedCreditCard[]> {
  const cardRows = await db
    .select()
    .from(creditCards)
    .orderBy(desc(creditCards.enabled), asc(creditCards.id));

  return hydrate(cardRows);
}

export async function getCreditCard(id: string): Promise<HydratedCreditCard | null> {
  const rows = await db.select().from(creditCards).where(eq(creditCards.id, id)).limit(1);
  const [card] = await hydrate(rows);
  return card ?? null;
}

export async function listCreditCardAccountOptions() {
  return db
    .select({
      id: accounts.id,
      name: accounts.name,
      lastDigits: accounts.lastDigits,
      type: accounts.type,
      currency: accounts.currency,
    })
    .from(accounts)
    .where(ne(accounts.type, "credit_card"))
    .orderBy(asc(accounts.currency), asc(accounts.type), asc(accounts.name));
}

export type StatementTransaction = {
  id: string;
  occurredOn: string;
  amountMinor: number;
  currency: Currency;
  type: TransactionType;
  note: string | null;
  categoryId: string | null;
};

/** 分期产生的本期扣款（不是真实交易，而是从 installment_plans 派生出来的「本期应扣」） */
export type StatementInstallmentEntry = {
  planId: string;
  originalTransactionId: string;
  periodIndex: number; // 1-based
  totalPeriods: number;
  dueDate: string;
  amountMinor: number;
  currency: Currency;
  note: string | null;
};

export type StatementSummary = StatementPeriod & {
  cardId: string;
  totalAmountMinor: number;
  /** 本期普通消费（不含已挂分期的原始大额） */
  transactions: StatementTransaction[];
  /** 本期来自分期计划的扣款 */
  installmentEntries: StatementInstallmentEntry[];
  repaymentTransactions: StatementTransaction[];
  repaidAmountMinor: number;
  isCurrent: boolean;
  /** dueDate 已经过且仍未足额还款 */
  isOverdue: boolean;
  /** 已还款金额 ≥ 应还金额 */
  isPaid: boolean;
};

export async function listCardStatements(
  card: HydratedCreditCard,
  count: number = 4,
): Promise<StatementSummary[]> {
  const config: CreditCardConfig = {
    closingDay: card.closingDay,
    paymentDay: card.paymentDay,
    cycleBoundary: card.cycleBoundary as CycleBoundary,
  };

  const today = todayIsoDate();
  const currentPeriod = getStatementPeriod(today, config);

  // 当期 + 过去 count-1 期
  const periodEnds: string[] = [currentPeriod.periodEnd];
  for (let i = 0; i < count - 1; i++) {
    const previous = getPreviousStatementPeriodEnd(periodEnds[periodEnds.length - 1], config);
    periodEnds.push(previous);
  }

  // 查询整个时间段的相关交易，一次 IO
  const earliestStart = getStatementPeriod(periodEnds[periodEnds.length - 1], config).periodStart;
  const latestEnd = (() => {
    // 还款可能发生在 dueDate 当天或之后，所以查询区间右端要取 dueDate 而非 periodEnd
    const dueDates = periodEnds.map((pe) => getStatementPeriod(pe, config).dueDate);
    return dueDates.reduce((max, d) => (d > max ? d : max), today);
  })();

  const cardAccountId = card.accountId;

  // 1. 查询挂在本卡上的所有分期计划（active / completed，跳过 cancelled）
  const cardInstallments = await db
    .select({
      planId: installmentPlans.id,
      originalTransactionId: installmentPlans.originalTransactionId,
      amountPerPeriodMinor: installmentPlans.amountPerPeriodMinor,
      firstPaymentOn: installmentPlans.firstPaymentOn,
      periods: installmentPlans.periods,
      status: installmentPlans.status,
      currency: installmentPlans.currency,
      txNote: transactions.note,
    })
    .from(installmentPlans)
    .innerJoin(transactions, eq(installmentPlans.originalTransactionId, transactions.id))
    .where(
      and(
        eq(transactions.sourceAccountId, cardAccountId),
        ne(installmentPlans.status, "cancelled" satisfies InstallmentStatus),
      ),
    );

  const installmentTxIds = cardInstallments.map((p) => p.originalTransactionId);

  // 2. 普通消费查询，排除已挂分期的原始交易
  const cardExpensesConds = [
    eq(transactions.sourceAccountId, cardAccountId),
    eq(transactions.type, "expense"),
    gte(transactions.occurredOn, earliestStart),
    lte(transactions.occurredOn, latestEnd),
  ];

  const [cardExpenses, repaymentTxs] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(
        installmentTxIds.length > 0
          ? and(...cardExpensesConds, notInArray(transactions.id, installmentTxIds))
          : and(...cardExpensesConds),
      )
      .orderBy(asc(transactions.occurredOn)),
    db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.targetAccountId, cardAccountId),
          eq(transactions.type, "transfer"),
          gte(transactions.occurredOn, earliestStart),
          lte(transactions.occurredOn, latestEnd),
        ),
      )
      .orderBy(asc(transactions.occurredOn)),
  ]);

  return periodEnds.map((periodEnd) => {
    const period = getStatementPeriod(periodEnd, config);
    const txs = cardExpenses.filter(
      (tx) => tx.occurredOn >= period.periodStart && tx.occurredOn <= period.periodEnd,
    );

    // 3. 本期分期扣款：扫描每个 plan，找 dueDate 落在 [periodStart, periodEnd] 之内的期数
    const installmentEntries: StatementInstallmentEntry[] = [];
    for (const plan of cardInstallments) {
      const dueDates = computeInstallmentDueDates(plan.firstPaymentOn, plan.periods);
      for (let i = 0; i < dueDates.length; i++) {
        const dueDate = dueDates[i];
        if (dueDate >= period.periodStart && dueDate <= period.periodEnd) {
          installmentEntries.push({
            planId: plan.planId,
            originalTransactionId: plan.originalTransactionId,
            periodIndex: i + 1,
            totalPeriods: plan.periods,
            dueDate,
            amountMinor: plan.amountPerPeriodMinor,
            currency: plan.currency as Currency,
            note: plan.txNote,
          });
        }
      }
    }

    // 启发式：还款关联到「dueDate 当天或之前最近一期」
    const previousDueDate = (() => {
      try {
        const prevEnd = getPreviousStatementPeriodEnd(periodEnd, config);
        return getStatementPeriod(prevEnd, config).dueDate;
      } catch {
        return "0000-00-00";
      }
    })();
    const repays = repaymentTxs.filter(
      (tx) => tx.occurredOn > previousDueDate && tx.occurredOn <= period.dueDate,
    );

    const txTotalMinor = txs.reduce((sum, tx) => sum + tx.amountMinor, 0);
    const installmentTotalMinor = installmentEntries.reduce((sum, e) => sum + e.amountMinor, 0);
    const totalAmountMinor = txTotalMinor + installmentTotalMinor;
    const repaidAmountMinor = repays.reduce((sum, tx) => sum + tx.amountMinor, 0);
    const isPaid = totalAmountMinor > 0 && repaidAmountMinor >= totalAmountMinor;
    const isOverdue = !isPaid && period.dueDate < today && totalAmountMinor > 0;

    return {
      cardId: card.id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      dueDate: period.dueDate,
      totalAmountMinor,
      transactions: txs.map(toStatementTransaction),
      installmentEntries,
      repaymentTransactions: repays.map(toStatementTransaction),
      repaidAmountMinor,
      isCurrent: periodEnd === currentPeriod.periodEnd,
      isOverdue,
      isPaid,
    };
  });
}

function toStatementTransaction(row: typeof transactions.$inferSelect): StatementTransaction {
  return {
    id: row.id,
    occurredOn: row.occurredOn,
    amountMinor: row.amountMinor,
    currency: row.currency,
    type: row.type,
    note: row.note,
    categoryId: row.categoryId,
  };
}

async function hydrate(cardRows: CreditCardRow[]): Promise<HydratedCreditCard[]> {
  const accountIds = new Set<string>();
  for (const card of cardRows) {
    accountIds.add(card.accountId);
    if (card.repaymentAccountId) {
      accountIds.add(card.repaymentAccountId);
    }
  }

  const accountRows =
    accountIds.size > 0
      ? await db
          .select()
          .from(accounts)
          .where(inArray(accounts.id, [...accountIds]))
      : [];
  const accountById = new Map(accountRows.map((account) => [account.id, account]));

  return cardRows
    .map((card) => {
      const account = accountById.get(card.accountId);
      if (!account) {
        return null;
      }
      return {
        ...card,
        account,
        repaymentAccount: card.repaymentAccountId
          ? (accountById.get(card.repaymentAccountId) ?? null)
          : null,
      };
    })
    .filter((card): card is HydratedCreditCard => card !== null);
}
