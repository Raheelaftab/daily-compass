import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

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

vi.mock("@/lib/dates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./dates")>();
  return {
    ...actual,
    todayStr: () => "2026-11-26",
  };
});

import { getMonthlyReport } from "./queries";

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
    name: "Personal",
    slug: "personal",
    color: "gray",
    weeklyTargetMinutes: null,
    sortOrder: 2,
    isActive: true,
  },
] as const;

beforeEach(() => {
  selectMock.mockReset();
});

describe("getMonthlyReport", () => {
  it("returns empty totals and scaled targets for a quiet month", async () => {
    selectMock
      .mockReturnValueOnce(thenableQuery([...AREAS])) // areas
      .mockReturnValueOnce(thenableQuery([])) // logs
      .mockReturnValueOnce(thenableQuery([])) // tasks
      .mockReturnValueOnce(thenableQuery([{ id: 1 }])) // habits
      .mockReturnValueOnce(thenableQuery([])); // checks

    const report = await getMonthlyReport("2026-11");

    expect(report.start).toBe("2026-11-01");
    expect(report.end).toBe("2026-11-30");
    expect(report.weeks).toBeCloseTo(30 / 7, 5);
    expect(report.tasksCompleted).toBe(0);
    expect(report.slippedTasks).toHaveLength(0);
    expect(report.bestDay).toBeNull();
    expect(report.hoursByArea[0]).toMatchObject({
      loggedMinutes: 0,
      targetMinutes: Math.round(420 * (30 / 7)),
    });
    expect(report.hoursByArea[1].targetMinutes).toBeNull();
    // habit days: Nov 1–26 inclusive = 26
    expect(report.habitPossible).toBe(26);
    expect(report.habitRatePercent).toBe(0);
  });

  it("aggregates per-area hours, best day, completed and slipped tasks", async () => {
    selectMock
      .mockReturnValueOnce(thenableQuery([...AREAS]))
      .mockReturnValueOnce(
        thenableQuery([
          { areaId: 1, minutes: 60, logDate: "2026-11-10" },
          { areaId: 1, minutes: 90, logDate: "2026-11-10" },
          { areaId: 2, minutes: 30, logDate: "2026-11-12" },
        ]),
      )
      .mockReturnValueOnce(
        thenableQuery([
          {
            id: 1,
            title: "Done task",
            status: "done",
            dueDate: "2026-11-09",
            completedAt: new Date("2026-11-10T15:00:00.000Z"),
            areaName: "Work",
            areaColor: "blue",
          },
          {
            id: 2,
            title: "Slipped",
            status: "todo",
            dueDate: "2026-11-05",
            completedAt: null,
            areaName: "Personal",
            areaColor: "gray",
          },
          {
            id: 3,
            title: "Outside month due",
            status: "todo",
            dueDate: "2026-10-01",
            completedAt: null,
            areaName: "Work",
            areaColor: "blue",
          },
        ]),
      )
      .mockReturnValueOnce(thenableQuery([]))
      .mockReturnValueOnce(thenableQuery([]));

    const report = await getMonthlyReport("2026-11");

    expect(report.hoursByArea.find((r) => r.areaId === 1)?.loggedMinutes).toBe(
      150,
    );
    expect(report.hoursByArea.find((r) => r.areaId === 2)?.loggedMinutes).toBe(
      30,
    );
    expect(report.bestDay).toMatchObject({
      date: "2026-11-10",
      minutes: 150,
    });
    expect(report.tasksCompleted).toBe(1);
    expect(report.slippedTasks.map((t) => t.title)).toEqual(["Slipped"]);
  });
});
