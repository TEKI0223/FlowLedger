import { describe, expect, it } from "vitest";
import { computeRefundStatus, refundRemainingMinor } from "./refund";

describe("computeRefundStatus", () => {
  it("cancelled 优先", () => {
    expect(computeRefundStatus(1000, 1000, true)).toBe("cancelled");
    expect(computeRefundStatus(1000, 0, true)).toBe("cancelled");
  });

  it("未收任何金额 → pending", () => {
    expect(computeRefundStatus(1000, 0, false)).toBe("pending");
  });

  it("收到部分 → partial", () => {
    expect(computeRefundStatus(1000, 500, false)).toBe("partial");
    expect(computeRefundStatus(1000, 999, false)).toBe("partial");
  });

  it("收到全部或超出 → received", () => {
    expect(computeRefundStatus(1000, 1000, false)).toBe("received");
    expect(computeRefundStatus(1000, 1200, false)).toBe("received");
  });
});

describe("refundRemainingMinor", () => {
  it("正常剩余", () => {
    expect(refundRemainingMinor(1000, 300)).toBe(700);
  });

  it("已收满 → 0", () => {
    expect(refundRemainingMinor(1000, 1000)).toBe(0);
  });

  it("超收不为负 → 0", () => {
    expect(refundRemainingMinor(1000, 1200)).toBe(0);
  });
});
