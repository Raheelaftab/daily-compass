import { addDays, todayStr } from "@/lib/dates";
import { weekdayCode, type WeekdayCode } from "@/lib/recurrence";

export type ParsedPriority = "high" | "medium" | "low";

export type ParsedAddCommand = {
  title: string;
  areaSlug: string | null;
  priority: ParsedPriority;
  dueDate: string | null;
};

export type ParsedLogCommand = {
  minutes: number;
  areaSlug: string | null;
  note: string | null;
};

const WEEKDAY_ALIASES: Record<string, WeekdayCode> = {
  mon: "MON",
  monday: "MON",
  tue: "TUE",
  tues: "TUE",
  tuesday: "TUE",
  wed: "WED",
  wednesday: "WED",
  thu: "THU",
  thur: "THU",
  thurs: "THU",
  thursday: "THU",
  fri: "FRI",
  friday: "FRI",
  sat: "SAT",
  saturday: "SAT",
  sun: "SUN",
  sunday: "SUN",
};

const CODE_ORDER: WeekdayCode[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

/** Next calendar date for a weekday code on/after `fromYmd` (America/New_York). */
export function nextWeekdayOnOrAfter(
  fromYmd: string,
  code: WeekdayCode,
): string {
  let cursor = fromYmd;
  for (let i = 0; i < 8; i += 1) {
    if (weekdayCode(cursor) === code) return cursor;
    cursor = addDays(cursor, 1);
  }
  return fromYmd;
}

/**
 * Parse due:today|tomorrow|mon–sun|YYYY-MM-DD relative to America/New_York today.
 */
export function parseDueToken(
  raw: string,
  today: string = todayStr(),
): string | null {
  const token = raw.trim().toLowerCase();
  if (!token) return null;
  if (token === "today") return today;
  if (token === "tomorrow") return addDays(today, 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token;
  const code = WEEKDAY_ALIASES[token];
  if (!code) return null;
  return nextWeekdayOnOrAfter(today, code);
}

/** Strip Telegram bot suffix: /cmd@BotName → /cmd */
export function normalizeCommand(text: string): string {
  const trimmed = text.trim();
  const match = /^(\/[a-z0-9_]+)(?:@[A-Za-z0-9_]+)?([\s\S]*)$/i.exec(trimmed);
  if (!match) return trimmed;
  return `${match[1]}${match[2] ?? ""}`.trim();
}

/**
 * Parse `/add <title> #area !high due:fri`
 * Area slug and priority/due tokens may appear anywhere after /add.
 */
export function parseAddArgs(args: string, today: string = todayStr()): ParsedAddCommand {
  let rest = args.trim();
  let areaSlug: string | null = null;
  let priority: ParsedPriority = "medium";
  let dueDate: string | null = null;

  const areaMatch = /(?:^|\s)#([a-z0-9-]+)\b/i.exec(rest);
  if (areaMatch?.[1]) {
    areaSlug = areaMatch[1].toLowerCase();
    rest = `${rest.slice(0, areaMatch.index)} ${rest.slice((areaMatch.index ?? 0) + areaMatch[0].length)}`;
  }

  const priorityMatch = /(?:^|\s)!(high|medium|low)\b/i.exec(rest);
  if (priorityMatch?.[1]) {
    priority = priorityMatch[1].toLowerCase() as ParsedPriority;
    rest = `${rest.slice(0, priorityMatch.index)} ${rest.slice((priorityMatch.index ?? 0) + priorityMatch[0].length)}`;
  }

  const dueMatch = /(?:^|\s)due:([^\s]+)/i.exec(rest);
  if (dueMatch?.[1]) {
    dueDate = parseDueToken(dueMatch[1], today);
    rest = `${rest.slice(0, dueMatch.index)} ${rest.slice((dueMatch.index ?? 0) + dueMatch[0].length)}`;
  }

  const title = rest.replace(/\s+/g, " ").trim();
  return { title, areaSlug, priority, dueDate };
}

/** Parse `/log <minutes> #area note...` */
export function parseLogArgs(args: string): ParsedLogCommand | null {
  const trimmed = args.trim();
  const match = /^(\d+)\s*(.*)$/.exec(trimmed);
  if (!match) return null;
  const minutes = Number(match[1]);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) return null;

  let rest = (match[2] ?? "").trim();
  let areaSlug: string | null = null;
  const areaMatch = /(?:^|\s)#([a-z0-9-]+)\b/i.exec(rest);
  if (areaMatch?.[1]) {
    areaSlug = areaMatch[1].toLowerCase();
    rest = `${rest.slice(0, areaMatch.index)} ${rest.slice((areaMatch.index ?? 0) + areaMatch[0].length)}`
      .replace(/\s+/g, " ")
      .trim();
  }

  return {
    minutes,
    areaSlug,
    note: rest.length > 0 ? rest.slice(0, 300) : null,
  };
}

/** Parse `/start_timer <id|#area>` */
export function parseStartTimerArgs(
  args: string,
): { taskId: number } | { areaSlug: string } | null {
  const trimmed = args.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return { taskId: Number(trimmed) };
  }
  const area = /^#?([a-z0-9-]+)$/i.exec(trimmed);
  if (area?.[1]) return { areaSlug: area[1].toLowerCase() };
  return null;
}

export function parseCommandLine(text: string): {
  command: string;
  args: string;
} | null {
  const normalized = normalizeCommand(text);
  const match = /^\/([a-z0-9_]+)(?:\s+([\s\S]*))?$/i.exec(normalized);
  if (!match?.[1]) return null;
  return {
    command: match[1].toLowerCase(),
    args: (match[2] ?? "").trim(),
  };
}

/** Exported for tests */
export function weekdayOrderIndex(code: WeekdayCode): number {
  return CODE_ORDER.indexOf(code);
}
