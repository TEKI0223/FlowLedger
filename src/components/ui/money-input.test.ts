import { describe, expect, it } from "vitest";
import { formatWithCommas, stripCommas } from "./money-input";

describe("formatWithCommas", () => {
  it("空字符串原样返回", () => {
    expect(formatWithCommas("")).toBe("");
  });

  it("小于 1000 的整数不变", () => {
    expect(formatWithCommas("0")).toBe("0");
    expect(formatWithCommas("999")).toBe("999");
  });

  it("1000 起每三位插入千分位", () => {
    expect(formatWithCommas("1000")).toBe("1,000");
    expect(formatWithCommas("1234567")).toBe("1,234,567");
  });

  it("保留小数部分", () => {
    expect(formatWithCommas("1234.56")).toBe("1,234.56");
    expect(formatWithCommas("12345.6789")).toBe("12,345.6789");
  });

  it("负数前缀", () => {
    expect(formatWithCommas("-1234")).toBe("-1,234");
    expect(formatWithCommas("-1234.5")).toBe("-1,234.5");
  });

  it("非法数字原样返回，不要吃掉用户输入", () => {
    expect(formatWithCommas("abc")).toBe("abc");
    expect(formatWithCommas("12.3.4")).toBe("12.3.4");
  });
});

describe("stripCommas", () => {
  it("去掉所有逗号", () => {
    expect(stripCommas("1,000")).toBe("1000");
    expect(stripCommas("1,234,567.89")).toBe("1234567.89");
  });

  it("没有逗号时不变", () => {
    expect(stripCommas("1234")).toBe("1234");
    expect(stripCommas("")).toBe("");
  });
});

describe("formatWithCommas + stripCommas 往返", () => {
  it("整数往返一致", () => {
    const cases = ["0", "999", "1000", "1234567", "99999999"];
    for (const raw of cases) {
      expect(stripCommas(formatWithCommas(raw))).toBe(raw);
    }
  });

  it("带小数也一致", () => {
    const cases = ["1234.56", "0.01", "12.0"];
    for (const raw of cases) {
      expect(stripCommas(formatWithCommas(raw))).toBe(raw);
    }
  });
});
