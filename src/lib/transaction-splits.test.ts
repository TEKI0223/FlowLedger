import { describe, expect, it } from "vitest";
import { parseSplitsJson, validateSplits } from "./transaction-splits";

describe("parseSplitsJson", () => {
  it("returns empty for null / undefined / non-JSON", () => {
    expect(parseSplitsJson(null)).toEqual([]);
    expect(parseSplitsJson(undefined)).toEqual([]);
    expect(parseSplitsJson("")).toEqual([]);
    expect(parseSplitsJson("not-json")).toEqual([]);
    expect(parseSplitsJson("{}")).toEqual([]);
  });

  it("filters out rows missing categoryId or amount", () => {
    const json = JSON.stringify([
      { categoryId: "grocery", amount: "1000" },
      { categoryId: "", amount: "100" },
      { categoryId: "daily-goods", amount: "" },
      { categoryId: "daily-goods", amount: "  " },
      { foo: "bar" },
    ]);
    expect(parseSplitsJson(json)).toEqual([{ categoryId: "grocery", amount: "1000" }]);
  });

  it("trims whitespace from fields", () => {
    const json = JSON.stringify([{ categoryId: "  grocery  ", amount: "  1000  " }]);
    expect(parseSplitsJson(json)).toEqual([{ categoryId: "grocery", amount: "1000" }]);
  });
});

describe("validateSplits", () => {
  it("empty splits returns the full total as main", () => {
    const result = validateSplits([], 100000, "JPY", "grocery");
    expect(result).toEqual({ ok: true, splits: [], mainAmountMinor: 100000 });
  });

  it("subtracts split sum from main amount (JPY)", () => {
    const result = validateSplits(
      [{ categoryId: "daily-goods", amount: "258" }],
      1088,
      "JPY",
      "grocery",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mainAmountMinor).toBe(830);
      expect(result.splits).toEqual([{ categoryId: "daily-goods", amountMinor: 258 }]);
    }
  });

  it("handles CNY decimal correctly", () => {
    const result = validateSplits(
      [{ categoryId: "snacks", amount: "12.34" }],
      // 100.00 CNY in minor
      10000,
      "CNY",
      "grocery",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mainAmountMinor).toBe(10000 - 1234);
    }
  });

  it("rejects when split sum exceeds total", () => {
    const result = validateSplits(
      [
        { categoryId: "daily-goods", amount: "600" },
        { categoryId: "snacks", amount: "600" },
      ],
      1000,
      "JPY",
      "grocery",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("超过");
      expect(result.index).toBe(-1);
    }
  });

  it("allows split sum equal to total (main becomes 0)", () => {
    const result = validateSplits(
      [{ categoryId: "daily-goods", amount: "1088" }],
      1088,
      "JPY",
      "grocery",
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mainAmountMinor).toBe(0);
  });

  it("rejects empty categoryId", () => {
    const result = validateSplits([{ categoryId: "", amount: "100" }], 1000, "JPY", "grocery");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.index).toBe(0);
  });

  it("rejects duplicate categoryId within splits", () => {
    const result = validateSplits(
      [
        { categoryId: "daily-goods", amount: "200" },
        { categoryId: "daily-goods", amount: "100" },
      ],
      1000,
      "JPY",
      "grocery",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.index).toBe(1);
  });

  it("rejects split categoryId equal to main categoryId", () => {
    const result = validateSplits(
      [{ categoryId: "grocery", amount: "200" }],
      1000,
      "JPY",
      "grocery",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.index).toBe(0);
  });

  it("rejects negative or zero amounts", () => {
    const zero = validateSplits(
      [{ categoryId: "daily-goods", amount: "0" }],
      1000,
      "JPY",
      "grocery",
    );
    expect(zero.ok).toBe(false);
    const neg = validateSplits(
      [{ categoryId: "daily-goods", amount: "-100" }],
      1000,
      "JPY",
      "grocery",
    );
    expect(neg.ok).toBe(false);
  });

  it("rejects malformed amount strings", () => {
    const result = validateSplits(
      [{ categoryId: "daily-goods", amount: "abc" }],
      1000,
      "JPY",
      "grocery",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("格式");
      expect(result.index).toBe(0);
    }
  });
});
