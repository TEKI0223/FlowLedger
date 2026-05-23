export const refundStatuses = ["pending", "partial", "received", "cancelled"] as const;

export type RefundStatus = (typeof refundStatuses)[number];

export const refundStatusLabels: Record<RefundStatus, string> = {
  pending: "待退款",
  partial: "部分到账",
  received: "已到账",
  cancelled: "已取消",
};

/**
 * 给定应退金额 + 已收金额 + 是否手动取消，返回当前退款状态。
 */
export function computeRefundStatus(
  expectedMinor: number,
  receivedMinor: number,
  cancelled: boolean,
): RefundStatus {
  if (cancelled) return "cancelled";
  if (receivedMinor <= 0) return "pending";
  if (receivedMinor >= expectedMinor) return "received";
  return "partial";
}

/**
 * 返回剩余未收金额（不为负）。
 */
export function refundRemainingMinor(expectedMinor: number, receivedMinor: number): number {
  return Math.max(0, expectedMinor - receivedMinor);
}
