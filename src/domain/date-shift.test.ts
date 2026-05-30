import { describe, expect, it } from "vitest";
import {
  adjustToBusinessDay,
  getEffectiveRecurringDate,
  isJapaneseNonBusinessDay,
  resolveShiftDirection,
} from "./date-shift";

describe("isJapaneseNonBusinessDay", () => {
  it("identifies weekends", () => {
    // 2026-06-27 是周六，2026-06-28 是周日
    expect(isJapaneseNonBusinessDay("2026-06-27")).toBe(true);
    expect(isJapaneseNonBusinessDay("2026-06-28")).toBe(true);
  });

  it("identifies regular weekdays as business days", () => {
    expect(isJapaneseNonBusinessDay("2026-06-26")).toBe(false);
    expect(isJapaneseNonBusinessDay("2026-06-29")).toBe(false);
  });

  it("identifies Japanese national holidays (祝日)", () => {
    // 元日 — 周四，确保不是仅靠周末判断
    expect(isJapaneseNonBusinessDay("2026-01-01")).toBe(true);
    // 建国記念の日（2026-02-11 是周三）
    expect(isJapaneseNonBusinessDay("2026-02-11")).toBe(true);
  });
});

describe("adjustToBusinessDay", () => {
  it("returns the input when direction is none", () => {
    expect(adjustToBusinessDay("2026-06-27", "none")).toBe("2026-06-27");
  });

  it("shifts a Saturday backward to the previous Friday", () => {
    // 2026-06-27 (Sat) → 2026-06-26 (Fri)
    expect(adjustToBusinessDay("2026-06-27", "previous")).toBe("2026-06-26");
  });

  it("shifts a Sunday forward to the next Monday", () => {
    // 2026-06-28 (Sun) → 2026-06-29 (Mon)
    expect(adjustToBusinessDay("2026-06-28", "next")).toBe("2026-06-29");
  });

  it("leaves business days unchanged", () => {
    expect(adjustToBusinessDay("2026-06-26", "previous")).toBe("2026-06-26");
    expect(adjustToBusinessDay("2026-06-26", "next")).toBe("2026-06-26");
  });

  it("skips Japanese holidays when shifting forward", () => {
    // Golden Week 2026: 5/3 日, 5/4 月(みどり), 5/5 火(こども), 5/6 水(振替)
    // 5/3 (Sun) → forward 应该跳到 5/7 (Thu)
    expect(adjustToBusinessDay("2026-05-03", "next")).toBe("2026-05-07");
  });

  it("skips Japanese holidays when shifting backward", () => {
    // 5/4 (Mon, みどり) → previous 应该回到 5/1 (Fri)
    expect(adjustToBusinessDay("2026-05-04", "previous")).toBe("2026-05-01");
  });
});

describe("resolveShiftDirection", () => {
  it("auto policy uses income→previous, expense→next, transfer→none", () => {
    expect(resolveShiftDirection("income", "auto")).toBe("previous");
    expect(resolveShiftDirection("expense", "auto")).toBe("next");
    expect(resolveShiftDirection("transfer", "auto")).toBe("none");
  });

  it("explicit policies override the type-based default", () => {
    expect(resolveShiftDirection("income", "next")).toBe("next");
    expect(resolveShiftDirection("expense", "none")).toBe("none");
    expect(resolveShiftDirection("transfer", "previous")).toBe("previous");
  });
});

describe("getEffectiveRecurringDate", () => {
  it("salary on a Saturday is paid the prior Friday", () => {
    expect(
      getEffectiveRecurringDate({
        type: "income",
        nextDate: "2026-06-27",
        dateShiftPolicy: "auto",
      }),
    ).toBe("2026-06-26");
  });

  it("rent on a Sunday is paid the following Monday", () => {
    expect(
      getEffectiveRecurringDate({
        type: "expense",
        nextDate: "2026-06-28",
        dateShiftPolicy: "auto",
      }),
    ).toBe("2026-06-29");
  });

  it("explicit none keeps the nominal date even for weekends", () => {
    expect(
      getEffectiveRecurringDate({
        type: "income",
        nextDate: "2026-06-27",
        dateShiftPolicy: "none",
      }),
    ).toBe("2026-06-27");
  });
});
