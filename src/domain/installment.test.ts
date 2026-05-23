import { describe, expect, it } from "vitest";
import {
  classifyInstallmentFee,
  computeInstallmentDueDates,
  computeInstallmentStatus,
} from "./installment";

describe("computeInstallmentDueDates", () => {
  it("常规月度递增", () => {
    expect(computeInstallmentDueDates("2026-05-10", 3)).toEqual([
      "2026-05-10",
      "2026-06-10",
      "2026-07-10",
    ]);
  });

  it("跨年", () => {
    expect(computeInstallmentDueDates("2026-11-15", 3)).toEqual([
      "2026-11-15",
      "2026-12-15",
      "2027-01-15",
    ]);
  });

  it("月末 clamp", () => {
    expect(computeInstallmentDueDates("2026-01-31", 4)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("0 期返回空数组", () => {
    expect(computeInstallmentDueDates("2026-05-10", 0)).toEqual([]);
  });
});

describe("classifyInstallmentFee", () => {
  it("整除时无利息", () => {
    // 12000 / 12 = 1000，12 × 1000 = 12000，fee = 0
    expect(classifyInstallmentFee(0, 12)).toEqual({
      kind: "none",
      totalMinor: 0,
      perPeriodMinor: 0,
    });
  });

  it("rounding 容差以内当无利息（JPY 10000/3）", () => {
    // floor(10000/3) = 3333，3 × 3333 = 9999，fee = -1，|fee| < periods=3
    expect(classifyInstallmentFee(-1, 3)).toEqual({
      kind: "none",
      totalMinor: 0,
      perPeriodMinor: 0,
    });
  });

  it("12 期 rounding 上限 ±11 都算无利息", () => {
    expect(classifyInstallmentFee(-11, 12).kind).toBe("none");
    expect(classifyInstallmentFee(11, 12).kind).toBe("none");
  });

  it("超过容差按实际利息显示", () => {
    // 12 期 ¥12 利息 = 每期 ¥1
    expect(classifyInstallmentFee(12, 12)).toEqual({
      kind: "interest",
      totalMinor: 12,
      perPeriodMinor: 1,
    });
  });

  it("负数大于容差按回扣显示", () => {
    expect(classifyInstallmentFee(-1200, 12)).toEqual({
      kind: "rebate",
      totalMinor: 1200,
      perPeriodMinor: 100,
    });
  });

  it("periods 为 0 也不会崩", () => {
    expect(classifyInstallmentFee(100, 0).kind).toBe("none");
  });
});

describe("computeInstallmentStatus", () => {
  it("cancelled 优先", () => {
    expect(computeInstallmentStatus(0, 12, true)).toBe("cancelled");
    expect(computeInstallmentStatus(12, 12, true)).toBe("cancelled");
  });

  it("未完成 → active", () => {
    expect(computeInstallmentStatus(0, 12, false)).toBe("active");
    expect(computeInstallmentStatus(5, 12, false)).toBe("active");
  });

  it("完成 → completed", () => {
    expect(computeInstallmentStatus(12, 12, false)).toBe("completed");
    expect(computeInstallmentStatus(13, 12, false)).toBe("completed");
  });
});
