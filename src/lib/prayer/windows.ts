import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import { addDays, APP_TIMEZONE } from "@/lib/dates";
import {
  PRAYER_NAMES,
  type DayPrayerTimes,
  type PrayerName,
  type PrayerStatus,
} from "@/lib/prayer/types";

const HHMM_RE = /^(\d{1,2}):(\d{2})$/;

/** Normalize AlAdhan time strings like "05:23" or "5:23 (EST)" → "HH:mm". */
export function normalizeHhmm(raw: string): string {
  const match = /(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!match) {
    throw new Error(`Invalid prayer time: ${raw}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid prayer time: ${raw}`);
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** America/New_York wall-clock instant for a calendar date + HH:mm. */
export function wallClockToDate(dateStr: string, hhmm: string): Date {
  const normalized = normalizeHhmm(hhmm);
  if (!HHMM_RE.test(normalized)) {
    throw new Error(`Invalid HH:mm: ${hhmm}`);
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = normalized.split(":").map(Number);
  return new TZDate(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0,
    APP_TIMEZONE,
  );
}

/** Minute key in America/New_York used for reminder idempotency. */
export function minuteKey(now: Date): string {
  return format(new TZDate(now, APP_TIMEZONE), "yyyy-MM-dd'T'HH:mm");
}

/** Next prayer after `prayer` (Isha wraps to Fajr). */
export function nextPrayerName(prayer: PrayerName): PrayerName {
  const idx = PRAYER_NAMES.indexOf(prayer);
  return PRAYER_NAMES[(idx + 1) % PRAYER_NAMES.length]!;
}

/**
 * Cutoff instant when a prayer window ends:
 * next prayer's start today, or next day's Fajr for Isha.
 */
export function prayerCutoff(
  prayerDate: string,
  prayer: PrayerName,
  todayTimes: DayPrayerTimes,
  nextDayFajr: string,
): Date {
  if (prayer === "isha") {
    return wallClockToDate(addDays(prayerDate, 1), nextDayFajr);
  }
  const next = nextPrayerName(prayer);
  return wallClockToDate(prayerDate, todayTimes[next]);
}

export type ReminderDecision = "send" | "skip" | "mark_missed";

export type ReminderDecisionInput = {
  now: Date;
  prayerStart: Date;
  cutoff: Date;
  status: PrayerStatus;
  enabled: boolean;
  firstRemindedAt: Date | null;
  lastRemindedAt: Date | null;
  snoozeUntil: Date | null;
  reRemindIntervalMinutes: number;
  lastReminderMinuteKey: string | null;
  currentMinuteKey: string;
};

/**
 * Decide what the prayer cron should do for one pending prayer.
 * Idempotent within the same America/New_York minute via `lastReminderMinuteKey`.
 */
export function decideReminderAction(
  input: ReminderDecisionInput,
): ReminderDecision {
  if (!input.enabled || input.status !== "pending") {
    return "skip";
  }

  if (input.now.getTime() < input.prayerStart.getTime()) {
    return "skip";
  }

  if (input.now.getTime() >= input.cutoff.getTime()) {
    return "mark_missed";
  }

  if (input.lastReminderMinuteKey === input.currentMinuteKey) {
    return "skip";
  }

  // First reminder once the window has opened.
  if (input.firstRemindedAt == null) {
    return "send";
  }

  // Still inside an active snooze.
  if (
    input.snoozeUntil != null &&
    input.now.getTime() < input.snoozeUntil.getTime()
  ) {
    return "skip";
  }

  // Snooze expired → remind again.
  if (
    input.snoozeUntil != null &&
    input.now.getTime() >= input.snoozeUntil.getTime()
  ) {
    return "send";
  }

  // Re-remind interval after last reminder.
  if (input.lastRemindedAt != null) {
    const nextAt =
      input.lastRemindedAt.getTime() +
      input.reRemindIntervalMinutes * 60_000;
    if (input.now.getTime() >= nextAt) {
      return "send";
    }
  }

  return "skip";
}
