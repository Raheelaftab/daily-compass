import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, insertMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
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
    insert: (...args: unknown[]) => insertMock(...args),
  },
}));

vi.mock("@/lib/dates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./dates")>();
  return {
    ...actual,
    todayStr: () => "2026-11-26",
  };
});

import { spawnNextRecurringTask } from "./recurrence-spawn";

const seed = {
  id: 10,
  title: "Standup",
  areaId: 1,
  priority: "medium" as const,
  notes: null,
  recurrence: "daily",
  dueDate: "2026-11-26",
};

beforeEach(() => {
  selectMock.mockReset();
  insertMock.mockReset();
});

describe("spawnNextRecurringTask", () => {
  it("does nothing when recurrence is null", async () => {
    const result = await spawnNextRecurringTask({
      ...seed,
      recurrence: null,
    });
    expect(result).toEqual({ created: false, dueDate: null });
    expect(selectMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("does not create a duplicate when one already exists for that date", async () => {
    selectMock.mockReturnValueOnce(thenableQuery([{ id: 99 }]));

    const result = await spawnNextRecurringTask(seed);

    expect(result).toEqual({ created: false, dueDate: "2026-11-27" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates the next instance with recurrenceParentId set", async () => {
    selectMock.mockReturnValueOnce(thenableQuery([]));
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValueOnce({ values: valuesMock });

    const result = await spawnNextRecurringTask(seed);

    expect(result).toEqual({ created: true, dueDate: "2026-11-27" });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Standup",
        areaId: 1,
        recurrence: "daily",
        dueDate: "2026-11-27",
        status: "todo",
        recurrenceParentId: 10,
      }),
    );
  });
});
