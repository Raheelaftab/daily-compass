import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import { APP_TIMEZONE } from "@/lib/dates";

export const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/** Minutes logged from a timer run: nearest minute, minimum 1. */
export function elapsedMinutes(
  startedAt: Date,
  endedAt: Date = new Date(),
): number {
  const ms = Math.max(0, endedAt.getTime() - startedAt.getTime());
  return Math.max(1, Math.round(ms / 60_000));
}

/** Calendar log date for a timer start instant in America/New_York. */
export function logDateFromStartedAt(startedAt: Date): string {
  return format(new TZDate(startedAt, APP_TIMEZONE), "yyyy-MM-dd");
}

/** True when the running timer has exceeded 6 hours. */
export function needsStopConfirmation(
  startedAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() - startedAt.getTime() > SIX_HOURS_MS;
}

/** Format elapsed wall time as H:MM:SS or M:SS for the header pill. */
export function formatElapsedClock(
  startedAt: Date,
  now: Date = new Date(),
): string {
  const totalSeconds = Math.max(
    0,
    Math.floor((now.getTime() - startedAt.getTime()) / 1000),
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}
