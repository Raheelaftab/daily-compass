import { TZDate } from "@date-fns/tz";
import { endOfMonth, format, startOfMonth } from "date-fns";

import {
  APP_TIMEZONE,
  addDays,
  formatDisplay,
  todayStr,
  weekEnd,
  weekStart,
} from "@/lib/dates";

export const DASHBOARD_RANGE_PRESETS = [
  "this-week",
  "last-week",
  "this-month",
  "last-30",
  "custom",
] as const;

export type DashboardRangePreset = (typeof DASHBOARD_RANGE_PRESETS)[number];

export type DashboardDateRange = {
  preset: DashboardRangePreset;
  start: string;
  end: string;
  label: string;
};

export type DashboardSearchParams = {
  range?: string;
  from?: string;
  to?: string;
  /** Legacy week param from v1 dashboard. */
  week?: string;
};

function isYmd(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function monthBounds(dateStr: string): { start: string; end: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new TZDate(year, month - 1, day, APP_TIMEZONE);
  return {
    start: format(startOfMonth(date), "yyyy-MM-dd"),
    end: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

function rangeLabel(start: string, end: string): string {
  if (start === end) return formatDisplay(start);
  return `${formatDisplay(start)} – ${formatDisplay(end)}`;
}

export function resolveDashboardRange(
  params: DashboardSearchParams,
): DashboardDateRange {
  const today = todayStr();
  const presetRaw = params.range;

  if (
    presetRaw === "custom" ||
    (isYmd(params.from) && isYmd(params.to) && !presetRaw)
  ) {
    const from = isYmd(params.from) ? params.from : today;
    const to = isYmd(params.to) ? params.to : today;
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    return {
      preset: "custom",
      start,
      end,
      label: rangeLabel(start, end),
    };
  }

  if (presetRaw === "last-week") {
    const start = addDays(weekStart(today), -7);
    const end = weekEnd(start);
    return { preset: "last-week", start, end, label: rangeLabel(start, end) };
  }

  if (presetRaw === "this-month") {
    const { start, end } = monthBounds(today);
    return {
      preset: "this-month",
      start,
      end,
      label: rangeLabel(start, end),
    };
  }

  if (presetRaw === "last-30") {
    const end = today;
    const start = addDays(today, -29);
    return { preset: "last-30", start, end, label: rangeLabel(start, end) };
  }

  // Legacy ?week=YYYY-MM-DD → that calendar week as custom-ish this/last week
  if (isYmd(params.week) && !presetRaw) {
    const start = weekStart(params.week);
    const end = weekEnd(start);
    const current = weekStart(today);
    if (start === current) {
      return {
        preset: "this-week",
        start,
        end,
        label: rangeLabel(start, end),
      };
    }
    if (start === addDays(current, -7)) {
      return {
        preset: "last-week",
        start,
        end,
        label: rangeLabel(start, end),
      };
    }
    return {
      preset: "custom",
      start,
      end,
      label: rangeLabel(start, end),
    };
  }

  const start = weekStart(today);
  const end = weekEnd(start);
  return {
    preset: "this-week",
    start,
    end,
    label: rangeLabel(start, end),
  };
}

/** Build a dashboard href for a preset or custom range. */
export function dashboardRangeHref(
  preset: DashboardRangePreset,
  custom?: { from: string; to: string },
): string {
  if (preset === "this-week") return "/dashboard";
  if (preset === "custom" && custom) {
    const from = custom.from;
    const to = custom.to;
    return `/dashboard?range=custom&from=${from}&to=${to}`;
  }
  return `/dashboard?range=${preset}`;
}

/** Week start to use for legacy week-based widgets until Session 3. */
export function weekStartForLegacyWidgets(range: DashboardDateRange): string {
  if (range.preset === "this-week" || range.preset === "last-week") {
    return range.start;
  }
  return weekStart(todayStr());
}
