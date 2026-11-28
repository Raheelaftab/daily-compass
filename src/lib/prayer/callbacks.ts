import { markPrayerPrayed, snoozePrayer } from "@/lib/prayer/log";
import { PRAYER_LABELS, PRAYER_NAMES, type PrayerName } from "@/lib/prayer/types";

export type PrayerCallbackResult =
  | { ok: true; editText: string; answerText: string }
  | { ok: false; answerText: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPrayerName(value: string): value is PrayerName {
  return (PRAYER_NAMES as readonly string[]).includes(value);
}

/**
 * Parse and apply prayer inline-button callbacks.
 * Formats:
 * - `p:prayed:YYYY-MM-DD:fajr`
 * - `p:snooze:YYYY-MM-DD:fajr:10`
 */
export function parsePrayerCallbackData(data: string): {
  action: "prayed" | "snooze";
  prayerDate: string;
  prayer: PrayerName;
  snoozeMinutes?: number;
} | null {
  const parts = data.split(":");
  if (parts[0] !== "p") return null;

  if (parts[1] === "prayed" && parts.length === 4) {
    const prayerDate = parts[2]!;
    const prayer = parts[3]!;
    if (!DATE_RE.test(prayerDate) || !isPrayerName(prayer)) return null;
    return { action: "prayed", prayerDate, prayer };
  }

  if (parts[1] === "snooze" && parts.length === 5) {
    const prayerDate = parts[2]!;
    const prayer = parts[3]!;
    const snoozeMinutes = Number(parts[4]);
    if (!DATE_RE.test(prayerDate) || !isPrayerName(prayer)) return null;
    if (!Number.isInteger(snoozeMinutes) || snoozeMinutes < 1 || snoozeMinutes > 180) {
      return null;
    }
    return { action: "snooze", prayerDate, prayer, snoozeMinutes };
  }

  return null;
}

export async function handlePrayerCallback(
  data: string,
  now: Date = new Date(),
): Promise<PrayerCallbackResult> {
  const parsed = parsePrayerCallbackData(data);
  if (!parsed) {
    return { ok: false, answerText: "Unknown button" };
  }

  const label = PRAYER_LABELS[parsed.prayer];

  if (parsed.action === "prayed") {
    const updated = await markPrayerPrayed(
      parsed.prayerDate,
      parsed.prayer,
      now,
    );
    if (!updated) {
      return { ok: false, answerText: `${label} already logged` };
    }
    return {
      ok: true,
      answerText: `${label} marked prayed`,
      editText: `✅ ${label} — prayed`,
    };
  }

  const snoozeUntil = new Date(
    now.getTime() + (parsed.snoozeMinutes ?? 10) * 60_000,
  );
  const updated = await snoozePrayer({
    prayerDate: parsed.prayerDate,
    prayer: parsed.prayer,
    snoozeUntil,
  });
  if (!updated) {
    return { ok: false, answerText: `${label} not pending` };
  }

  return {
    ok: true,
    answerText: `Snoozed ${parsed.snoozeMinutes} min`,
    editText: `⏰ ${label} — snoozed ${parsed.snoozeMinutes} min`,
  };
}
