"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import {
  getRunningTimer,
  startTimerRun,
  stopRunningTimer,
  type RunningTimer,
  type StoppedTimerLog,
} from "@/lib/timer-ops";

function revalidateTimerPaths() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

const startTimerSchema = z
  .object({
    areaId: z.coerce.number().int().positive().optional(),
    taskId: z.coerce.number().int().positive().optional(),
    note: z
      .union([z.literal(""), z.string().trim().max(300)])
      .optional()
      .transform((value) =>
        value === "" || value == null ? undefined : value,
      ),
  })
  .refine((data) => data.areaId != null || data.taskId != null, {
    message: "Provide an area or task",
  });

const stopTimerSchema = z.object({
  minutes: z.coerce.number().int().min(1).max(720).optional(),
});

export type StartTimerResult =
  | { ok: true; timer: RunningTimer }
  | { ok: false; error: string };

export type StopTimerResult =
  | { ok: true; logged: StoppedTimerLog | null }
  | { ok: false; error: string };

export async function startTimer(input: unknown): Promise<StartTimerResult> {
  await requireSession();

  const parsed = startTimerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid timer" };
  }

  try {
    let areaId = parsed.data.areaId;
    const taskId = parsed.data.taskId ?? null;

    if (taskId != null) {
      const [task] = await db
        .select({ areaId: tasks.areaId })
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);
      if (!task) return { ok: false, error: "Task not found" };
      areaId = task.areaId;
    }

    if (areaId == null) {
      return { ok: false, error: "Provide an area or task" };
    }

    const timer = await startTimerRun({
      areaId,
      taskId,
      note: parsed.data.note ?? null,
    });

    revalidateTimerPaths();
    return { ok: true, timer };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not start timer",
    };
  }
}

export async function stopTimer(input: unknown = {}): Promise<StopTimerResult> {
  await requireSession();

  const parsed = stopTimerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid stop" };
  }

  try {
    const logged = await stopRunningTimer({
      minutes: parsed.data.minutes,
    });
    revalidateTimerPaths();
    return { ok: true, logged };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not stop timer",
    };
  }
}

export async function fetchRunningTimer(): Promise<
  { ok: true; timer: RunningTimer | null } | { ok: false; error: string }
> {
  await requireSession();
  const timer = await getRunningTimer();
  return { ok: true, timer };
}
