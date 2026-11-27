import { describe, expect, it } from "vitest";

import {
  addMonths,
  formatMonthLabel,
  isMonthKey,
  monthEnd,
  monthStart,
  weeksInMonth,
} from "./dates";

describe("month date helpers", () => {
  it("validates YYYY-MM keys", () => {
    expect(isMonthKey("2026-11")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("2026-11-01")).toBe(false);
  });

  it("resolves month start/end including February", () => {
    expect(monthStart("2026-11")).toBe("2026-11-01");
    expect(monthEnd("2026-11")).toBe("2026-11-30");
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
  });

  it("adds months and formats labels", () => {
    expect(addMonths("2026-11", -1)).toBe("2026-10");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(formatMonthLabel("2026-11")).toBe("November 2026");
  });

  it("computes week-equivalents as days/7", () => {
    expect(weeksInMonth("2026-11")).toBeCloseTo(30 / 7, 5);
    expect(weeksInMonth("2026-02")).toBeCloseTo(28 / 7, 5);
  });
});
