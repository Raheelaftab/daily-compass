import { TZDate } from "@date-fns/tz";
import {
  addDays as dfAddDays,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";

export const APP_TIMEZONE = "America/New_York";

/** Today's calendar date in America/New_York as YYYY-MM-DD. */
export function todayStr(): string {
  return format(new TZDate(new Date(), APP_TIMEZONE), "yyyy-MM-dd");
}

/** Monday of the week containing dateStr (YYYY-MM-DD). */
export function weekStart(dateStr: string): string {
  const date = TZDate.tz(APP_TIMEZONE, dateStr);
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** Sunday of the week containing dateStr (YYYY-MM-DD). */
export function weekEnd(dateStr: string): string {
  const date = TZDate.tz(APP_TIMEZONE, dateStr);
  return format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

/** Add n days to a YYYY-MM-DD string; returns YYYY-MM-DD. */
export function addDays(dateStr: string, n: number): string {
  const date = TZDate.tz(APP_TIMEZONE, dateStr);
  return format(dfAddDays(date, n), "yyyy-MM-dd");
}

/** Human-readable display for a YYYY-MM-DD string. */
export function formatDisplay(dateStr: string): string {
  const date = TZDate.tz(APP_TIMEZONE, dateStr);
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
