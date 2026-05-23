import { describe, expect, it } from "vitest";
import {
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
