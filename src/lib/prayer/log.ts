import { and, eq, ne, or, isNull } from "drizzle-orm";

import { db } from "@/db";
import { prayerLog } from "@/db/schema";
import { PRAYER_NAMES, type PrayerName, type PrayerStatus } from "@/lib/prayer/types";

export type PrayerLogRow = {
  id: number;
  prayerDate: string;
  prayer: PrayerName;
  status: PrayerStatus;
  firstRemindedAt: Date | null;
  lastRemindedAt: Date | null;
  lastReminderMinuteKey: string | null;
  snoozeUntil: Date | null;
  prayedAt: Date | null;
};

function toRow(row: typeof prayerLog.$inferSelect): PrayerLogRow {
  return {
    id: row.id,
    prayerDate: row.prayerDate,
    prayer: row.prayer,
    status: row.status,
    firstRemindedAt: row.firstRemindedAt,
    lastRemindedAt: row.lastRemindedAt,
    lastReminderMinuteKey: row.lastReminderMinuteKey,
    snoozeUntil: row.snoozeUntil,
    prayedAt: row.prayedAt,
  };
}

/** Ensure five prayer_log rows exist for a date (pending by default). */
export async function ensurePrayerLogsForDate(
  dateStr: string,
): Promise<PrayerLogRow[]> {
  const existing = await db
    .select()
    .from(prayerLog)
    .where(eq(prayerLog.prayerDate, dateStr));

  const byPrayer = new Map(existing.map((row) => [row.prayer, row]));
  const missing = PRAYER_NAMES.filter((name) => !byPrayer.has(name));

  if (missing.length > 0) {
    await db
      .insert(prayerLog)
      .values(
        missing.map((prayer) => ({
          prayerDate: dateStr,
          prayer,
          status: "pending" as const,
        })),
      )
      .onConflictDoNothing();
  }

  const rows = await db
    .select()
    .from(prayerLog)
    .where(eq(prayerLog.prayerDate, dateStr));

  return PRAYER_NAMES.map((name) => {
    const row = rows.find((r) => r.prayer === name);
    if (!row) throw new Error(`Missing prayer_log for ${dateStr} ${name}`);
    return toRow(row);
  });
}

/**
 * Claim the current minute for a reminder send (idempotent).
 * Uses a compare-and-set so concurrent cron ticks in the same minute
 * only one caller gets a row back and may send Telegram.
 */
export async function claimReminderMinute(input: {
  id: number;
  now: Date;
  minuteKey: string;
}): Promise<PrayerLogRow | null> {
  const [current] = await db
    .select()
    .from(prayerLog)
    .where(eq(prayerLog.id, input.id))
    .limit(1);

  if (!current || current.status !== "pending") return null;

  const [updated] = await db
    .update(prayerLog)
    .set({
      firstRemindedAt: current.firstRemindedAt ?? input.now,
      lastRemindedAt: input.now,
      lastReminderMinuteKey: input.minuteKey,
      snoozeUntil: null,
    })
    .where(
      and(
        eq(prayerLog.id, input.id),
        eq(prayerLog.status, "pending"),
        or(
          isNull(prayerLog.lastReminderMinuteKey),
          ne(prayerLog.lastReminderMinuteKey, input.minuteKey),
        ),
      ),
    )
    .returning();

  return updated ? toRow(updated) : null;
}

export async function markPrayerMissed(id: number): Promise<PrayerLogRow | null> {
  const [updated] = await db
    .update(prayerLog)
    .set({ status: "missed", snoozeUntil: null })
    .where(and(eq(prayerLog.id, id), eq(prayerLog.status, "pending")))
    .returning();
  return updated ? toRow(updated) : null;
}

export async function markPrayerPrayed(
  prayerDate: string,
  prayer: PrayerName,
  prayedAt: Date = new Date(),
): Promise<PrayerLogRow | null> {
  const [updated] = await db
    .update(prayerLog)
    .set({
      status: "prayed",
      prayedAt,
      snoozeUntil: null,
    })
    .where(
      and(
        eq(prayerLog.prayerDate, prayerDate),
        eq(prayerLog.prayer, prayer),
        eq(prayerLog.status, "pending"),
      ),
    )
    .returning();
  return updated ? toRow(updated) : null;
}

export async function snoozePrayer(input: {
  prayerDate: string;
  prayer: PrayerName;
  snoozeUntil: Date;
}): Promise<PrayerLogRow | null> {
  const [updated] = await db
    .update(prayerLog)
    .set({
      snoozeUntil: input.snoozeUntil,
    })
    .where(
      and(
        eq(prayerLog.prayerDate, input.prayerDate),
        eq(prayerLog.prayer, input.prayer),
        eq(prayerLog.status, "pending"),
      ),
    )
    .returning();
  return updated ? toRow(updated) : null;
}

export async function getPrayerLog(
  prayerDate: string,
  prayer: PrayerName,
): Promise<PrayerLogRow | null> {
  const [row] = await db
    .select()
    .from(prayerLog)
    .where(
      and(
        eq(prayerLog.prayerDate, prayerDate),
        eq(prayerLog.prayer, prayer),
      ),
    )
    .limit(1);
  return row ? toRow(row) : null;
}
