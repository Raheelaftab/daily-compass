import { eq } from "drizzle-orm";

import { db } from "@/db";
import { prayerSettings } from "@/db/schema";
import type { PrayerName } from "@/lib/prayer/types";

export type PrayerSettingsRow = {
  id: number;
  city: string;
  state: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  method: number;
  school: number;
  snoozeOptionAMinutes: number;
  snoozeOptionBMinutes: number;
  reRemindIntervalMinutes: number;
  fajrEnabled: boolean;
  dhuhrEnabled: boolean;
  asrEnabled: boolean;
  maghribEnabled: boolean;
  ishaEnabled: boolean;
};

function toRow(
  row: typeof prayerSettings.$inferSelect,
): PrayerSettingsRow {
  return {
    id: row.id,
    city: row.city,
    state: row.state,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    method: row.method,
    school: row.school,
    snoozeOptionAMinutes: row.snoozeOptionAMinutes,
    snoozeOptionBMinutes: row.snoozeOptionBMinutes,
    reRemindIntervalMinutes: row.reRemindIntervalMinutes,
    fajrEnabled: row.fajrEnabled,
    dhuhrEnabled: row.dhuhrEnabled,
    asrEnabled: row.asrEnabled,
    maghribEnabled: row.maghribEnabled,
    ishaEnabled: row.ishaEnabled,
  };
}

/** Ensure a single prayer_settings row exists and return it. */
export async function getOrCreatePrayerSettings(): Promise<PrayerSettingsRow> {
  const [existing] = await db.select().from(prayerSettings).limit(1);
  if (existing) return toRow(existing);

  const [created] = await db.insert(prayerSettings).values({}).returning();
  return toRow(created);
}

export function isPrayerEnabled(
  settings: PrayerSettingsRow,
  prayer: PrayerName,
): boolean {
  switch (prayer) {
    case "fajr":
      return settings.fajrEnabled;
    case "dhuhr":
      return settings.dhuhrEnabled;
    case "asr":
      return settings.asrEnabled;
    case "maghrib":
      return settings.maghribEnabled;
    case "isha":
      return settings.ishaEnabled;
  }
}

export async function updatePrayerSettings(
  patch: Partial<
    Omit<PrayerSettingsRow, "id">
  >,
): Promise<PrayerSettingsRow> {
  const settings = await getOrCreatePrayerSettings();
  const [updated] = await db
    .update(prayerSettings)
    .set(patch)
    .where(eq(prayerSettings.id, settings.id))
    .returning();
  return toRow(updated);
}
