import holiday_jp from "@holiday-jp/holiday_jp";
import dayjs from "dayjs";
import { ISO_DATE } from "@/lib/dates";

export const dateShiftPolicies = ["auto", "none", "previous", "next"] as const;

export type DateShiftPolicy = (typeof dateShiftPolicies)[number];

export const dateShiftPolicyLabels: Record<DateShiftPolicy, string> = {
  auto: "默认（按类型自动）",
  none: "不调整",
  previous: "提前到上一个工作日",
  next: "顺延到下一个工作日",
};

export type ShiftDirection = "none" | "previous" | "next";

export type ShiftableRecurringType = "income" | "expense" | "transfer";

const autoDirectionByType: Record<ShiftableRecurringType, ShiftDirection> = {
  income: "previous",
  expense: "next",
  transfer: "none",
};

const holidayMap = holiday_jp.holidays as Record<string, unknown>;

/**
 * 判断给定日期是否为日本的「非营业日」：周六、周日或日本法定祝日。
 */
export function isJapaneseNonBusinessDay(isoDate: string): boolean {
  const day = dayjs(isoDate).day();
  if (day === 0 || day === 6) return true;
  return Object.prototype.hasOwnProperty.call(holidayMap, isoDate);
}

/**
 * 把策略解析成实际的调整方向。`auto` 按类型映射：
 *  - income  → previous（工资遇周末/祝日时提前发放）
 *  - expense → next（房租 / 信用卡还款顺延到下一个营业日）
 *  - transfer → none
 */
export function resolveShiftDirection(
  type: ShiftableRecurringType,
  policy: DateShiftPolicy,
): ShiftDirection {
  if (policy === "auto") return autoDirectionByType[type];
  return policy;
}

/**
 * 把 ISO 日期调整到最近的营业日。遇到连续假期会持续步进，直到落到工作日。
 * direction === "none" 时原样返回。
 */
export function adjustToBusinessDay(isoDate: string, direction: ShiftDirection): string {
  if (direction === "none") return isoDate;
  const step = direction === "previous" ? -1 : 1;
  let current = dayjs(isoDate);
  // 上限 14 天保护：日本最长连假远小于此（避免极端情况下死循环）。
  for (let i = 0; i < 14; i += 1) {
    const formatted = current.format(ISO_DATE);
    if (!isJapaneseNonBusinessDay(formatted)) return formatted;
    current = current.add(step, "day");
  }
  return current.format(ISO_DATE);
}

/**
 * 综合 helper：传入周期项的关键字段，返回调整后用于展示和确认的实际日期。
 */
export function getEffectiveRecurringDate(item: {
  type: ShiftableRecurringType;
  nextDate: string;
  dateShiftPolicy: DateShiftPolicy;
}): string {
  const direction = resolveShiftDirection(item.type, item.dateShiftPolicy);
  return adjustToBusinessDay(item.nextDate, direction);
}
