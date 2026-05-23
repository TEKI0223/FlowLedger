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
