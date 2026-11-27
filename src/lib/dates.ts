import { TZDate } from "@date-fns/tz";
import {
  addDays as dfAddDays,
  addMonths as dfAddMonths,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";

export const APP_TIMEZONE = "America/New_York";

/**
 * Parse a YYYY-MM-DD as a calendar date in America/New_York.
 * Avoid TZDate.tz(zone, "YYYY-MM-DD") — that treats the string as UTC midnight
 * and shifts the local calendar day.
 */
function parseYmdInAppTz(dateStr: string): TZDate {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new TZDate(year, month - 1, day, APP_TIMEZONE);
}

/** Today's calendar date in America/New_York as YYYY-MM-DD. */
export function todayStr(): string {
  return format(new TZDate(new Date(), APP_TIMEZONE), "yyyy-MM-dd");
}

/** Monday of the week containing dateStr (YYYY-MM-DD). */
export function weekStart(dateStr: string): string {
  const date = parseYmdInAppTz(dateStr);
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** Sunday of the week containing dateStr (YYYY-MM-DD). */
export function weekEnd(dateStr: string): string {
  const date = parseYmdInAppTz(dateStr);
  return format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** Add n days to a YYYY-MM-DD string; returns YYYY-MM-DD. */
export function addDays(dateStr: string, n: number): string {
  const date = parseYmdInAppTz(dateStr);
  return format(dfAddDays(date, n), "yyyy-MM-dd");
}

/** Inclusive day count between two YYYY-MM-DD strings (start ≤ end). */
export function daysBetweenInclusive(start: string, end: string): number {
  let count = 0;
  let cursor = start;
  while (cursor <= end) {
    count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

/** Format YYYY-MM-DD as a short axis label (e.g. "Nov 26"). */
export function formatShortDate(dateStr: string): string {
  const date = parseYmdInAppTz(dateStr);
  return format(date, "MMM d");
}

/** Human-readable display for a YYYY-MM-DD string. */
export function formatDisplay(dateStr: string): string {
  const date = parseYmdInAppTz(dateStr);
  return format(date, "EEE, MMM d, yyyy");
}

/** Format minutes as "2h 15m", "45m", or "0m". */
export function formatMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

/** Convert minutes to hours (one decimal). */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/**
 * Days elapsed in a Mon–Sun week for habit rate:
 * 0 if today is before the week; 7 if week is fully past;
 * otherwise Mon..today inclusive.
 */
export function daysElapsedInWeek(weekStartDate: string, today: string): number {
  const end = weekEnd(weekStartDate);
  if (today < weekStartDate) return 0;
  if (today > end) return 7;

  let count = 0;
  let cursor = weekStartDate;
  while (cursor <= today) {
    count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

const MONTH_RE = /^\d{4}-\d{2}$/;

/** True for a YYYY-MM calendar month key. */
export function isMonthKey(value: string): boolean {
  if (!MONTH_RE.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

/** YYYY-MM for the America/New_York calendar month containing today. */
export function currentMonthKey(): string {
  return format(new TZDate(new Date(), APP_TIMEZONE), "yyyy-MM");
}

/** First day of YYYY-MM as YYYY-MM-DD. */
export function monthStart(monthKey: string): string {
  if (!isMonthKey(monthKey)) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }
  return `${monthKey}-01`;
}

/** Last day of YYYY-MM as YYYY-MM-DD (America/New_York calendar). */
export function monthEnd(monthKey: string): string {
  const start = parseYmdInAppTz(monthStart(monthKey));
  const nextMonth = dfAddMonths(start, 1);
  return format(dfAddDays(nextMonth, -1), "yyyy-MM-dd");
}

/** Add n calendar months to a YYYY-MM key. */
export function addMonths(monthKey: string, n: number): string {
  const start = parseYmdInAppTz(monthStart(monthKey));
  return format(dfAddMonths(start, n), "yyyy-MM");
}

/** Human label for YYYY-MM (e.g. "November 2026"). */
export function formatMonthLabel(monthKey: string): string {
  return format(parseYmdInAppTz(monthStart(monthKey)), "MMMM yyyy");
}

/**
 * Week-equivalents in a month for target scaling: daysInMonth / 7.
 * Used as weeklyTarget × weeks.
 */
export function weeksInMonth(monthKey: string): number {
  const start = monthStart(monthKey);
  const end = monthEnd(monthKey);
  return daysBetweenInclusive(start, end) / 7;
}
