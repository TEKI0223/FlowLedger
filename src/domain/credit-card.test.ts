import { describe, expect, it } from "vitest";
import { getNextStatementPeriodEnd, getStatementPeriod } from "./credit-card";

const cardInclusive = {
  closingDay: 25,
  paymentDay: 10,
  cycleBoundary: "inclusive" as const,
};

const cardExclusive = {
  closingDay: 25,
  paymentDay: 10,
  cycleBoundary: "exclusive" as const,
};

describe("getStatementPeriod (inclusive)", () => {
  it("把 closingDay 当天的消费归本期", () => {
    expect(getStatementPeriod("2026-05-25", cardInclusive)).toEqual({
      periodStart: "2026-04-26",
      periodEnd: "2026-05-25",
      dueDate: "2026-06-10",
    });
  });

  it("closingDay 之后一天归下一期", () => {
    expect(getStatementPeriod("2026-05-26", cardInclusive)).toEqual({
      periodStart: "2026-05-26",
      periodEnd: "2026-06-25",
      dueDate: "2026-07-10",
    });
  });

  it("月初消费归本期（在 closingDay 之前）", () => {
    expect(getStatementPeriod("2026-05-03", cardInclusive)).toEqual({
      periodStart: "2026-04-26",
      periodEnd: "2026-05-25",
      dueDate: "2026-06-10",
    });
  });
});

describe("getStatementPeriod (exclusive)", () => {
  it("closingDay 当天归下一期", () => {
    expect(getStatementPeriod("2026-05-25", cardExclusive)).toEqual({
      periodStart: "2026-05-25",
      periodEnd: "2026-06-24",
      dueDate: "2026-07-10",
    });
  });

  it("closingDay 前一天归本期", () => {
    expect(getStatementPeriod("2026-05-24", cardExclusive)).toEqual({
      periodStart: "2026-04-25",
      periodEnd: "2026-05-24",
      dueDate: "2026-06-10",
    });
  });
});

describe("getStatementPeriod 月末 clamp", () => {
  it("closingDay=31，2 月的 closingDate clamp 到月底", () => {
    const card = { closingDay: 31, paymentDay: 10, cycleBoundary: "inclusive" as const };
    // 2026 年 2 月 28 天
    expect(getStatementPeriod("2026-02-28", card)).toEqual({
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
      dueDate: "2026-03-10",
    });
    // 2024 闰年 2 月 29 天
    expect(getStatementPeriod("2024-02-29", card)).toEqual({
      periodStart: "2024-02-01",
      periodEnd: "2024-02-29",
      dueDate: "2024-03-10",
    });
  });
});

describe("computeDueDate (内嵌在 getStatementPeriod 测试里)", () => {
  it("paymentDay > closingDay → 同月扣款", () => {
    const card = { closingDay: 5, paymentDay: 27, cycleBoundary: "inclusive" as const };
    expect(getStatementPeriod("2026-05-03", card)).toEqual({
      periodStart: "2026-04-06",
      periodEnd: "2026-05-05",
      dueDate: "2026-05-27",
    });
  });
});

describe("getNextStatementPeriodEnd", () => {
  it("简单推进", () => {
    expect(getNextStatementPeriodEnd("2026-05-25", cardInclusive)).toBe("2026-06-25");
  });

  it("月末 clamp", () => {
    const card = { closingDay: 31, paymentDay: 10, cycleBoundary: "inclusive" as const };
    expect(getNextStatementPeriodEnd("2026-01-31", card)).toBe("2026-02-28");
    expect(getNextStatementPeriodEnd("2026-02-28", card)).toBe("2026-03-31");
  });
});
