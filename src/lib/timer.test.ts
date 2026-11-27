import { describe, expect, it } from "vitest";

import {
  elapsedMinutes,
  formatElapsedClock,
  logDateFromStartedAt,
  needsStopConfirmation,
  SIX_HOURS_MS,
} from "./timer";

describe("elapsedMinutes", () => {
  it("rounds to the nearest minute with a minimum of 1", () => {
    const start = new Date("2026-11-26T15:00:00.000Z");
    expect(elapsedMinutes(start, new Date("2026-11-26T15:00:20.000Z"))).toBe(1);
    expect(elapsedMinutes(start, new Date("2026-11-26T15:01:20.000Z"))).toBe(1);
    expect(elapsedMinutes(start, new Date("2026-11-26T15:01:30.000Z"))).toBe(2);
    expect(elapsedMinutes(start, new Date("2026-11-26T16:00:00.000Z"))).toBe(60);
  });
});

describe("logDateFromStartedAt", () => {
  it("uses America/New_York calendar day at the UTC boundary", () => {
    // 2026-11-27 04:30 UTC = 2026-11-26 23:30 ET
    expect(
      logDateFromStartedAt(new Date("2026-11-27T04:30:00.000Z")),
    ).toBe("2026-11-26");
    // 2026-11-27 05:00 UTC = 2026-11-27 00:00 ET
    expect(
      logDateFromStartedAt(new Date("2026-11-27T05:00:00.000Z")),
    ).toBe("2026-11-27");
  });
});

describe("needsStopConfirmation", () => {
  it("is true only after more than 6 hours", () => {
    const start = new Date("2026-11-26T10:00:00.000Z");
    expect(
      needsStopConfirmation(
        start,
        new Date(start.getTime() + SIX_HOURS_MS),
      ),
    ).toBe(false);
    expect(
      needsStopConfirmation(
        start,
        new Date(start.getTime() + SIX_HOURS_MS + 1),
      ),
    ).toBe(true);
  });
});

describe("formatElapsedClock", () => {
  it("formats under and over one hour", () => {
    const start = new Date("2026-11-26T10:00:00.000Z");
    expect(
      formatElapsedClock(start, new Date("2026-11-26T10:05:09.000Z")),
    ).toBe("5:09");
    expect(
      formatElapsedClock(start, new Date("2026-11-26T11:05:09.000Z")),
    ).toBe("1:05:09");
  });
});
