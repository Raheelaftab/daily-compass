import { normalizeHhmm } from "@/lib/prayer/windows";
import type { DayPrayerTimes } from "@/lib/prayer/types";

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
  data?: {
    timings?: Record<string, string>;
  };
};

/** Convert YYYY-MM-DD → DD-MM-YYYY for AlAdhan path. */
export function toAlAdhanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

function buildUrl(dateStr: string, loc: AlAdhanLocation): string {
  const datePath = toAlAdhanDate(dateStr);
  const params = new URLSearchParams({
    method: String(loc.method),
    school: String(loc.school),
  });

  const lat = loc.latitude?.trim();
  const lon = loc.longitude?.trim();
  if (lat && lon) {
    params.set("latitude", lat);
    params.set("longitude", lon);
    return `https://api.aladhan.com/v1/timings/${datePath}?${params.toString()}`;
  }

  params.set("city", loc.city);
  params.set("country", loc.country);
  if (loc.state.trim()) {
    params.set("state", loc.state);
  }
  return `https://api.aladhan.com/v1/timingsByCity/${datePath}?${params.toString()}`;
}

/** Fetch Fajr/Dhuhr/Asr/Maghrib/Isha for a calendar day from AlAdhan. */
export async function fetchAlAdhanTimes(
  dateStr: string,
  loc: AlAdhanLocation,
): Promise<DayPrayerTimes> {
  const url = buildUrl(dateStr, loc);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    // Cache a bit at the edge/runtime so a flaky cron retry is cheap.
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`AlAdhan HTTP ${response.status}`);
  }

  const body = (await response.json()) as AlAdhanTimingsResponse;
  const timings = body.data?.timings;
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
