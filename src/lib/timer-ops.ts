import { eq } from "drizzle-orm";

import { db } from "@/db";
import { areas, tasks, timeLogs, timers } from "@/db/schema";
import {
  elapsedMinutes,
  logDateFromStartedAt,
} from "@/lib/timer";

export type RunningTimer = {
  id: number;
  areaId: number;
  areaName: string;
  areaColor: string;
  taskId: number | null;
  taskTitle: string | null;
  startedAt: string;
  note: string | null;
};

export type StoppedTimerLog = {
  minutes: number;
  logDate: string;
  areaId: number;
  taskId: number | null;
};

export async function getRunningTimer(): Promise<RunningTimer | null> {
  const [row] = await db
    .select({
      id: timers.id,
      areaId: timers.areaId,
      areaName: areas.name,
      areaColor: areas.color,
      taskId: timers.taskId,
      taskTitle: tasks.title,
      startedAt: timers.startedAt,
      note: timers.note,
    })
    .from(timers)
    .innerJoin(areas, eq(timers.areaId, areas.id))
    .leftJoin(tasks, eq(timers.taskId, tasks.id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    areaId: row.areaId,
    areaName: row.areaName,
    areaColor: row.areaColor,
    taskId: row.taskId,
    taskTitle: row.taskTitle,
    startedAt: row.startedAt.toISOString(),
    note: row.note,
  };
}

/**
 * Stop the current timer (if any): insert a time_log and delete the timer row.
 * `minutesOverride` is used after the 6h confirmation dialog.
 */
export async function stopRunningTimer(options?: {
  minutes?: number;
  endedAt?: Date;
}): Promise<StoppedTimerLog | null> {
  const [row] = await db
    .select({
      id: timers.id,
      areaId: timers.areaId,
      taskId: timers.taskId,
      startedAt: timers.startedAt,
      note: timers.note,
    })
    .from(timers)
    .limit(1);

  if (!row) return null;

  const endedAt = options?.endedAt ?? new Date();
  const minutes =
    options?.minutes != null
      ? Math.max(1, Math.min(720, Math.round(options.minutes)))
      : elapsedMinutes(row.startedAt, endedAt);
  const logDate = logDateFromStartedAt(row.startedAt);

  await db.insert(timeLogs).values({
    areaId: row.areaId,
    taskId: row.taskId,
    minutes,
    note: row.note,
    logDate,
  });

  await db.delete(timers).where(eq(timers.id, row.id));

  return {
    minutes,
    logDate,
    areaId: row.areaId,
    taskId: row.taskId,
  };
}

/**
 * Start a timer. Stops and logs any existing timer first (one at a time).
 */
export async function startTimerRun(input: {
  areaId: number;
  taskId?: number | null;
  note?: string | null;
}): Promise<RunningTimer> {
  const [area] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(eq(areas.id, input.areaId))
    .limit(1);

  if (!area) {
    throw new Error("Area not found");
  }

  const taskId = input.taskId ?? null;
  if (taskId != null) {
    const [task] = await db
      .select({ id: tasks.id, areaId: tasks.areaId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }
  }

  await stopRunningTimer();

  const [created] = await db
    .insert(timers)
    .values({
      areaId: input.areaId,
      taskId,
      note: input.note ?? null,
      startedAt: new Date(),
    })
    .returning({
      id: timers.id,
      areaId: timers.areaId,
      taskId: timers.taskId,
      startedAt: timers.startedAt,
      note: timers.note,
    });

  const running = await getRunningTimer();
  if (!running || running.id !== created.id) {
    throw new Error("Failed to start timer");
  }
  return running;
}
