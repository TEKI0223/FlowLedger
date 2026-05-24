import { describe, expect, it } from "vitest";
import {
  convertToCurrency,
  formatMinorForInput,
  formatMoney,
  getTransactionBalanceImpacts,
  parseMoneyToMinor,
  type Transaction,
} from "./finance";

describe("parseMoneyToMinor", () => {
  it("parses JPY as integer yen", () => {
    expect(parseMoneyToMinor("1200", "JPY")).toBe(1200);
    expect(parseMoneyToMinor("0", "JPY")).toBe(0);
  });

  it("parses CNY as fen (2 decimal places)", () => {
    expect(parseMoneyToMinor("38.50", "CNY")).toBe(3850);
    expect(parseMoneyToMinor("100", "CNY")).toBe(10000);
    expect(parseMoneyToMinor("0.01", "CNY")).toBe(1);
  });

  it("supports negative amounts", () => {
    expect(parseMoneyToMinor("-500", "JPY")).toBe(-500);
    expect(parseMoneyToMinor("-12.34", "CNY")).toBe(-1234);
  });

  it("strips thousands separators", () => {
    expect(parseMoneyToMinor("1,200", "JPY")).toBe(1200);
    expect(parseMoneyToMinor("1,234,567", "JPY")).toBe(1234567);
  });

  it("pads partial decimal places", () => {
    expect(parseMoneyToMinor("12.3", "CNY")).toBe(1230);
    expect(parseMoneyToMinor("12.0", "CNY")).toBe(1200);
  });

  it("rejects more decimals than the currency supports", () => {
    expect(() => parseMoneyToMinor("1200.50", "JPY")).toThrow();
    expect(() => parseMoneyToMinor("12.345", "CNY")).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => parseMoneyToMinor("abc", "JPY")).toThrow();
    expect(() => parseMoneyToMinor("", "JPY")).toThrow();
    expect(() => parseMoneyToMinor("12.34.56", "CNY")).toThrow();
    expect(() => parseMoneyToMinor("1.2.3", "CNY")).toThrow();
  });
});

describe("formatMoney", () => {
  it("formats JPY with currency code and no decimals", () => {
    expect(formatMoney({ amountMinor: 1200, currency: "JPY" })).toBe("JPY 1,200");
  });

  it("formats CNY with currency code and 2 decimals", () => {
    expect(formatMoney({ amountMinor: 3850, currency: "CNY" })).toBe("CNY 38.50");
  });

  it("can hide the currency code when the surrounding UI labels the currency", () => {
    expect(formatMoney({ amountMinor: 1200, currency: "JPY" }, { showCurrencyCode: false })).toBe(
      "1,200",
    );
    expect(formatMoney({ amountMinor: 3850, currency: "CNY" }, { showCurrencyCode: false })).toBe(
      "38.50",
    );
  });

  it("handles zero", () => {
    expect(formatMoney({ amountMinor: 0, currency: "JPY" })).toBe("JPY 0");
    expect(formatMoney({ amountMinor: 0, currency: "CNY" })).toBe("CNY 0.00");
  });
});

describe("formatMinorForInput", () => {
  it("returns plain numeric strings suitable for form inputs", () => {
    expect(formatMinorForInput({ amountMinor: 1200, currency: "JPY" })).toBe("1200");
    expect(formatMinorForInput({ amountMinor: 3850, currency: "CNY" })).toBe("38.50");
    expect(formatMinorForInput({ amountMinor: 1, currency: "CNY" })).toBe("0.01");
  });

  it("round-trips with parseMoneyToMinor", () => {
    const cases: Array<{ amountMinor: number; currency: "JPY" | "CNY" }> = [
      { amountMinor: 1200, currency: "JPY" },
      { amountMinor: 0, currency: "JPY" },
      { amountMinor: 3850, currency: "CNY" },
      { amountMinor: 1, currency: "CNY" },
      { amountMinor: 1234567, currency: "JPY" },
    ];

    for (const money of cases) {
      const formatted = formatMinorForInput(money);
      expect(parseMoneyToMinor(formatted, money.currency)).toBe(money.amountMinor);
    }
  });
});

describe("convertToCurrency", () => {
  it("returns the same minor amount when source equals target", () => {
    expect(convertToCurrency({ amountMinor: 1500, currency: "JPY" }, "JPY", 21.5)).toBe(1500);
    expect(convertToCurrency({ amountMinor: 3850, currency: "CNY" }, "CNY", 21.5)).toBe(3850);
  });

  it("converts CNY to JPY using rate as JPY per 1 CNY", () => {
    // 100.00 CNY → 100 * 21.5 = 2150 JPY
    expect(convertToCurrency({ amountMinor: 10000, currency: "CNY" }, "JPY", 21.5)).toBe(2150);
    // 38.50 CNY → 38.5 * 21.5 = 827.75 → rounded to 828 JPY
    expect(convertToCurrency({ amountMinor: 3850, currency: "CNY" }, "JPY", 21.5)).toBe(828);
  });

  it("converts JPY to CNY using rate as CNY per 1 JPY", () => {
    // 2150 JPY → 2150 * (1/21.5) ≈ 100.00 CNY = 10000 minor
    const rate = 1 / 21.5;
    expect(convertToCurrency({ amountMinor: 2150, currency: "JPY" }, "CNY", rate)).toBe(10000);
  });

  it("handles zero", () => {
    expect(convertToCurrency({ amountMinor: 0, currency: "CNY" }, "JPY", 21.5)).toBe(0);
  });
});

describe("getTransactionBalanceImpacts", () => {
  const baseTx = {
    id: "t1",
    occurredOn: "2026-05-22",
    money: { amountMinor: 1500, currency: "JPY" as const },
  };

  it("income adds to target account", () => {
    const tx: Transaction = { ...baseTx, type: "income", targetAccountId: "acc-bank" };
    expect(getTransactionBalanceImpacts(tx)).toEqual([
      { accountId: "acc-bank", amountMinor: 1500 },
    ]);
  });

  it("expense subtracts from source account", () => {
    const tx: Transaction = { ...baseTx, type: "expense", sourceAccountId: "acc-paypay" };
    expect(getTransactionBalanceImpacts(tx)).toEqual([
      { accountId: "acc-paypay", amountMinor: -1500 },
    ]);
  });

  it("transfer moves between source and target", () => {
    const tx: Transaction = {
      ...baseTx,
      type: "transfer",
      sourceAccountId: "acc-bank",
      targetAccountId: "acc-paypay",
    };
    expect(getTransactionBalanceImpacts(tx)).toEqual([
      { accountId: "acc-bank", amountMinor: -1500 },
      { accountId: "acc-paypay", amountMinor: 1500 },
    ]);
  });

  it("adjustment applies signed amount to target account", () => {
    const negative: Transaction = {
      ...baseTx,
      money: { amountMinor: -200, currency: "JPY" },
      type: "adjustment",
      targetAccountId: "acc-cash",
    };
    expect(getTransactionBalanceImpacts(negative)).toEqual([
      { accountId: "acc-cash", amountMinor: -200 },
    ]);

    const positive: Transaction = {
      ...baseTx,
      money: { amountMinor: 300, currency: "JPY" },
      type: "adjustment",
      targetAccountId: "acc-cash",
    };
    expect(getTransactionBalanceImpacts(positive)).toEqual([
      { accountId: "acc-cash", amountMinor: 300 },
    ]);
  });

  it("uses absolute amount for non-adjustment types", () => {
    const tx: Transaction = {
      ...baseTx,
      money: { amountMinor: -1500, currency: "JPY" },
      type: "expense",
      sourceAccountId: "acc-paypay",
    };
    expect(getTransactionBalanceImpacts(tx)).toEqual([
      { accountId: "acc-paypay", amountMinor: -1500 },
    ]);
  });

  it("returns no impacts when required accounts are missing", () => {
    expect(getTransactionBalanceImpacts({ ...baseTx, type: "income" })).toEqual([]);
    expect(getTransactionBalanceImpacts({ ...baseTx, type: "expense" })).toEqual([]);
    expect(getTransactionBalanceImpacts({ ...baseTx, type: "adjustment" })).toEqual([]);
  });

  it("transfer with only source still subtracts from it", () => {
    const tx: Transaction = {
      ...baseTx,
      type: "transfer",
      sourceAccountId: "acc-bank",
    };
    expect(getTransactionBalanceImpacts(tx)).toEqual([
      { accountId: "acc-bank", amountMinor: -1500 },
    ]);
  });
});
