import { describe, expect, it } from "vitest";

import {
  createTaskMcpSchema,
  getWeekSummarySchema,
  listAreasSchema,
  listTasksSchema,
  logTimeMcpSchema,
  setTop3Schema,
  updateAreaMcpSchema,
  updateTaskMcpSchema,
} from "./schemas";

describe("list_areas schema", () => {
  it("accepts an empty object", () => {
    expect(listAreasSchema.safeParse({}).success).toBe(true);
  });
});

describe("list_tasks schema", () => {
  it("defaults status to open", () => {
    const parsed = listTasksSchema.parse({});
    expect(parsed.status).toBe("open");
  });

  it("accepts areaSlug, status, and dueBefore", () => {
    const parsed = listTasksSchema.parse({
      areaSlug: "rinoviy",
      status: "all",
      dueBefore: "2026-11-21",
    });
    expect(parsed).toEqual({
      areaSlug: "rinoviy",
      status: "all",
      dueBefore: "2026-11-21",
    });
  });

  it("rejects invalid status", () => {
    expect(listTasksSchema.safeParse({ status: "pending" }).success).toBe(
      false,
    );
  });

  it("rejects invalid dueBefore", () => {
    expect(
      listTasksSchema.safeParse({ dueBefore: "11/21/2026" }).success,
    ).toBe(false);
  });
});

describe("create_task schema", () => {
  it("requires title and areaSlug", () => {
    expect(createTaskMcpSchema.safeParse({}).success).toBe(false);
    expect(
      createTaskMcpSchema.safeParse({ title: "Ship MCP" }).success,
    ).toBe(false);
  });

  it("accepts a valid payload and defaults priority", () => {
    const parsed = createTaskMcpSchema.parse({
      title: "Ship MCP",
      areaSlug: "rinoviy",
    });
    expect(parsed.priority).toBe("medium");
  });

  it("rejects invalid dueDate", () => {
    expect(
      createTaskMcpSchema.safeParse({
        title: "x",
        areaSlug: "rinoviy",
        dueDate: "tomorrow",
      }).success,
    ).toBe(false);
  });
});

describe("update_task schema", () => {
  it("requires id and at least one field", () => {
    expect(updateTaskMcpSchema.safeParse({ id: 1 }).success).toBe(false);
  });

  it("accepts partial updates", () => {
    const parsed = updateTaskMcpSchema.parse({
      id: 3,
      status: "done",
      dueDate: null,
    });
    expect(parsed.status).toBe("done");
    expect(parsed.dueDate).toBeNull();
  });

  it("rejects invalid status", () => {
    expect(
      updateTaskMcpSchema.safeParse({ id: 1, status: "finished" }).success,
    ).toBe(false);
  });
});

describe("set_top3 schema", () => {
  it("requires taskId", () => {
    expect(setTop3Schema.safeParse({}).success).toBe(false);
  });

  it("accepts taskId without date", () => {
    expect(setTop3Schema.parse({ taskId: 9 })).toEqual({ taskId: 9 });
  });

  it("rejects invalid date", () => {
    expect(
      setTop3Schema.safeParse({ taskId: 1, date: "2026/11/21" }).success,
    ).toBe(false);
  });
});

describe("log_time schema", () => {
  it("requires areaSlug and minutes", () => {
    expect(logTimeMcpSchema.safeParse({ minutes: 30 }).success).toBe(false);
    expect(
      logTimeMcpSchema.safeParse({ areaSlug: "rinoviy" }).success,
    ).toBe(false);
  });

  it("rejects minutes outside 1–720", () => {
    expect(
      logTimeMcpSchema.safeParse({ areaSlug: "rinoviy", minutes: 0 }).success,
    ).toBe(false);
    expect(
      logTimeMcpSchema.safeParse({ areaSlug: "rinoviy", minutes: 721 }).success,
    ).toBe(false);
  });

  it("accepts a full valid payload", () => {
    const parsed = logTimeMcpSchema.parse({
      areaSlug: "rinoviy",
      minutes: 45,
      note: "standup",
      date: "2026-11-21",
      taskId: 12,
    });
    expect(parsed.minutes).toBe(45);
    expect(parsed.taskId).toBe(12);
  });
});

describe("get_week_summary schema", () => {
  it("accepts an empty object", () => {
    expect(getWeekSummarySchema.safeParse({}).success).toBe(true);
  });

  it("accepts weekStart", () => {
    expect(
      getWeekSummarySchema.parse({ weekStart: "2026-11-17" }).weekStart,
    ).toBe("2026-11-17");
  });

  it("rejects invalid weekStart", () => {
    expect(
      getWeekSummarySchema.safeParse({ weekStart: "not-a-date" }).success,
    ).toBe(false);
  });
});

describe("update_area schema", () => {
  it("requires slug and at least one field", () => {
    expect(updateAreaMcpSchema.safeParse({}).success).toBe(false);
    expect(updateAreaMcpSchema.safeParse({ slug: "personal" }).success).toBe(
      false,
    );
  });

  it("accepts weeklyTargetHours as a number", () => {
    const parsed = updateAreaMcpSchema.parse({
      slug: "personal",
      weeklyTargetHours: 2.5,
    });
    expect(parsed.weeklyTargetHours).toBe(2.5);
  });

  it("clears weeklyTargetHours when null or empty string", () => {
    expect(
      updateAreaMcpSchema.parse({
        slug: "personal",
        weeklyTargetHours: null,
      }).weeklyTargetHours,
    ).toBeNull();
    expect(
      updateAreaMcpSchema.parse({
        slug: "personal",
        weeklyTargetHours: "",
      }).weeklyTargetHours,
    ).toBeNull();
  });

  it("accepts name, color, and isActive", () => {
    const parsed = updateAreaMcpSchema.parse({
      slug: "personal",
      name: "Personal",
      color: "gray",
      isActive: true,
    });
    expect(parsed.color).toBe("gray");
    expect(parsed.isActive).toBe(true);
  });

  it("rejects invalid color", () => {
    expect(
      updateAreaMcpSchema.safeParse({
        slug: "personal",
        color: "pink",
      }).success,
    ).toBe(false);
  });
});
