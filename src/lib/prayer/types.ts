export const PRAYER_NAMES = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;

export type PrayerName = (typeof PRAYER_NAMES)[number];

export type PrayerStatus = "pending" | "prayed" | "missed";

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

/** AlAdhan method ids commonly used in settings. */
export const CALCULATION_METHODS = [
  { id: 2, label: "ISNA (North America)" },
  { id: 3, label: "Muslim World League" },
  { id: 1, label: "University of Islamic Sciences, Karachi" },
  { id: 5, label: "Egyptian General Authority of Survey" },
  { id: 4, label: "Umm Al-Qura, Makkah" },
] as const;

/** AlAdhan `school`: 0 = Shafi/Standard (majority), 1 = Hanafi. */
export const ASR_SCHOOLS = [
  { id: 0, label: "Standard / Shafi" },
  { id: 1, label: "Hanafi" },
] as const;

export type DayPrayerTimes = Record<PrayerName, string>;
