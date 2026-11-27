import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, insertMock, deleteMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  deleteMock: vi.fn(),
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
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

import { stopRunningTimer } from "./timer-ops";

beforeEach(() => {
  selectMock.mockReset();
  insertMock.mockReset();
  deleteMock.mockReset();
});

describe("stopRunningTimer", () => {
  it("returns null when no timer is running", async () => {
    selectMock.mockReturnValueOnce(thenableQuery([]));
    await expect(stopRunningTimer()).resolves.toBeNull();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("logs rounded minutes (min 1) using America/New_York start date", async () => {
    const startedAt = new Date("2026-11-27T04:30:00.000Z"); // Nov 26 ET
    selectMock.mockReturnValueOnce(
      thenableQuery([
        {
          id: 1,
          areaId: 2,
          taskId: 9,
          startedAt,
          note: "focus",
        },
      ]),
    );
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValueOnce({ values: valuesMock });
    deleteMock.mockReturnValueOnce(thenableQuery(undefined));

    const endedAt = new Date(startedAt.getTime() + 20_000); // 20s → 1 minute min
    const result = await stopRunningTimer({ endedAt });

    expect(result).toEqual({
      minutes: 1,
      logDate: "2026-11-26",
      areaId: 2,
      taskId: 9,
    });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        areaId: 2,
        taskId: 9,
        minutes: 1,
        note: "focus",
        logDate: "2026-11-26",
      }),
    );
  });

  it("respects an explicit minutes override", async () => {
    const startedAt = new Date("2026-11-26T12:00:00.000Z");
    selectMock.mockReturnValueOnce(
      thenableQuery([
        {
          id: 3,
          areaId: 1,
          taskId: null,
          startedAt,
          note: null,
        },
      ]),
    );
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValueOnce({ values: valuesMock });
    deleteMock.mockReturnValueOnce(thenableQuery(undefined));

    const result = await stopRunningTimer({ minutes: 400 });
    expect(result?.minutes).toBe(400);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ minutes: 400 }),
    );
  });
});
