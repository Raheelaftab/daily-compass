import { eq } from "drizzle-orm";

import { db } from "@/db";
import { prayerSettings } from "@/db/schema";
import {
  DEFAULT_PRAYER_LATITUDE,
  DEFAULT_PRAYER_LONGITUDE,
} from "@/lib/prayer/aladhan";
import type { PrayerName } from "@/lib/prayer/types";

export type PrayerSettingsRow = {
  id: number;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
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

export const DEFAULT_PRAYER_SETTINGS_VALUES = {
  city: "Timonium",
  state: "MD",
  country: "US",
  latitude: DEFAULT_PRAYER_LATITUDE,
  longitude: DEFAULT_PRAYER_LONGITUDE,
  method: 2,
  school: 0,
  snoozeOptionAMinutes: 10,
  snoozeOptionBMinutes: 20,
  reRemindIntervalMinutes: 15,
  fajrEnabled: true,
  dhuhrEnabled: true,
  asrEnabled: true,
  maghribEnabled: true,
  ishaEnabled: true,
} as const;

function toRow(
  row: typeof prayerSettings.$inferSelect,
): PrayerSettingsRow {
  return {
    id: row.id,
    city: row.city,
    state: row.state,
    country: row.country,
    latitude: row.latitude?.trim() || DEFAULT_PRAYER_LATITUDE,
    longitude: row.longitude?.trim() || DEFAULT_PRAYER_LONGITUDE,
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

/**
 * Ensure a single prayer_settings row exists (upsert defaults) and return it.
 * Backfills missing lat/long on an existing empty row.
 */
export async function getOrCreatePrayerSettings(): Promise<PrayerSettingsRow> {
  const [existing] = await db.select().from(prayerSettings).limit(1);
  if (existing) {
    const needsCoords =
      !existing.latitude?.trim() || !existing.longitude?.trim();
    if (!needsCoords) return toRow(existing);

    const [patched] = await db
      .update(prayerSettings)
      .set({
        latitude: existing.latitude?.trim() || DEFAULT_PRAYER_LATITUDE,
        longitude: existing.longitude?.trim() || DEFAULT_PRAYER_LONGITUDE,
      })
      .where(eq(prayerSettings.id, existing.id))
      .returning();
    return toRow(patched);
  }

  const [created] = await db
    .insert(prayerSettings)
    .values({ ...DEFAULT_PRAYER_SETTINGS_VALUES })
    .returning();
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
  patch: Partial<Omit<PrayerSettingsRow, "id">>,
): Promise<PrayerSettingsRow> {
  const settings = await getOrCreatePrayerSettings();
  const [updated] = await db
    .update(prayerSettings)
    .set(patch)
    .where(eq(prayerSettings.id, settings.id))
    .returning();
  return toRow(updated);
}
