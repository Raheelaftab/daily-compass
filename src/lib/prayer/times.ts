import { eq } from "drizzle-orm";

import { db } from "@/db";
import { prayerTimes } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { fetchAlAdhanTimes } from "@/lib/prayer/aladhan";
import { logPrayerError } from "@/lib/prayer/errors";
import {
  getOrCreatePrayerSettings,
  type PrayerSettingsRow,
} from "@/lib/prayer/settings";
import type { DayPrayerTimes } from "@/lib/prayer/types";

export type PrayerTimesRow = {
  prayerDate: string;
  times: DayPrayerTimes;
};

function rowToTimes(
  row: typeof prayerTimes.$inferSelect,
): DayPrayerTimes {
  return {
    fajr: row.fajr,
    dhuhr: row.dhuhr,
    asr: row.asr,
    maghrib: row.maghrib,
    isha: row.isha,
  };
}

async function locationFromSettings(
  settings: PrayerSettingsRow,
) {
  return {
    city: settings.city,
    state: settings.state,
    country: settings.country,
    latitude: settings.latitude,
    longitude: settings.longitude,
    method: settings.method,
    school: settings.school,
  };
}

/** Return cached times for a date, fetching from AlAdhan once if missing. */
export async function ensurePrayerTimesForDate(
  dateStr: string,
  settings?: PrayerSettingsRow,
): Promise<PrayerTimesRow> {
  const [cached] = await db
    .select()
    .from(prayerTimes)
    .where(eq(prayerTimes.prayerDate, dateStr))
    .limit(1);

  if (cached) {
    return { prayerDate: dateStr, times: rowToTimes(cached) };
  }

  const locSettings = settings ?? (await getOrCreatePrayerSettings());
  let times: DayPrayerTimes;
  try {
    times = await fetchAlAdhanTimes(
      dateStr,
      await locationFromSettings(locSettings),
    );
  } catch (error) {
    logPrayerError(`ensurePrayerTimesForDate(${dateStr}) AlAdhan`, error);
    throw error;
  }

  try {
    const [inserted] = await db
      .insert(prayerTimes)
      .values({
        prayerDate: dateStr,
        fajr: times.fajr,
        dhuhr: times.dhuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      return { prayerDate: dateStr, times: rowToTimes(inserted) };
    }

    // Race: another request inserted first.
    const [again] = await db
      .select()
      .from(prayerTimes)
      .where(eq(prayerTimes.prayerDate, dateStr))
      .limit(1);
    if (!again) {
      throw new Error(`Failed to cache prayer times for ${dateStr}`);
    }
    return { prayerDate: dateStr, times: rowToTimes(again) };
  } catch (error) {
    logPrayerError(`ensurePrayerTimesForDate(${dateStr}) cache`, error);
    throw error;
  }
}

/** Today + next-day Fajr (needed for Isha cutoff). */
export async function ensureTodayAndNextFajr(dateStr: string): Promise<{
  today: DayPrayerTimes;
  nextFajr: string;
}> {
  const settings = await getOrCreatePrayerSettings();
  const today = await ensurePrayerTimesForDate(dateStr, settings);
  const next = await ensurePrayerTimesForDate(addDays(dateStr, 1), settings);
  return { today: today.times, nextFajr: next.times.fajr };
}
