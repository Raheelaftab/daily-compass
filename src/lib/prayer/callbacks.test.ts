import { describe, expect, it } from "vitest";

import { parsePrayerCallbackData } from "./callbacks";

describe("parsePrayerCallbackData", () => {
  it("parses prayed callbacks", () => {
    expect(parsePrayerCallbackData("p:prayed:2026-11-27:fajr")).toEqual({
      action: "prayed",
      prayerDate: "2026-11-27",
      prayer: "fajr",
    });
  });

  it("parses snooze callbacks", () => {
    expect(parsePrayerCallbackData("p:snooze:2026-11-27:asr:10")).toEqual({
      action: "snooze",
      prayerDate: "2026-11-27",
      prayer: "asr",
      snoozeMinutes: 10,
    });
  });

  it("rejects malformed payloads", () => {
    expect(parsePrayerCallbackData("x:prayed:2026-11-27:fajr")).toBeNull();
    expect(parsePrayerCallbackData("p:prayed:bad:fajr")).toBeNull();
    expect(parsePrayerCallbackData("p:prayed:2026-11-27:zuhr")).toBeNull();
    expect(parsePrayerCallbackData("p:snooze:2026-11-27:fajr:0")).toBeNull();
    expect(parsePrayerCallbackData("p:snooze:2026-11-27:fajr:abc")).toBeNull();
  });
});
