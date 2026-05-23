import { describe, expect, it } from "vitest";
import { getNextOccurrence, isRecurringPending } from "./recurring";

describe("getNextOccurrence", () => {
  it("advances monthly", () => {
    expect(getNextOccurrence("2026-01-15", "monthly")).toBe("2026-02-15");
    expect(getNextOccurrence("2026-12-01", "monthly")).toBe("2027-01-01");
  });

  it("clamps month-end correctly", () => {
    expect(getNextOccurrence("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(getNextOccurrence("2024-01-31", "monthly")).toBe("2024-02-29");
  });

  it("advances weekly by 7 days", () => {
    expect(getNextOccurrence("2026-05-01", "weekly")).toBe("2026-05-08");
    expect(getNextOccurrence("2026-12-28", "weekly")).toBe("2027-01-04");
  });

  it("advances yearly", () => {
    expect(getNextOccurrence("2026-05-23", "yearly")).toBe("2027-05-23");
    // 闰年日 + 1 年应 clamp
    expect(getNextOccurrence("2024-02-29", "yearly")).toBe("2025-02-28");
  });
});

describe("isRecurringPending", () => {
  it("returns true when nextDate is before today", () => {
    expect(isRecurringPending("2026-05-20", "2026-05-23")).toBe(true);
  });

  it("returns true when nextDate equals today", () => {
    expect(isRecurringPending("2026-05-23", "2026-05-23")).toBe(true);
  });

  it("returns false when nextDate is after today", () => {
    expect(isRecurringPending("2026-06-01", "2026-05-23")).toBe(false);
  });
});
