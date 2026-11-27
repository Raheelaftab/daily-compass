import { beforeEach, describe, expect, it, vi } from "vitest";

import { addDays, todayStr } from "./dates";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

/** Drizzle-like chain that resolves to `result` when awaited. */
function thenableQuery<T>(result: T) {
  const proxy: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (
            onFulfilled?: (value: T) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) => Promise.resolve(result).then(onFulfilled, onRejected);
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
  },
}));

import {
  getCompletionTrend,
  getDailyMinutes,
  getHabitHeatmap,
  getHabitRateForRange,
  getHoursByAreaForRange,
  getTimeLogsForAreaRange,
} from "./queries";

const AREAS = [
  {
    id: 1,
    name: "Work",
    slug: "work",
    color: "blue",
    weeklyTargetMinutes: 420,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    name: "Health",
    slug: "health",
    color: "green",
    weeklyTargetMinutes: 210,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    name: "Personal",
    slug: "personal",
    color: "gray",
    weeklyTargetMinutes: null,
    sortOrder: 3,
    isActive: true,
  },
] as const;

/** 2026-11-10 00:00 America/New_York (winter = UTC−5). */
const ET_NOV10_MIDNIGHT = new Date("2026-11-10T05:00:00.000Z");
/** One minute before that midnight → still 2026-11-09 in ET. */
const ET_NOV9_LATE = new Date("2026-11-10T04:59:00.000Z");
/** End of 2026-11-10 in ET. */
const ET_NOV10_LATE = new Date("2026-11-11T04:59:00.000Z");

beforeEach(() => {
  selectMock.mockReset();
});

describe("getCompletionTrend", () => {
  it("returns zero-filled daily buckets for an empty range", async () => {
    selectMock.mockReturnValueOnce(thenableQuery([]));

    const points = await getCompletionTrend({
      start: "2026-11-10",
      end: "2026-11-12",
    });

    expect(points).toEqual([
      { key: "2026-11-10", label: "Nov 10", completed: 0, created: 0 },
      { key: "2026-11-11", label: "Nov 11", completed: 0, created: 0 },
      { key: "2026-11-12", label: "Nov 12", completed: 0, created: 0 },
    ]);
  });

  it("buckets created/completed by America/New_York calendar day at range boundaries", async () => {
    selectMock.mockReturnValueOnce(
      thenableQuery([
        // Created just before ET midnight → Nov 9 (outside range)
        {
          status: "todo",
          completedAt: null,
          createdAt: ET_NOV9_LATE,
        },
        // Created at ET midnight Nov 10 → included
        {
          status: "todo",
          completedAt: null,
          createdAt: ET_NOV10_MIDNIGHT,
        },
        // Completed late on ET Nov 10 → included as completed
        {
          status: "done",
          completedAt: ET_NOV10_LATE,
          createdAt: ET_NOV9_LATE,
        },
        // Completed just after ET midnight Nov 11 → outside end=Nov10
        {
          status: "done",
          completedAt: new Date("2026-11-11T05:00:00.000Z"),
          createdAt: ET_NOV10_MIDNIGHT,
        },
      ]),
    );

    const points = await getCompletionTrend({
      start: "2026-11-10",
      end: "2026-11-10",
    });

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      key: "2026-11-10",
      created: 2, // midnight create + create of the Nov11-completed task
      completed: 1, // only ET_NOV10_LATE
    });
  });
});

describe("getDailyMinutes", () => {
  it("returns zero hours per area for every day when there are no logs", async () => {
    selectMock
      .mockReturnValueOnce(thenableQuery([...AREAS]))
      .mockReturnValueOnce(thenableQuery([]));

    const data = await getDailyMinutes({
      start: "2026-11-10",
      end: "2026-11-11",
    });

    expect(data.series.map((s) => s.slug)).toEqual([
      "work",
      "health",
      "personal",
    ]);
    expect(data.points).toHaveLength(2);
    for (const point of data.points) {
      expect(point.totalHours).toBe(0);
      expect(point.work).toBe(0);
      expect(point.health).toBe(0);
      expect(point.personal).toBe(0);
    }
  });

  it("sums per-area minutes on inclusive start/end dates", async () => {
    selectMock
      .mockReturnValueOnce(thenableQuery([...AREAS]))
      .mockReturnValueOnce(
        thenableQuery([
          { logDate: "2026-11-10", areaId: 1, minutes: 60 },
          { logDate: "2026-11-10", areaId: 1, minutes: 30 },
          { logDate: "2026-11-10", areaId: 2, minutes: 90 },
          { logDate: "2026-11-12", areaId: 1, minutes: 120 }, // end boundary
          { logDate: "2026-11-09", areaId: 1, minutes: 999 }, // outside (if returned)
          { logDate: "2026-11-13", areaId: 2, minutes: 999 }, // outside
        ]),
      );

    const data = await getDailyMinutes({
      start: "2026-11-10",
      end: "2026-11-12",
    });

    const byDate = Object.fromEntries(data.points.map((p) => [p.date, p]));
    expect(byDate["2026-11-10"]).toMatchObject({
      work: 1.5,
      health: 1.5,
      personal: 0,
      totalHours: 3,
    });
    expect(byDate["2026-11-11"]).toMatchObject({
      work: 0,
      health: 0,
      personal: 0,
      totalHours: 0,
    });
    expect(byDate["2026-11-12"]).toMatchObject({
      work: 2,
      health: 0,
      personal: 0,
      totalHours: 2,
    });
  });
});

describe("getHoursByAreaForRange", () => {
  it("returns zero logged minutes and scaled targets when empty", async () => {
    selectMock
      .mockReturnValueOnce(thenableQuery([...AREAS]))
      .mockReturnValueOnce(thenableQuery([]));

    // 7-day range → scale 1
    const rows = await getHoursByAreaForRange({
      start: "2026-11-10",
      end: "2026-11-16",
    });

    expect(rows).toEqual([
      {
        areaId: 1,
        name: "Work",
        color: "blue",
        loggedMinutes: 0,
        targetMinutes: 420,
      },
      {
        areaId: 2,
        name: "Health",
        color: "green",
        loggedMinutes: 0,
        targetMinutes: 210,
      },
      {
        areaId: 3,
        name: "Personal",
        color: "gray",
        loggedMinutes: 0,
        targetMinutes: null,
      },
    ]);
  });

  it("aggregates correct per-area totals and scales targets by range length", async () => {
    selectMock
      .mockReturnValueOnce(thenableQuery([...AREAS]))
      .mockReturnValueOnce(
        thenableQuery([
          { areaId: 1, minutes: 60 },
          { areaId: 1, minutes: 45 },
          { areaId: 2, minutes: 30 },
          // area 3 has no logs
        ]),
      );

    // 14-day range → scale 2
    const rows = await getHoursByAreaForRange({
      start: "2026-11-01",
      end: "2026-11-14",
    });

    expect(rows.find((r) => r.areaId === 1)).toMatchObject({
      loggedMinutes: 105,
      targetMinutes: 840,
    });
    expect(rows.find((r) => r.areaId === 2)).toMatchObject({
      loggedMinutes: 30,
      targetMinutes: 420,
    });
    expect(rows.find((r) => r.areaId === 3)).toMatchObject({
      loggedMinutes: 0,
      targetMinutes: null,
    });
  });
});

describe("getTimeLogsForAreaRange", () => {
  it("returns an empty list when there are no logs", async () => {
    selectMock.mockReturnValueOnce(thenableQuery([]));

    const logs = await getTimeLogsForAreaRange({
      areaId: 1,
      rangeStart: "2026-11-10",
      rangeEnd: "2026-11-12",
    });

    expect(logs).toEqual([]);
  });

  it("maps boundary-day logs for the requested area", async () => {
    selectMock.mockReturnValueOnce(
      thenableQuery([
        {
          id: 10,
          logDate: "2026-11-10",
          minutes: 25,
          note: "start",
          areaId: 1,
          areaName: "Work",
          areaColor: "blue",
          taskTitle: "Ship",
        },
        {
          id: 11,
          logDate: "2026-11-12",
          minutes: 40,
          note: null,
          areaId: 1,
          areaName: "Work",
          areaColor: "blue",
          taskTitle: null,
        },
      ]),
    );

    const logs = await getTimeLogsForAreaRange({
      areaId: 1,
      rangeStart: "2026-11-10",
      rangeEnd: "2026-11-12",
    });

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      id: 10,
      logDate: "2026-11-10",
      minutes: 25,
      taskTitle: "Ship",
      areaName: "Work",
    });
    expect(logs[1]).toMatchObject({
      id: 11,
      logDate: "2026-11-12",
      minutes: 40,
      note: null,
      taskTitle: null,
    });
  });
});

describe("getHabitRateForRange", () => {
  it("returns null rate for an empty habit set", async () => {
    selectMock.mockReturnValueOnce(thenableQuery([]));

    const summary = await getHabitRateForRange({
      start: "2026-11-10",
      end: "2026-11-12",
    });

    expect(summary).toEqual({
      habitChecksDone: 0,
      habitPossible: 0,
      habitRatePercent: null,
      daysElapsed: 3,
    });
  });

  it("counts only checks on inclusive range days up to today (ET calendar)", async () => {
    const today = todayStr();
    const start = addDays(today, -2);
    const end = addDays(today, 5); // future end capped to today

    selectMock
      .mockReturnValueOnce(thenableQuery([{ id: 1 }, { id: 2 }]))
      .mockReturnValueOnce(
        thenableQuery([
          { habitId: 1, checkDate: start, done: true },
          { habitId: 2, checkDate: start, done: true },
          { habitId: 1, checkDate: today, done: true },
          // would be outside if SQL filtered; mock returns only in-range rows
        ]),
      );

    const summary = await getHabitRateForRange({ start, end });

    expect(summary.daysElapsed).toBe(3);
    expect(summary.habitPossible).toBe(6); // 2 habits × 3 days
    expect(summary.habitChecksDone).toBe(3);
    expect(summary.habitRatePercent).toBe(50);
  });
});

describe("getHabitHeatmap", () => {
  it("returns zero-intensity days when there are no active habits", async () => {
    selectMock.mockReturnValueOnce(thenableQuery([]));

    const data = await getHabitHeatmap(3);
    const today = todayStr();

    expect(data.end).toBe(today);
    expect(data.start).toBe(addDays(today, -2));
    expect(data.days).toHaveLength(3);
    for (const day of data.days) {
      expect(day.done).toBe(0);
      expect(day.possible).toBe(0);
      expect(day.ratePercent).toBeNull();
    }
  });

  it("aggregates per-day totals across the last N America/New_York days", async () => {
    const today = todayStr();
    const start = addDays(today, -2);
    const mid = addDays(today, -1);

    selectMock
      .mockReturnValueOnce(thenableQuery([{ id: 1 }, { id: 2 }]))
      .mockReturnValueOnce(
        thenableQuery([
          { checkDate: start },
          { checkDate: start },
          { checkDate: mid },
          { checkDate: today },
          { checkDate: today },
        ]),
      );

    const data = await getHabitHeatmap(3);
    const byDate = Object.fromEntries(data.days.map((d) => [d.date, d]));

    expect(byDate[start]).toMatchObject({
      done: 2,
      possible: 2,
      ratePercent: 100,
    });
    expect(byDate[mid]).toMatchObject({
      done: 1,
      possible: 2,
      ratePercent: 50,
    });
    expect(byDate[today]).toMatchObject({
      done: 2,
      possible: 2,
      ratePercent: 100,
    });
  });
});
