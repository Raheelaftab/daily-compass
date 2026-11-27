import { eq } from "drizzle-orm";

import { db } from "@/db";
import { areas, tasks, timeLogs } from "@/db/schema";
import { minutesToHours, todayStr, weekStart } from "@/lib/dates";
import {
  getActiveAreas,
  getTasks,
  getWeekStats,
  type TaskStatusFilter,
} from "@/lib/queries";

import type {
  CreateTaskMcpInput,
  GetWeekSummaryInput,
  ListTasksInput,
  LogTimeMcpInput,
  SetTop3Input,
  UpdateAreaMcpInput,
  UpdateTaskMcpInput,
} from "./schemas";

export class McpToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpToolError";
  }
}

async function findAreaBySlug(slug: string) {
  const [area] = await db
    .select({
      id: areas.id,
      name: areas.name,
      slug: areas.slug,
      color: areas.color,
      weeklyTargetMinutes: areas.weeklyTargetMinutes,
      isActive: areas.isActive,
      sortOrder: areas.sortOrder,
    })
    .from(areas)
    .where(eq(areas.slug, slug))
    .limit(1);

  if (!area) {
    throw new McpToolError(`Area not found for slug "${slug}"`);
  }
  return area;
}

async function countTop3ForDate(date: string): Promise<number> {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.top3For, date));
  return rows.length;
}

export async function listAreas() {
  const rows = await getActiveAreas();
  return rows.map((area) => ({
    id: area.id,
    name: area.name,
    slug: area.slug,
    weeklyTargetHours:
      area.weeklyTargetMinutes != null
        ? minutesToHours(area.weeklyTargetMinutes)
        : null,
    weeklyTargetMinutes: area.weeklyTargetMinutes,
  }));
}

export async function listTasks(input: ListTasksInput) {
  const status = (input.status ?? "open") as TaskStatusFilter;
  let areaId: number | undefined;

  if (input.areaSlug) {
    const area = await findAreaBySlug(input.areaSlug);
    areaId = area.id;
  }

  const [taskRows, areaRows] = await Promise.all([
    getTasks({ areaId, status }),
    getActiveAreas(),
  ]);
  const slugById = new Map(areaRows.map((a) => [a.id, a.slug]));

  let rows = taskRows;
  if (input.dueBefore) {
    const dueBefore = input.dueBefore;
    rows = rows.filter(
      (task) => task.dueDate != null && task.dueDate < dueBefore,
    );
  }

  return rows.slice(0, 50).map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    top3For: task.top3For,
    notes: task.notes,
    areaId: task.areaId,
    areaName: task.areaName,
    areaSlug: slugById.get(task.areaId) ?? null,
  }));
}

export async function createTask(input: CreateTaskMcpInput) {
  const area = await findAreaBySlug(input.areaSlug);

  const [created] = await db
    .insert(tasks)
    .values({
      title: input.title,
      areaId: area.id,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      notes: input.notes ?? null,
    })
    .returning({
      id: tasks.id,
      title: tasks.title,
      areaId: tasks.areaId,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      notes: tasks.notes,
    });

  return {
    ...created,
    areaSlug: area.slug,
    areaName: area.name,
  };
}

export async function updateTask(input: UpdateTaskMcpInput) {
  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, input.id))
    .limit(1);

  if (!existing) {
    throw new McpToolError(`Task not found: ${input.id}`);
  }

  const patch: {
    title?: string;
    priority?: "high" | "medium" | "low";
    dueDate?: string | null;
    notes?: string | null;
    status?: "todo" | "in_progress" | "done";
    completedAt?: Date | null;
  } = {};

  if (input.title !== undefined) patch.title = input.title;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.completedAt = input.status === "done" ? new Date() : null;
  }

  const [updated] = await db
    .update(tasks)
    .set(patch)
    .where(eq(tasks.id, input.id))
    .returning({
      id: tasks.id,
      title: tasks.title,
      areaId: tasks.areaId,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      notes: tasks.notes,
      top3For: tasks.top3For,
    });

  return updated;
}

export async function setTop3(input: SetTop3Input) {
  const date = input.date ?? todayStr();

  const [existing] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      top3For: tasks.top3For,
    })
    .from(tasks)
    .where(eq(tasks.id, input.taskId))
    .limit(1);

  if (!existing) {
    throw new McpToolError(`Task not found: ${input.taskId}`);
  }

  if (existing.top3For === date) {
    return {
      id: existing.id,
      title: existing.title,
      top3For: date,
      alreadySet: true,
    };
  }

  const count = await countTop3ForDate(date);
  if (count >= 3) {
    throw new McpToolError(
      `Top 3 is full for ${date} — remove one first (max 3)`,
    );
  }

  const [updated] = await db
    .update(tasks)
    .set({ top3For: date })
    .where(eq(tasks.id, input.taskId))
    .returning({
      id: tasks.id,
      title: tasks.title,
      top3For: tasks.top3For,
    });

  return { ...updated, alreadySet: false };
}

export async function logTime(input: LogTimeMcpInput) {
  const area = await findAreaBySlug(input.areaSlug);
  const logDate = input.date ?? todayStr();

  if (input.taskId != null) {
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, input.taskId))
      .limit(1);
    if (!task) {
      throw new McpToolError(`Task not found: ${input.taskId}`);
    }
  }

  const [created] = await db
    .insert(timeLogs)
    .values({
      areaId: area.id,
      minutes: input.minutes,
      note: input.note ?? null,
      taskId: input.taskId ?? null,
      logDate,
    })
    .returning({
      id: timeLogs.id,
      areaId: timeLogs.areaId,
      taskId: timeLogs.taskId,
      logDate: timeLogs.logDate,
      minutes: timeLogs.minutes,
      note: timeLogs.note,
    });

  return {
    ...created,
    areaSlug: area.slug,
    areaName: area.name,
  };
}

export async function getWeekSummary(input: GetWeekSummaryInput) {
  const anchor = input.weekStart ?? todayStr();
  const start = weekStart(anchor);
  const stats = await getWeekStats(start);

  return {
    weekStart: stats.weekStart,
    weekEnd: stats.weekEnd,
    displayRange: stats.displayRange,
    hoursByArea: stats.hoursByArea.map((row) => ({
      areaId: row.areaId,
      name: row.name,
      loggedHours: minutesToHours(row.loggedMinutes),
      loggedMinutes: row.loggedMinutes,
      targetHours:
        row.targetMinutes != null ? minutesToHours(row.targetMinutes) : null,
      targetMinutes: row.targetMinutes,
    })),
    totalLoggedHours: minutesToHours(stats.totalLoggedMinutes),
    totalTargetHours: minutesToHours(stats.totalTargetMinutes),
    targetPercent: stats.targetPercent,
    tasksCompleted: stats.tasksCompleted,
    tasksOpen: stats.tasksOpen,
    tasksOverdue: stats.tasksOverdue,
  };
}

export async function updateArea(input: UpdateAreaMcpInput) {
  const existing = await findAreaBySlug(input.slug);

  const patch: {
    name?: string;
    color?: string;
    weeklyTargetMinutes?: number | null;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.color !== undefined) patch.color = input.color;
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  if (input.weeklyTargetHours !== undefined) {
    patch.weeklyTargetMinutes =
      input.weeklyTargetHours === null
        ? null
        : Math.round(input.weeklyTargetHours * 60);
  }

  const [updated] = await db
    .update(areas)
    .set(patch)
    .where(eq(areas.id, existing.id))
    .returning({
      id: areas.id,
      name: areas.name,
      slug: areas.slug,
      color: areas.color,
      weeklyTargetMinutes: areas.weeklyTargetMinutes,
      isActive: areas.isActive,
      sortOrder: areas.sortOrder,
    });

  return {
    ...updated,
    weeklyTargetHours:
      updated.weeklyTargetMinutes != null
        ? minutesToHours(updated.weeklyTargetMinutes)
        : null,
  };
}
