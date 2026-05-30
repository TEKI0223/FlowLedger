import { and, asc, desc, eq, gte, inArray, lte, ne, notInArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, categories, creditCards, installmentPlans, transactions } from "@/db/schema";
import {
  buildResolvedCategoryIconKeyMap,
  type CategoryIconKey,
} from "@/features/categories/icon-utils";
import {
  getPreviousStatementPeriodEnd,
  getStatementPeriod,
  listAdjacentStatementPeriods,
  type CreditCardConfig,
  type CycleBoundary,
  type PaymentMonthOffset,
  type StatementPeriod,
} from "@/domain/credit-card";
import type { Currency, TransactionType } from "@/domain/finance";
import { computeInstallmentDueDates, type InstallmentStatus } from "@/domain/installment";
import { getCurrentUserId } from "@/lib/auth";
import { todayIsoDate } from "@/lib/dates";

type CreditCardRow = typeof creditCards.$inferSelect;
type AccountRow = typeof accounts.$inferSelect;

export type HydratedCreditCard = CreditCardRow & {
  account: AccountRow;
  repaymentAccount: AccountRow | null;
};

export async function listCreditCards(): Promise<HydratedCreditCard[]> {
  const ownerUserId = await getCurrentUserId();
  const cardRows = await db
    .select()
    .from(creditCards)
    .where(eq(creditCards.ownerUserId, ownerUserId))
    .orderBy(desc(creditCards.enabled), asc(creditCards.id));

  return hydrate(cardRows);
}

export async function getCreditCard(id: string): Promise<HydratedCreditCard | null> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.id, id), eq(creditCards.ownerUserId, ownerUserId)))
    .limit(1);
  const [card] = await hydrate(rows);
  return card ?? null;
}

/**
 * 统计有多少张启用的信用卡有"已关期但仍未还清"的账单（用于待办计数）。
 * 当期（accruing）不计入 — 那是正在累积，不是要立刻还。
 * 每张卡最多回看 6 期，足够覆盖一般场景。
 */
export async function countPendingCardRepayments(): Promise<number> {
  const cards = await listCreditCards();
  let count = 0;
  for (const card of cards) {
    if (!card.enabled) continue;
    const statements = await listCardStatements(card, 6);
    for (const s of statements) {
      if (s.isCurrent) continue;
      if (s.isPaid) continue;
      if (s.totalAmountMinor <= 0) continue;
      count += 1;
    }
  }
  return count;
}

export type CreditCardStatementOption = {
  /** 用作 form value：账单的 periodEnd（YYYY-MM-DD） */
  periodEnd: string;
  periodStart: string;
  dueDate: string;
  /** 是否就是 anchor 所在的当期 */
  isCurrent: boolean;
};

/**
 * 给"按账户 id 查询附近账单期"的下拉用。
 * 返回 Map<信用卡 accountId, 该卡前后几期的账单>。
 */
export async function getCreditCardStatementOptions(
  anchor: string = todayIsoDate(),
  past: number = 1,
  future: number = 2,
): Promise<Record<string, CreditCardStatementOption[]>> {
  const ownerUserId = await getCurrentUserId();
  const rows = await db
    .select({
      accountId: creditCards.accountId,
      closingDay: creditCards.closingDay,
      paymentDay: creditCards.paymentDay,
      paymentMonthOffset: creditCards.paymentMonthOffset,
      cycleBoundary: creditCards.cycleBoundary,
    })
    .from(creditCards)
    .where(eq(creditCards.ownerUserId, ownerUserId));

  const result: Record<string, CreditCardStatementOption[]> = {};
  for (const row of rows) {
    const config: CreditCardConfig = {
      closingDay: row.closingDay,
      paymentDay: row.paymentDay,
      paymentMonthOffset: row.paymentMonthOffset as PaymentMonthOffset,
      cycleBoundary: row.cycleBoundary as CycleBoundary,
    };
    const current = getStatementPeriod(anchor, config);
    const periods = listAdjacentStatementPeriods(anchor, config, { past, future });
    result[row.accountId] = periods.map((p) => ({
      periodEnd: p.periodEnd,
      periodStart: p.periodStart,
      dueDate: p.dueDate,
      isCurrent: p.periodEnd === current.periodEnd,
    }));
  }

  return result;
}

export async function listCreditCardAccountOptions() {
  const ownerUserId = await getCurrentUserId();
  return db
    .select({
      id: accounts.id,
      name: accounts.name,
      lastDigits: accounts.lastDigits,
      type: accounts.type,
      currency: accounts.currency,
    })
    .from(accounts)
    .where(and(ne(accounts.type, "credit_card"), eq(accounts.ownerUserId, ownerUserId)))
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
  categoryName: string | null;
  categoryIconKey: CategoryIconKey | null;
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
  count: number = 2,
  options: { filterEmpty?: boolean } = {},
): Promise<StatementSummary[]> {
  // 默认过滤掉「关期但金额为 0」的幻影账单：用户刚初始化时往前的几期都是空的，
  // 显示出来会让人误以为这些都是未付的账单。当期（isCurrent）永远显示，
  // 哪怕金额为 0 — 它代表"正在累积中"。
  const filterEmpty = options.filterEmpty ?? true;
  const config: CreditCardConfig = {
    closingDay: card.closingDay,
    paymentDay: card.paymentDay,
    paymentMonthOffset: card.paymentMonthOffset as PaymentMonthOffset,
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

  const summaries = await listCardStatementsByPeriodEnds(
    card,
    config,
    periodEnds,
    today,
    currentPeriod.periodEnd,
  );

  if (!filterEmpty) return summaries;
  return summaries.filter(
    (s) => s.isCurrent || s.totalAmountMinor > 0 || s.repaidAmountMinor > 0,
  );
}

/**
 * 抓单期账单（按 periodEnd 索引）。给账单详情页用。
 * 返回 null 时表示 periodEnd 不是合法的账单边界。
 */
export async function getCardStatement(
  card: HydratedCreditCard,
  periodEnd: string,
): Promise<StatementSummary | null> {
  const config: CreditCardConfig = {
    closingDay: card.closingDay,
    paymentDay: card.paymentDay,
    paymentMonthOffset: card.paymentMonthOffset as PaymentMonthOffset,
    cycleBoundary: card.cycleBoundary as CycleBoundary,
  };
  const period = getStatementPeriod(periodEnd, config);
  // periodEnd 必须正好等于一期的 periodEnd（不能落在期中）
  if (period.periodEnd !== periodEnd) return null;

  const today = todayIsoDate();
  const currentPeriodEnd = getStatementPeriod(today, config).periodEnd;
  const [results] = await Promise.all([
    listCardStatementsByPeriodEnds(card, config, [periodEnd], today, currentPeriodEnd),
  ]);
  return results[0] ?? null;
}

/**
 * 内部辅助：给一组 periodEnds，构造对应的 StatementSummary 列表。
 * 跟 listCardStatements 共享核心逻辑（同一份 SQL 查询 + 同一份归期判定）。
 */
async function listCardStatementsByPeriodEnds(
  card: HydratedCreditCard,
  config: CreditCardConfig,
  periodEnds: string[],
  today: string,
  currentPeriodEnd: string,
): Promise<StatementSummary[]> {
  const ownerUserId = await getCurrentUserId();
  const earliestStart = periodEnds
    .map((pe) => getStatementPeriod(pe, config).periodStart)
    .reduce((min, s) => (s < min ? s : min));
  const latestEnd = periodEnds
    .map((pe) => getStatementPeriod(pe, config).dueDate)
    .reduce((max, d) => (d > max ? d : max), today);

  const cardAccountId = card.accountId;

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
        eq(installmentPlans.ownerUserId, ownerUserId),
        eq(transactions.ownerUserId, ownerUserId),
        ne(installmentPlans.status, "cancelled" satisfies InstallmentStatus),
      ),
    );

  const installmentTxIds = cardInstallments.map((p) => p.originalTransactionId);

  const cardExpensesConds = [
    eq(transactions.sourceAccountId, cardAccountId),
    eq(transactions.ownerUserId, ownerUserId),
    eq(transactions.type, "expense"),
    or(
      and(gte(transactions.occurredOn, earliestStart), lte(transactions.occurredOn, latestEnd)),
      and(
        gte(transactions.creditCardStatementOverride, earliestStart),
        lte(transactions.creditCardStatementOverride, latestEnd),
      ),
    ),
  ];

  const [cardExpenses, repaymentTxs, categoryRows] = await Promise.all([
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
          eq(transactions.ownerUserId, ownerUserId),
          eq(transactions.type, "transfer"),
          gte(transactions.occurredOn, earliestStart),
          lte(transactions.occurredOn, latestEnd),
        ),
      )
      .orderBy(asc(transactions.occurredOn)),
    db.select().from(categories),
  ]);

  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));
  const resolvedIconKeyById = buildResolvedCategoryIconKeyMap(categoryRows);

  function hydrateTx(row: typeof transactions.$inferSelect): StatementTransaction {
    const category = row.categoryId ? categoryById.get(row.categoryId) : null;
    return {
      id: row.id,
      occurredOn: row.occurredOn,
      amountMinor: row.amountMinor,
      currency: row.currency,
      type: row.type,
      note: row.note,
      categoryId: row.categoryId,
      categoryName: category?.name ?? null,
      categoryIconKey: row.categoryId ? (resolvedIconKeyById.get(row.categoryId) ?? null) : null,
    };
  }

  return periodEnds.map((periodEnd) => {
    const period = getStatementPeriod(periodEnd, config);
    const txs = cardExpenses.filter((tx) => {
      if (tx.creditCardStatementOverride) {
        return tx.creditCardStatementOverride === period.periodEnd;
      }
      return tx.occurredOn >= period.periodStart && tx.occurredOn <= period.periodEnd;
    });

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
      transactions: txs.map(hydrateTx),
      installmentEntries,
      repaymentTransactions: repays.map(hydrateTx),
      repaidAmountMinor,
      isCurrent: periodEnd === currentPeriodEnd,
      isOverdue,
      isPaid,
    };
  });
}

async function hydrate(cardRows: CreditCardRow[]): Promise<HydratedCreditCard[]> {
  const ownerUserId = await getCurrentUserId();
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
          .where(and(inArray(accounts.id, [...accountIds]), eq(accounts.ownerUserId, ownerUserId)))
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
