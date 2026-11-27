import { describe, expect, it } from "vitest";

import {
  nextDueDate,
  nextDueDateOnOrAfter,
  parseRecurrence,
  serializeRecurrence,
  weekdayCode,
} from "./recurrence";

describe("parseRecurrence / serializeRecurrence", () => {
  it("round-trips daily, weekdays, weekly, monthly", () => {
    expect(serializeRecurrence(parseRecurrence("daily"))).toBe("daily");
    expect(serializeRecurrence(parseRecurrence("weekdays"))).toBe("weekdays");
    expect(serializeRecurrence(parseRecurrence("weekly:WED,MON"))).toBe(
      "weekly:MON,WED",
    );
    expect(serializeRecurrence(parseRecurrence("monthly:15"))).toBe(
      "monthly:15",
    );
  });

  it("treats null/empty/none as no recurrence", () => {
    expect(parseRecurrence(null)).toBeNull();
    expect(parseRecurrence("")).toBeNull();
    expect(parseRecurrence("none")).toBeNull();
  });

  it("rejects invalid weekly/monthly forms", () => {
    expect(parseRecurrence("weekly:")).toBeNull();
    expect(parseRecurrence("weekly:FUN")).toBeNull();
    expect(parseRecurrence("monthly:0")).toBeNull();
    expect(parseRecurrence("monthly:32")).toBeNull();
    expect(parseRecurrence("yearly")).toBeNull();
  });
});

describe("nextDueDate", () => {
  it("advances daily by one calendar day in America/New_York", () => {
    expect(nextDueDate({ type: "daily" }, "2026-11-26")).toBe("2026-11-27");
  });

  it("skips weekends for weekdays", () => {
    // 2026-11-27 is Friday
    expect(weekdayCode("2026-11-27")).toBe("FRI");
    expect(nextDueDate({ type: "weekdays" }, "2026-11-27")).toBe("2026-11-30");
  });

  it("picks the next matching weekly day", () => {
    // 2026-11-25 is Wednesday
    expect(weekdayCode("2026-11-25")).toBe("WED");
    expect(
      nextDueDate({ type: "weekly", days: ["MON", "WED"] }, "2026-11-25"),
    ).toBe("2026-11-30");
    expect(
      nextDueDate({ type: "weekly", days: ["MON", "WED"] }, "2026-11-29"),
    ).toBe("2026-11-30");
  });

  it("handles monthly month-end by clamping short months", () => {
    // From Jan 15 → Jan 31
    expect(
      nextDueDate({ type: "monthly", dayOfMonth: 31 }, "2026-01-15"),
    ).toBe("2026-01-31");
    // From Jan 31 → Feb 28 (2026 not leap)
    expect(
      nextDueDate({ type: "monthly", dayOfMonth: 31 }, "2026-01-31"),
    ).toBe("2026-02-28");
    // From Feb 28 → Mar 31
    expect(
      nextDueDate({ type: "monthly", dayOfMonth: 31 }, "2026-02-28"),
    ).toBe("2026-03-31");
    // Leap year Feb
    expect(
      nextDueDate({ type: "monthly", dayOfMonth: 31 }, "2028-01-31"),
    ).toBe("2028-02-29");
  });
});

describe("nextDueDateOnOrAfter", () => {
  it("skips past occurrences until notBefore", () => {
    const next = nextDueDateOnOrAfter(
      { type: "daily" },
      "2026-11-01",
      "2026-11-10",
    );
    expect(next).toBe("2026-11-10");
  });
});
