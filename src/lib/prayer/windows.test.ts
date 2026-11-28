import { describe, expect, it } from "vitest";

import {
  decideReminderAction,
  minuteKey,
  normalizeHhmm,
  nextPrayerName,
  prayerCutoff,
  wallClockToDate,
} from "./windows";

describe("normalizeHhmm", () => {
  it("normalizes AlAdhan time strings", () => {
    expect(normalizeHhmm("5:03")).toBe("05:03");
    expect(normalizeHhmm("17:45 (EST)")).toBe("17:45");
  });
});

describe("nextPrayerName / cutoff", () => {
  const times = {
    fajr: "05:30",
    dhuhr: "12:15",
    asr: "15:40",
    maghrib: "17:50",
    isha: "19:10",
  };

  it("orders prayers and wraps Isha to Fajr", () => {
    expect(nextPrayerName("fajr")).toBe("dhuhr");
    expect(nextPrayerName("isha")).toBe("fajr");
  });

  it("cuts off at the next prayer today", () => {
    const cutoff = prayerCutoff("2026-11-27", "dhuhr", times, "05:31");
    expect(cutoff.getTime()).toBe(
      wallClockToDate("2026-11-27", "15:40").getTime(),
    );
  });

  it("cuts Isha off at next-day Fajr", () => {
    const cutoff = prayerCutoff("2026-11-27", "isha", times, "05:31");
    expect(cutoff.getTime()).toBe(
      wallClockToDate("2026-11-28", "05:31").getTime(),
    );
  });
});

describe("decideReminderAction", () => {
  const prayerStart = wallClockToDate("2026-11-27", "12:15");
  const cutoff = wallClockToDate("2026-11-27", "15:40");

  function base(
    overrides: Partial<Parameters<typeof decideReminderAction>[0]> = {},
  ) {
    return decideReminderAction({
      now: wallClockToDate("2026-11-27", "12:20"),
      prayerStart,
      cutoff,
      status: "pending",
      enabled: true,
      firstRemindedAt: null,
      lastRemindedAt: null,
      snoozeUntil: null,
      reRemindIntervalMinutes: 15,
      lastReminderMinuteKey: null,
      currentMinuteKey: "2026-11-27T12:20",
      ...overrides,
    });
  }

  it("skips before start", () => {
    expect(
      base({ now: wallClockToDate("2026-11-27", "12:00") }),
    ).toBe("skip");
  });

  it("sends first reminder after start", () => {
    expect(base()).toBe("send");
  });

  it("is idempotent within the same minute", () => {
    expect(
      base({
        firstRemindedAt: wallClockToDate("2026-11-27", "12:20"),
        lastRemindedAt: wallClockToDate("2026-11-27", "12:20"),
        lastReminderMinuteKey: "2026-11-27T12:20",
      }),
    ).toBe("skip");
  });

  it("skips during snooze", () => {
    expect(
      base({
        firstRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        lastRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        snoozeUntil: wallClockToDate("2026-11-27", "12:35"),
        lastReminderMinuteKey: "2026-11-27T12:15",
        currentMinuteKey: "2026-11-27T12:25",
        now: wallClockToDate("2026-11-27", "12:25"),
      }),
    ).toBe("skip");
  });

  it("sends when snoozeUntil has passed", () => {
    expect(
      base({
        firstRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        lastRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        snoozeUntil: wallClockToDate("2026-11-27", "12:25"),
        lastReminderMinuteKey: "2026-11-27T12:15",
        currentMinuteKey: "2026-11-27T12:26",
        now: wallClockToDate("2026-11-27", "12:26"),
      }),
    ).toBe("send");
  });

  it("sends after re-remind interval", () => {
    expect(
      base({
        firstRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        lastRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        lastReminderMinuteKey: "2026-11-27T12:15",
        currentMinuteKey: "2026-11-27T12:31",
        now: wallClockToDate("2026-11-27", "12:31"),
        reRemindIntervalMinutes: 15,
      }),
    ).toBe("send");
  });

  it("skips before re-remind interval", () => {
    expect(
      base({
        firstRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        lastRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        lastReminderMinuteKey: "2026-11-27T12:15",
        currentMinuteKey: "2026-11-27T12:20",
        now: wallClockToDate("2026-11-27", "12:20"),
        reRemindIntervalMinutes: 15,
      }),
    ).toBe("skip");
  });

  it("marks missed at next prayer cutoff", () => {
    expect(
      base({
        now: wallClockToDate("2026-11-27", "15:40"),
        firstRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        lastRemindedAt: wallClockToDate("2026-11-27", "12:15"),
        lastReminderMinuteKey: "2026-11-27T12:15",
        currentMinuteKey: "2026-11-27T15:40",
      }),
    ).toBe("mark_missed");
  });

  it("marks Isha missed at next-day Fajr", () => {
    const ishaStart = wallClockToDate("2026-11-27", "19:10");
    const fajrNext = wallClockToDate("2026-11-28", "05:31");
    expect(
      decideReminderAction({
        now: fajrNext,
        prayerStart: ishaStart,
        cutoff: fajrNext,
        status: "pending",
        enabled: true,
        firstRemindedAt: ishaStart,
        lastRemindedAt: ishaStart,
        snoozeUntil: null,
        reRemindIntervalMinutes: 15,
        lastReminderMinuteKey: "2026-11-27T19:10",
        currentMinuteKey: "2026-11-28T05:31",
      }),
    ).toBe("mark_missed");
  });

  it("skips disabled or non-pending", () => {
    expect(base({ enabled: false })).toBe("skip");
    expect(base({ status: "prayed" })).toBe("skip");
    expect(base({ status: "missed" })).toBe("skip");
  });
});

describe("minuteKey", () => {
  it("formats America/New_York minute keys", () => {
    const key = minuteKey(wallClockToDate("2026-11-27", "12:05"));
    expect(key).toBe("2026-11-27T12:05");
  });
});
