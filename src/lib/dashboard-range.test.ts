import { describe, expect, it } from "vitest";

import { addDays, todayStr, weekEnd, weekStart } from "./dates";
import {
  dashboardRangeHref,
  resolveDashboardRange,
  weekStartForLegacyWidgets,
} from "./dashboard-range";

describe("resolveDashboardRange", () => {
  it("defaults to this week", () => {
    const today = todayStr();
    const range = resolveDashboardRange({});
    expect(range.preset).toBe("this-week");
    expect(range.start).toBe(weekStart(today));
    expect(range.end).toBe(weekEnd(range.start));
  });

  it("resolves last-week and last-30", () => {
    const today = todayStr();
    const lastWeekStart = addDays(weekStart(today), -7);
    expect(resolveDashboardRange({ range: "last-week" })).toMatchObject({
      preset: "last-week",
      start: lastWeekStart,
      end: weekEnd(lastWeekStart),
    });
    expect(resolveDashboardRange({ range: "last-30" })).toMatchObject({
      preset: "last-30",
      start: addDays(today, -29),
      end: today,
    });
  });

  it("resolves custom from/to and swaps inverted dates", () => {
    const range = resolveDashboardRange({
      range: "custom",
      from: "2026-11-20",
      to: "2026-11-10",
    });
    expect(range.preset).toBe("custom");
    expect(range.start).toBe("2026-11-10");
    expect(range.end).toBe("2026-11-20");
  });

  it("maps legacy week= to this-week or custom", () => {
    const current = weekStart(todayStr());
    expect(resolveDashboardRange({ week: current }).preset).toBe("this-week");
    expect(resolveDashboardRange({ week: "2020-01-06" }).preset).toBe(
      "custom",
    );
  });
});

describe("dashboardRangeHref", () => {
  it("omits query for this-week", () => {
    expect(dashboardRangeHref("this-week")).toBe("/dashboard");
  });

  it("builds custom query", () => {
    expect(
      dashboardRangeHref("custom", { from: "2026-01-01", to: "2026-01-07" }),
    ).toBe("/dashboard?range=custom&from=2026-01-01&to=2026-01-07");
  });
});

describe("weekStartForLegacyWidgets", () => {
  it("uses range start for week presets", () => {
    expect(
      weekStartForLegacyWidgets({
        preset: "last-week",
        start: "2026-11-16",
        end: "2026-11-22",
        label: "x",
      }),
    ).toBe("2026-11-16");
  });
});
