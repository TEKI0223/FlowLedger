import dayjs, { type Dayjs } from "dayjs";
import { ISO_DATE } from "@/lib/dates";

export type CycleBoundary = "inclusive" | "exclusive";

export const paymentMonthOffsets = [0, 1, 2] as const;
export type PaymentMonthOffset = (typeof paymentMonthOffsets)[number];

export const paymentMonthOffsetLabels: Record<PaymentMonthOffset, string> = {
  0: "当月",
  1: "次月",
  2: "次次月",
};

export type CreditCardConfig = {
  closingDay: number;
  paymentDay: number;
  /** 扣款月相对 closingDate 的偏移 */
  paymentMonthOffset: PaymentMonthOffset;
  cycleBoundary: CycleBoundary;
};

export type StatementPeriod = {
  /** 这一期开始日（含），ISO 日期 */
  periodStart: string;
  /** 这一期结束日（含），ISO 日期 */
  periodEnd: string;
  /** 这一期对应的扣款日，ISO 日期 */
  dueDate: string;
};

/**
 * 给定某一天，返回这笔消费所属的账单周期。
 *
 * 规则：
 *  - inclusive：occurredOn ≤ 当月 closingDay 归本期；超过则归下一期
 *  - exclusive：occurredOn < 当月 closingDay 归本期；≥ closingDay 归下一期
 *  - 月末 clamp：例如 closingDay = 31 但 4 月只有 30 天，4 月的 closingDate 取 4-30
 */
export function getStatementPeriod(date: string, config: CreditCardConfig): StatementPeriod {
  const target = dayjs(date);
  const closingDate = findClosingDateOf(target, config);
  const previousClosingDate = monthClosingDate(closingDate.subtract(1, "month"), config.closingDay);

  const periodEnd = closingDateToPeriodEnd(closingDate, config.cycleBoundary);
  const previousPeriodEnd = closingDateToPeriodEnd(previousClosingDate, config.cycleBoundary);
  const periodStart = previousPeriodEnd.add(1, "day");
  const dueDate = computeDueDate(closingDate, config.paymentDay, config.paymentMonthOffset);

  return {
    periodStart: periodStart.format(ISO_DATE),
    periodEnd: periodEnd.format(ISO_DATE),
    dueDate: dueDate.format(ISO_DATE),
  };
}

/**
 * 给定一个账单周期的 periodEnd，返回下一期的 periodEnd。
 */
export function getNextStatementPeriodEnd(periodEnd: string, config: CreditCardConfig): string {
  const nextDayInsideNextPeriod = dayjs(periodEnd).add(1, "day").format(ISO_DATE);
  return getStatementPeriod(nextDayInsideNextPeriod, config).periodEnd;
}

/**
 * 给定一个账单周期的 periodEnd，返回上一期的 periodEnd。
 *
 * 实现：拿当前期的 periodStart，向前退 1 天，必定落在上一期内。
 * （早期实现用 "periodEnd - 1 天" 在 inclusive 边界下会落回同一期，导致循环不前进。）
 */
export function getPreviousStatementPeriodEnd(periodEnd: string, config: CreditCardConfig): string {
  const currentStart = getStatementPeriod(periodEnd, config).periodStart;
  const dayInPrev = dayjs(currentStart).subtract(1, "day").format(ISO_DATE);
  return getStatementPeriod(dayInPrev, config).periodEnd;
}

/**
 * 返回锚定日附近的连续账单周期：过去 `past` 期 + 当期 + 未来 `future` 期。
 * 用于「让用户从下拉选哪期账单」之类的场景。
 */
export function listAdjacentStatementPeriods(
  anchor: string,
  config: CreditCardConfig,
  options: { past: number; future: number },
): StatementPeriod[] {
  const current = getStatementPeriod(anchor, config);
  const periods: StatementPeriod[] = [current];

  // 向前回溯
  let cursor = current.periodEnd;
  for (let i = 0; i < options.past; i += 1) {
    cursor = getPreviousStatementPeriodEnd(cursor, config);
    periods.unshift(getStatementPeriod(cursor, config));
  }

  // 向后推进
  cursor = current.periodEnd;
  for (let i = 0; i < options.future; i += 1) {
    cursor = getNextStatementPeriodEnd(cursor, config);
    periods.push(getStatementPeriod(cursor, config));
  }

  return periods;
}

/**
 * 给定 closingDate，返回对应的扣款日（dueDate）。
 *
 * 规则：dueDate = closingDate 加 paymentMonthOffset 个月，取 paymentDay 那一天。
 *  - paymentMonthOffset = 0：当月扣款（少见）
 *  - paymentMonthOffset = 1：次月扣款（日本卡通行）
 *  - paymentMonthOffset = 2：次次月扣款
 *
 * 注：不再根据 paymentDay 与 closingDay 的数字大小推断扣款月，因为
 * 现实卡的扣款月由发卡方规则决定，跟 paymentDay 数字大小无关。
 */
export function computeDueDate(
  closingDate: Dayjs,
  paymentDay: number,
  paymentMonthOffset: PaymentMonthOffset,
): Dayjs {
  return clampDayOfMonth(closingDate.add(paymentMonthOffset, "month"), paymentDay);
}

// ── 内部辅助 ─────────────────────────────────────────────────────────────

function findClosingDateOf(target: Dayjs, config: CreditCardConfig): Dayjs {
  const currentMonthClosing = monthClosingDate(target, config.closingDay);
  const inclusive = config.cycleBoundary === "inclusive";

  // inclusive: target ≤ closingDate → 本月； 否则下月
  // exclusive: target < closingDate → 本月； 否则下月
  const fitsCurrent = inclusive
    ? !target.isAfter(currentMonthClosing)
    : target.isBefore(currentMonthClosing);

  if (fitsCurrent) {
    return currentMonthClosing;
  }
  return monthClosingDate(target.add(1, "month"), config.closingDay);
}

function closingDateToPeriodEnd(closingDate: Dayjs, boundary: CycleBoundary): Dayjs {
  return boundary === "inclusive" ? closingDate : closingDate.subtract(1, "day");
}

function monthClosingDate(anchor: Dayjs, closingDay: number): Dayjs {
  return clampDayOfMonth(anchor, closingDay);
}

function clampDayOfMonth(anchor: Dayjs, day: number): Dayjs {
  const daysInMonth = anchor.daysInMonth();
  return anchor.date(Math.min(day, daysInMonth));
}
