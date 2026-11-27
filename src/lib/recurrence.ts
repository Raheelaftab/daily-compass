import { TZDate } from "@date-fns/tz";
import { format, getDay } from "date-fns";

import { APP_TIMEZONE, addDays, todayStr } from "@/lib/dates";

export const WEEKDAY_CODES = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
] as const;

export type WeekdayCode = (typeof WEEKDAY_CODES)[number];

export type RecurrenceRule =
  | { type: "daily" }
  | { type: "weekdays" }
  | { type: "weekly"; days: WeekdayCode[] }
  | { type: "monthly"; dayOfMonth: number };

const WEEKDAY_SET = new Set<string>(WEEKDAY_CODES);

/** JS getDay(): 0=Sun … 6=Sat → our Mon-first codes. */
const JS_DAY_TO_CODE: WeekdayCode[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

const CODE_TO_JS_DAY: Record<WeekdayCode, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

function parseYmd(dateStr: string): TZDate {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new TZDate(year, month - 1, day, APP_TIMEZONE);
}

export function weekdayCode(dateStr: string): WeekdayCode {
  return JS_DAY_TO_CODE[getDay(parseYmd(dateStr))]!;
}

function daysInMonth(year: number, monthIndex0: number): number {
  // Day 0 of next month = last day of this month, in app TZ.
  const last = new TZDate(year, monthIndex0 + 1, 0, APP_TIMEZONE);
  return last.getDate();
}

function ymdFromParts(year: number, monthIndex0: number, day: number): string {
  const clamped = Math.min(day, daysInMonth(year, monthIndex0));
  return format(
    new TZDate(year, monthIndex0, clamped, APP_TIMEZONE),
    "yyyy-MM-dd",
  );
}

function sortWeekdays(days: WeekdayCode[]): WeekdayCode[] {
  return [...days].sort(
    (a, b) => WEEKDAY_CODES.indexOf(a) - WEEKDAY_CODES.indexOf(b),
  );
}

/** Parse stored recurrence text; returns null for none/invalid. */
export function parseRecurrence(
  raw: string | null | undefined,
): RecurrenceRule | null {
  if (raw == null || raw === "" || raw === "none") return null;
  if (raw === "daily") return { type: "daily" };
  if (raw === "weekdays") return { type: "weekdays" };

  if (raw.startsWith("weekly:")) {
    const parts = raw
      .slice("weekly:".length)
      .split(",")
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);
    const days = parts.filter((p): p is WeekdayCode => WEEKDAY_SET.has(p));
    if (days.length === 0 || days.length !== parts.length) return null;
    return { type: "weekly", days: sortWeekdays([...new Set(days)]) };
  }

  if (raw.startsWith("monthly:")) {
    const day = Number(raw.slice("monthly:".length));
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;
    return { type: "monthly", dayOfMonth: day };
  }

  return null;
}

/** Serialize a rule to the DB string form (or null for none). */
export function serializeRecurrence(
  rule: RecurrenceRule | null | undefined,
): string | null {
  if (rule == null) return null;
  if (rule.type === "daily") return "daily";
  if (rule.type === "weekdays") return "weekdays";
  if (rule.type === "weekly") {
    const days = sortWeekdays([...new Set(rule.days)]);
    if (days.length === 0) return null;
    return `weekly:${days.join(",")}`;
  }
  if (rule.type === "monthly") {
    if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31) {
      return null;
    }
    return `monthly:${rule.dayOfMonth}`;
  }
  return null;
}

export function isValidRecurrenceString(
  raw: string | null | undefined,
): boolean {
  if (raw == null || raw === "" || raw === "none") return true;
  return parseRecurrence(raw) != null;
}

/**
 * Strictly next occurrence after `fromYmd` (America/New_York calendar).
 * Monthly days clamp to the last day of short months (month-end).
 */
export function nextDueDate(rule: RecurrenceRule, fromYmd: string): string {
  if (rule.type === "daily") {
    return addDays(fromYmd, 1);
  }

  if (rule.type === "weekdays") {
    let cursor = addDays(fromYmd, 1);
    for (let i = 0; i < 8; i += 1) {
      const code = weekdayCode(cursor);
      if (code !== "SAT" && code !== "SUN") return cursor;
      cursor = addDays(cursor, 1);
    }
    return cursor;
  }

  if (rule.type === "weekly") {
    const wanted = new Set(rule.days);
    let cursor = addDays(fromYmd, 1);
    for (let i = 0; i < 8; i += 1) {
      if (wanted.has(weekdayCode(cursor))) return cursor;
      cursor = addDays(cursor, 1);
    }
    return cursor;
  }

  // monthly
  const date = parseYmd(fromYmd);
  const year = date.getFullYear();
  const month = date.getMonth();
  const thisMonth = ymdFromParts(year, month, rule.dayOfMonth);
  if (thisMonth > fromYmd) return thisMonth;

  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  return ymdFromParts(nextYear, nextMonth, rule.dayOfMonth);
}

/**
 * Next due on or after `notBefore` (typically today), stepping from `fromYmd`.
 */
export function nextDueDateOnOrAfter(
  rule: RecurrenceRule,
  fromYmd: string,
  notBefore: string = todayStr(),
): string {
  let next = nextDueDate(rule, fromYmd);
  let guard = 0;
  while (next < notBefore && guard < 400) {
    next = nextDueDate(rule, next);
    guard += 1;
  }
  return next;
}

/** Zod-friendly: accept null/""/valid recurrence strings. */
export function normalizeRecurrenceInput(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "" || value === "none") return null;
  const rule = parseRecurrence(value);
  if (!rule) {
    throw new Error("Invalid recurrence");
  }
  return serializeRecurrence(rule);
}

export function recurrenceLabel(raw: string | null | undefined): string | null {
  const rule = parseRecurrence(raw);
  if (!rule) return null;
  if (rule.type === "daily") return "Daily";
  if (rule.type === "weekdays") return "Weekdays";
  if (rule.type === "weekly") return `Weekly (${rule.days.join(", ")})`;
  return `Monthly (day ${rule.dayOfMonth})`;
}

/** Form helpers */
export type RecurrenceFormState = {
  kind: "none" | "daily" | "weekdays" | "weekly" | "monthly";
  weeklyDays: WeekdayCode[];
  monthlyDay: number;
};

export function recurrenceToForm(
  raw: string | null | undefined,
): RecurrenceFormState {
  const rule = parseRecurrence(raw);
  if (!rule) {
    return { kind: "none", weeklyDays: ["MON"], monthlyDay: 1 };
  }
  if (rule.type === "daily") {
    return { kind: "daily", weeklyDays: ["MON"], monthlyDay: 1 };
  }
  if (rule.type === "weekdays") {
    return { kind: "weekdays", weeklyDays: ["MON"], monthlyDay: 1 };
  }
  if (rule.type === "weekly") {
    return {
      kind: "weekly",
      weeklyDays: rule.days.length > 0 ? rule.days : ["MON"],
      monthlyDay: 1,
    };
  }
  return {
    kind: "monthly",
    weeklyDays: ["MON"],
    monthlyDay: rule.dayOfMonth,
  };
}

export function formToRecurrenceString(
  form: RecurrenceFormState,
): string | null {
  if (form.kind === "none") return null;
  if (form.kind === "daily") return "daily";
  if (form.kind === "weekdays") return "weekdays";
  if (form.kind === "weekly") {
    return serializeRecurrence({ type: "weekly", days: form.weeklyDays });
  }
  return serializeRecurrence({
    type: "monthly",
    dayOfMonth: form.monthlyDay,
  });
}

/** Exported for tests / callers that need JS weekday mapping. */
export function jsDayForCode(code: WeekdayCode): number {
  return CODE_TO_JS_DAY[code];
}
