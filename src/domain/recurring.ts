import dayjs, { type ManipulateType } from "dayjs";
import { ISO_DATE, todayIsoDate } from "@/lib/dates";

export const recurringFrequencies = ["monthly", "weekly", "yearly"] as const;

export type RecurringFrequency = (typeof recurringFrequencies)[number];

export const recurringFrequencyLabels: Record<RecurringFrequency, string> = {
  monthly: "每月",
  weekly: "每周",
  yearly: "每年",
};

const frequencyUnit: Record<RecurringFrequency, ManipulateType> = {
  monthly: "month",
  weekly: "week",
  yearly: "year",
};

/**
 * 给定上一次发生日期和周期，返回下一次发生日期（ISO 日期字符串）。
 *
 * 月末日会被 dayjs 自动 clamp：
 *  - 2026-01-31 + monthly => 2026-02-28
 *  - 2024-02-29 + yearly  => 2025-02-28
 */
export function getNextOccurrence(currentDate: string, frequency: RecurringFrequency): string {
  return dayjs(currentDate).add(1, frequencyUnit[frequency]).format(ISO_DATE);
}

/**
 * 判断一个周期项是否需要在 `today` 之前确认（包含 today 当日）。
 */
export function isRecurringPending(nextDate: string, today: string = todayIsoDate()): boolean {
  return !dayjs(nextDate).isAfter(dayjs(today));
}
