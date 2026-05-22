import { describe, expect, it } from "vitest";
import { addDays, addMonths, isBefore, toIsoDate } from "./dates";

describe("toIsoDate", () => {
  it("passes through ISO date strings", () => {
    expect(toIsoDate("2026-05-22")).toBe("2026-05-22");
  });
});

describe("addMonths", () => {
  it("adds calendar months", () => {
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonths("2026-01-15", 12)).toBe("2027-01-15");
  });

  it("clamps to month end when target month is shorter", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("handles leap year February", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });
});

describe("addDays", () => {
  it("adds whole days across month boundaries", () => {
    expect(addDays("2026-01-30", 5)).toBe("2026-02-04");
  });

  it("supports negative days", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("isBefore", () => {
  it("compares ISO dates", () => {
    expect(isBefore("2026-05-01", "2026-05-22")).toBe(true);
    expect(isBefore("2026-05-22", "2026-05-22")).toBe(false);
    expect(isBefore("2026-06-01", "2026-05-22")).toBe(false);
  });
});
