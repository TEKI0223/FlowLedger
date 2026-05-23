import dayjs, { type Dayjs } from "dayjs";
import { ISO_DATE } from "@/lib/dates";

export type CycleBoundary = "inclusive" | "exclusive";

export type CreditCardConfig = {
  closingDay: number;
  paymentDay: number;
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
  const previousClosingDate = monthClosingDate(
    closingDate.subtract(1, "month"),
    config.closingDay,
  );

  const periodEnd = closingDateToPeriodEnd(closingDate, config.cycleBoundary);
  const previousPeriodEnd = closingDateToPeriodEnd(previousClosingDate, config.cycleBoundary);
  const periodStart = previousPeriodEnd.add(1, "day");
  const dueDate = computeDueDate(closingDate, config.paymentDay);

  return {
    periodStart: periodStart.format(ISO_DATE),
    periodEnd: periodEnd.format(ISO_DATE),
    dueDate: dueDate.format(ISO_DATE),
  };
}

/**
 * 给定一个账单周期的 periodEnd，返回下一期的 periodEnd。
 */
export function getNextStatementPeriodEnd(
  periodEnd: string,
  config: CreditCardConfig,
): string {
  const nextDayInsideNextPeriod = dayjs(periodEnd).add(1, "day").format(ISO_DATE);
  return getStatementPeriod(nextDayInsideNextPeriod, config).periodEnd;
}

/**
 * 给定 closingDate，返回对应的扣款日（dueDate）。
 *
 * 规则：dueDate 是 closingDate 之后第一个 paymentDay。
 *  - 通常 paymentDay < closingDay → 下个月扣款
 *  - 如果 paymentDay > closingDay → 同月扣款
 */
export function computeDueDate(periodEnd: Dayjs, paymentDay: number): Dayjs {
  const sameMonthDue = clampDayOfMonth(periodEnd, paymentDay);
  if (sameMonthDue.isAfter(periodEnd)) {
    return sameMonthDue;
  }
  return clampDayOfMonth(periodEnd.add(1, "month"), paymentDay);
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
