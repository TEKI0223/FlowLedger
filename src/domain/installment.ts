import dayjs from "dayjs";
import { ISO_DATE } from "@/lib/dates";

export const installmentStatuses = ["active", "completed", "cancelled"] as const;

export type InstallmentStatus = (typeof installmentStatuses)[number];

export const installmentStatusLabels: Record<InstallmentStatus, string> = {
  active: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

/**
 * 给定首期日期和总期数，返回所有期数的扣款日期数组（按月推进，月末自动 clamp）。
 */
export function computeInstallmentDueDates(firstPaymentOn: string, periods: number): string[] {
  const start = dayjs(firstPaymentOn);
  const dates: string[] = [];
  for (let i = 0; i < periods; i++) {
    dates.push(start.add(i, "month").format(ISO_DATE));
  }
  return dates;
}

/**
 * 根据已完成期数 / 总期数 / 是否手动取消，推出实际状态。
 */
export function computeInstallmentStatus(
  completedPeriods: number,
  totalPeriods: number,
  cancelled: boolean,
): InstallmentStatus {
  if (cancelled) return "cancelled";
  if (completedPeriods >= totalPeriods) return "completed";
  return "active";
}

export type InstallmentFeeKind = "none" | "interest" | "rebate";

export type InstallmentFeeSummary = {
  kind: InstallmentFeeKind;
  totalMinor: number;
  perPeriodMinor: number;
};

/**
 * 把 fee（= 期数 × 每期金额 − 总金额，有符号）分类为：
 *  - "none"      无利息（含因整数除法产生的微小 rounding 误差）
 *  - "interest"  含利息（fee > 0）
 *  - "rebate"    回扣 / 折让（fee < 0）
 *
 * 容差：|fee| < 期数（即每期平均偏差不到 1 个最小货币单位）视为 rounding，不算真实利息。
 * 12 期 JPY 容差 ¥11；12 期 CNY 容差 ¥0.11。
 */
export function classifyInstallmentFee(
  feeMinor: number,
  periods: number,
): InstallmentFeeSummary {
  if (periods <= 0 || Math.abs(feeMinor) < periods) {
    return { kind: "none", totalMinor: 0, perPeriodMinor: 0 };
  }
  const absMinor = Math.abs(feeMinor);
  return {
    kind: feeMinor > 0 ? "interest" : "rebate",
    totalMinor: absMinor,
    perPeriodMinor: Math.round(absMinor / periods),
  };
}
