import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAlAdhanTimingsUrl,
  DEFAULT_PRAYER_LATITUDE,
  DEFAULT_PRAYER_LONGITUDE,
  fetchAlAdhanTimes,
  resolveCoordinates,
  toAlAdhanDate,
} from "./aladhan";
import { DEFAULT_PRAYER_SETTINGS_VALUES } from "./settings";

describe("toAlAdhanDate", () => {
  it("converts YYYY-MM-DD to DD-MM-YYYY", () => {
    expect(toAlAdhanDate("2026-11-27")).toBe("27-11-2026");
    expect(toAlAdhanDate("2026-01-05")).toBe("05-01-2026");
  });

  it("rejects invalid dates", () => {
    expect(() => toAlAdhanDate("11-27-2026")).toThrow(/Invalid calendar date/);
  });
});

describe("resolveCoordinates / defaults", () => {
  it("fills Timonium coords when settings lat/long are missing", () => {
    expect(
      resolveCoordinates({
        city: "Timonium",
        state: "MD",
        country: "US",
        latitude: null,
        longitude: null,
        method: 2,
        school: 0,
      }),
    ).toEqual({
      latitude: DEFAULT_PRAYER_LATITUDE,
      longitude: DEFAULT_PRAYER_LONGITUDE,
    });
  });

  it("default prayer settings row includes Timonium coordinates", () => {
    expect(DEFAULT_PRAYER_SETTINGS_VALUES.latitude).toBe("39.437");
    expect(DEFAULT_PRAYER_SETTINGS_VALUES.longitude).toBe("-76.62");
  });
});

describe("buildAlAdhanTimingsUrl", () => {
  it("builds coordinate timings URL with America/New_York timezone", () => {
    const url = buildAlAdhanTimingsUrl("2026-11-27", {
      city: "Timonium",
      state: "MD",
      country: "US",
      latitude: null,
      longitude: "",
      method: 2,
      school: 0,
    });
    expect(url).toContain("/v1/timings/27-11-2026?");
    expect(url).toContain("latitude=39.437");
    expect(url).toContain("longitude=-76.62");
    expect(url).toContain("method=2");
    expect(url).toContain("school=0");
    expect(url).toContain("timezonestring=America%2FNew_York");
    expect(url).not.toContain("timingsByCity");
  });
});

describe("fetchAlAdhanTimes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws on a failed AlAdhan response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          code: 503,
          status: "SERVER_ERROR",
          data: "Geocoding is temporarily unavailable. Please try again later.",
        }),
      }),
    );

    await expect(
      fetchAlAdhanTimes("2026-11-27", {
        city: "Timonium",
        state: "MD",
        country: "US",
        latitude: "39.437",
        longitude: "-76.62",
        method: 2,
        school: 0,
      }),
    ).rejects.toThrow(/AlAdhan failed: Geocoding is temporarily unavailable/);
  });

  it("parses a successful timings response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          status: "OK",
          data: {
            timings: {
              Fajr: "05:45",
              Dhuhr: "11:54",
              Asr: "14:26",
              Maghrib: "16:44",
              Isha: "18:03",
            },
          },
        }),
      }),
    );

    await expect(
      fetchAlAdhanTimes("2026-11-27", {
        city: "Timonium",
        state: "MD",
        country: "US",
        latitude: "39.437",
        longitude: "-76.62",
        method: 2,
        school: 0,
      }),
    ).resolves.toEqual({
      fajr: "05:45",
      dhuhr: "11:54",
      asr: "14:26",
      maghrib: "16:44",
      isha: "18:03",
    });
  });
});
