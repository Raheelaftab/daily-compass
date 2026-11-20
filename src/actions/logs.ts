"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { areas, tasks, timeLogs } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { todayStr } from "@/lib/dates";
import { deleteTimeLogSchema, logTimeSchema } from "@/lib/validators";

function revalidateLogPaths() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function logTime(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = logTimeSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid time log");
  }

  const { areaId, minutes, note, taskId } = parsed.data;
  const logDate = parsed.data.logDate ?? todayStr();

  const [area] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(eq(areas.id, areaId))
    .limit(1);

  if (!area) {
    return fail("Area not found");
  }

  if (taskId != null) {
    const [task] = await db
      .select({ id: tasks.id, areaId: tasks.areaId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return fail("Task not found");
    }
  }

  await db.insert(timeLogs).values({
    areaId,
    minutes,
    note: note ?? null,
    taskId: taskId ?? null,
    logDate,
  });

  revalidateLogPaths();
  return ok();
}

export async function deleteTimeLog(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = deleteTimeLogSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid time log");
  }

  const { id } = parsed.data;

  const [existing] = await db
    .select({ id: timeLogs.id })
    .from(timeLogs)
    .where(eq(timeLogs.id, id))
    .limit(1);

  if (!existing) {
    return fail("Time log not found");
  }

  await db.delete(timeLogs).where(eq(timeLogs.id, id));

  revalidateLogPaths();
  return ok();
}
