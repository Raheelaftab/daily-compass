import { APP_TIMEZONE } from "@/lib/dates";
import { normalizeHhmm } from "@/lib/prayer/windows";
import type { DayPrayerTimes } from "@/lib/prayer/types";

/** Timonium, MD — used whenever settings lat/long are missing. */
export const DEFAULT_PRAYER_LATITUDE = "39.437";
export const DEFAULT_PRAYER_LONGITUDE = "-76.62";

export type AlAdhanLocation = {
  city: string;
  state: string;
  country: string;
  latitude?: string | null;
  longitude?: string | null;
  method: number;
  school: number;
};

type AlAdhanTimingsResponse = {
  code?: number;
  status?: string;
  data?:
    | {
        timings?: Record<string, string>;
      }
    | string;
};

/** Convert YYYY-MM-DD → DD-MM-YYYY for AlAdhan path. */
export function toAlAdhanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d || y.length !== 4) {
    throw new Error(`Invalid calendar date for AlAdhan: ${dateStr}`);
  }
  return `${d}-${m}-${y}`;
}

/** Resolve lat/long with Timonium defaults when unset. */
export function resolveCoordinates(loc: AlAdhanLocation): {
  latitude: string;
  longitude: string;
} {
  const latitude = loc.latitude?.trim() || DEFAULT_PRAYER_LATITUDE;
  const longitude = loc.longitude?.trim() || DEFAULT_PRAYER_LONGITUDE;
  return { latitude, longitude };
}

/** Build AlAdhan timings-by-coordinates URL (never city geocoding). */
export function buildAlAdhanTimingsUrl(
  dateStr: string,
  loc: AlAdhanLocation,
): string {
  const datePath = toAlAdhanDate(dateStr);
  const { latitude, longitude } = resolveCoordinates(loc);
  const params = new URLSearchParams({
    latitude,
    longitude,
    method: String(loc.method),
    school: String(loc.school),
    timezonestring: APP_TIMEZONE,
  });
  return `https://api.aladhan.com/v1/timings/${datePath}?${params.toString()}`;
}

/** Fetch Fajr/Dhuhr/Asr/Maghrib/Isha for a calendar day from AlAdhan. */
export async function fetchAlAdhanTimes(
  dateStr: string,
  loc: AlAdhanLocation,
): Promise<DayPrayerTimes> {
  const url = buildAlAdhanTimingsUrl(dateStr, loc);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  let body: AlAdhanTimingsResponse;
  try {
    body = (await response.json()) as AlAdhanTimingsResponse;
  } catch {
    throw new Error(`AlAdhan HTTP ${response.status}: invalid JSON body`);
  }

  if (!response.ok || body.code !== 200) {
    const detail =
      typeof body.data === "string"
        ? body.data
        : body.status ?? `HTTP ${response.status}`;
    throw new Error(`AlAdhan failed: ${detail}`);
  }

  const timings =
    body.data && typeof body.data === "object" ? body.data.timings : undefined;
  if (!timings) {
    throw new Error("AlAdhan response missing timings");
  }

  return {
    fajr: normalizeHhmm(timings.Fajr ?? ""),
    dhuhr: normalizeHhmm(timings.Dhuhr ?? ""),
    asr: normalizeHhmm(timings.Asr ?? ""),
    maghrib: normalizeHhmm(timings.Maghrib ?? ""),
    isha: normalizeHhmm(timings.Isha ?? ""),
  };
}
