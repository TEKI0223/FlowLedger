import dayjs, { type ManipulateType } from "dayjs";
import {
  getEffectiveRecurringDate,
  type DateShiftPolicy,
  type ShiftableRecurringType,
} from "@/domain/date-shift";
import { ISO_DATE, todayIsoDate } from "@/lib/dates";

export const recurringFrequencies = ["weekly", "monthly", "bimonthly", "yearly"] as const;

export type RecurringFrequency = (typeof recurringFrequencies)[number];

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  monthly: "每月",
  weekly: "每周",
  bimonthly: "每两月",
  yearly: "每年",
};

const frequencyStep: Record<RecurringFrequency, { amount: number; unit: ManipulateType }> = {
  weekly: { amount: 1, unit: "week" },
  monthly: { amount: 1, unit: "month" },
  bimonthly: { amount: 2, unit: "month" },
  yearly: { amount: 1, unit: "year" },
};

/**
 * 给定上一次发生日期和周期，返回下一次发生日期（ISO 日期字符串）。
 *
 * 月末日会被 dayjs 自动 clamp：
 *  - 2026-01-31 + monthly => 2026-02-28
 *  - 2024-02-29 + yearly  => 2025-02-28
 */
export function getNextOccurrence(currentDate: string, frequency: RecurringFrequency): string {
  const step = frequencyStep[frequency];
  return dayjs(currentDate).add(step.amount, step.unit).format(ISO_DATE);
}

/**
 * 判断一个周期项是否需要在 `today` 之前确认（包含 today 当日）。
 */
export function isRecurringPending(nextDate: string, today: string = todayIsoDate()): boolean {
  return !dayjs(nextDate).isAfter(dayjs(today));
}

/**
 * 按调整后的实际营业日判断周期项是否待确认。
 * UI / 服务层应优先使用这个函数而不是原始 `isRecurringPending`。
 */
export function isRecurringItemPending(
  item: {
    type: ShiftableRecurringType;
    nextDate: string;
    dateShiftPolicy: DateShiftPolicy;
  },
  today: string = todayIsoDate(),
): boolean {
  return isRecurringPending(getEffectiveRecurringDate(item), today);
}
