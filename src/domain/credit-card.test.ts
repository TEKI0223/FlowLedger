import { describe, expect, it } from "vitest";
import {
  getNextStatementPeriodEnd,
  getStatementPeriod,
  listAdjacentStatementPeriods,
} from "./credit-card";

const cardInclusive = {
  closingDay: 25,
  paymentDay: 10,
  paymentMonthOffset: 1 as const,
  cycleBoundary: "inclusive" as const,
};

const cardExclusive = {
  closingDay: 25,
  paymentDay: 10,
  paymentMonthOffset: 1 as const,
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
    const card = {
      closingDay: 31,
      paymentDay: 10,
      paymentMonthOffset: 1 as const,
      cycleBoundary: "inclusive" as const,
    };
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

describe("computeDueDate via paymentMonthOffset", () => {
  it("paymentMonthOffset=0 → 当月扣款", () => {
    const card = {
      closingDay: 5,
      paymentDay: 27,
      paymentMonthOffset: 0 as const,
      cycleBoundary: "inclusive" as const,
    };
    expect(getStatementPeriod("2026-05-03", card)).toEqual({
      periodStart: "2026-04-06",
      periodEnd: "2026-05-05",
      dueDate: "2026-05-27",
    });
  });

  it("paymentMonthOffset=1 → 次月扣款（即便 paymentDay > closingDay）", () => {
    // 真实场景：closingDay=25, paymentDay=26（数字上 26 > 25 但仍次月）
    const card = {
      closingDay: 25,
      paymentDay: 26,
      paymentMonthOffset: 1 as const,
      cycleBoundary: "inclusive" as const,
    };
    // 5/25 闭账 → 应于 6/26 还款；本期范围 4/26 ~ 5/25
    expect(getStatementPeriod("2026-05-25", card)).toEqual({
      periodStart: "2026-04-26",
      periodEnd: "2026-05-25",
      dueDate: "2026-06-26",
    });
  });

  it("paymentMonthOffset=2 → 次次月扣款", () => {
    const card = {
      closingDay: 25,
      paymentDay: 10,
      paymentMonthOffset: 2 as const,
      cycleBoundary: "inclusive" as const,
    };
    // 5/25 闭账 → 应于 7/10 还款
    expect(getStatementPeriod("2026-05-25", card).dueDate).toBe("2026-07-10");
  });
});

describe("listAdjacentStatementPeriods", () => {
  it("返回过去1期 + 当期 + 未来2期，按时间顺序排列", () => {
    // anchor 在 5/30，cardInclusive 当期是 4/26~5/25 还是 5/26~6/25？
    // closingDay=25 inclusive：5/30 > 5/25 → 归下一期，当期 closingDate = 6/25
    // 所以当期是 5/26 ~ 6/25
    const periods = listAdjacentStatementPeriods("2026-05-30", cardInclusive, {
      past: 1,
      future: 2,
    });
    expect(periods.length).toBe(4);
    expect(periods[0].periodEnd).toBe("2026-05-25"); // past
    expect(periods[1].periodEnd).toBe("2026-06-25"); // current
    expect(periods[2].periodEnd).toBe("2026-07-25");
    expect(periods[3].periodEnd).toBe("2026-08-25");
  });

  it("past=0, future=0 时只返回当期", () => {
    const periods = listAdjacentStatementPeriods("2026-05-30", cardInclusive, {
      past: 0,
      future: 0,
    });
    expect(periods.length).toBe(1);
  });
});

describe("getNextStatementPeriodEnd", () => {
  it("简单推进", () => {
    expect(getNextStatementPeriodEnd("2026-05-25", cardInclusive)).toBe("2026-06-25");
  });

  it("月末 clamp", () => {
    const card = {
      closingDay: 31,
      paymentDay: 10,
      paymentMonthOffset: 1 as const,
      cycleBoundary: "inclusive" as const,
    };
    expect(getNextStatementPeriodEnd("2026-01-31", card)).toBe("2026-02-28");
    expect(getNextStatementPeriodEnd("2026-02-28", card)).toBe("2026-03-31");
  });
});
