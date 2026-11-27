"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { todayStr } from "@/lib/dates";
import { countTop3ForToday } from "@/lib/queries";
import { spawnNextRecurringTask } from "@/lib/recurrence-spawn";
import {
  createTaskSchema,
  setTaskStatusSchema,
  taskIdSchema,
  updateTaskSchema,
} from "@/lib/validators";

function revalidateTaskPaths() {
  revalidatePath("/tasks");
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function createTask(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid task");
  }

  const { title, areaId, priority, dueDate, notes, recurrence } = parsed.data;

  await db.insert(tasks).values({
    title,
    areaId,
    priority,
    dueDate: dueDate ?? null,
    notes: notes ?? null,
    recurrence: recurrence === undefined ? null : recurrence,
  });

  revalidateTaskPaths();
  return ok();
}

export async function updateTask(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid task");
  }

  const { id, title, areaId, priority, dueDate, notes, recurrence } =
    parsed.data;

  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!existing) {
    return fail("Task not found");
  }

  // Recurrence changes apply only to this task (future instances unchanged).
  await db
    .update(tasks)
    .set({
      title,
      areaId,
      priority,
      dueDate: dueDate ?? null,
      notes: notes ?? null,
      recurrence: recurrence === undefined ? null : recurrence,
    })
    .where(eq(tasks.id, id));

  revalidateTaskPaths();
  return ok();
}

export async function setTaskStatus(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = setTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid status");
  }

  const { id, status } = parsed.data;

  const [existing] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      areaId: tasks.areaId,
      priority: tasks.priority,
      notes: tasks.notes,
      recurrence: tasks.recurrence,
      dueDate: tasks.dueDate,
      status: tasks.status,
    })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!existing) {
    return fail("Task not found");
  }

  await db
    .update(tasks)
    .set({
      status,
      completedAt: status === "done" ? new Date() : null,
    })
    .where(eq(tasks.id, id));

  if (status === "done" && existing.status !== "done") {
    await spawnNextRecurringTask({
      id: existing.id,
      title: existing.title,
      areaId: existing.areaId,
      priority: existing.priority,
      notes: existing.notes,
      recurrence: existing.recurrence,
      dueDate: existing.dueDate,
    });
  }

  revalidateTaskPaths();
  return ok();
}

export async function deleteTask(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = taskIdSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid task");
  }

  const { id } = parsed.data;

  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!existing) {
    return fail("Task not found");
  }

  await db.delete(tasks).where(eq(tasks.id, id));

  revalidateTaskPaths();
  return ok();
}

export async function toggleTop3(taskId: number): Promise<ActionResult> {
  await requireSession();

  const parsed = taskIdSchema.safeParse({ id: taskId });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid task");
  }

  const { id } = parsed.data;
  const today = todayStr();

  const [existing] = await db
    .select({
      id: tasks.id,
      top3For: tasks.top3For,
    })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!existing) {
    return fail("Task not found");
  }

  if (existing.top3For === today) {
    await db.update(tasks).set({ top3For: null }).where(eq(tasks.id, id));
    revalidateTaskPaths();
    return ok();
  }

  const count = await countTop3ForToday();
  if (count >= 3) {
    return fail("Top 3 is full — remove one first");
  }

  await db.update(tasks).set({ top3For: today }).where(eq(tasks.id, id));
  revalidateTaskPaths();
  return ok();
}
