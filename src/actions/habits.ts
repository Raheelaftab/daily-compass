"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { habitChecks, habits } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import {
  createHabitSchema,
  toggleHabitSchema,
  updateHabitSchema,
} from "@/lib/validators";

function revalidateHabitPaths() {
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function createHabit(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = createHabitSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid habit");
  }

  const [last] = await db
    .select({ sortOrder: habits.sortOrder })
    .from(habits)
    .orderBy(desc(habits.sortOrder))
    .limit(1);

  await db.insert(habits).values({
    name: parsed.data.name,
    isActive: true,
    sortOrder: (last?.sortOrder ?? 0) + 1,
  });

  revalidateHabitPaths();
  return ok();
}

export async function updateHabit(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = updateHabitSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid habit");
  }

  const { id, name, isActive } = parsed.data;

  if (name == null && isActive == null) {
    return fail("Nothing to update");
  }

  const [existing] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.id, id))
    .limit(1);

  if (!existing) {
    return fail("Habit not found");
  }

  await db
    .update(habits)
    .set({
      ...(name != null ? { name } : {}),
      ...(isActive != null ? { isActive } : {}),
    })
    .where(eq(habits.id, id));

  revalidateHabitPaths();
  return ok();
}

export async function toggleHabit(
  habitId: number,
  date: string,
): Promise<ActionResult> {
  await requireSession();

  const parsed = toggleHabitSchema.safeParse({ habitId, date });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid habit toggle");
  }

  const [habit] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.id, parsed.data.habitId))
    .limit(1);

  if (!habit) {
    return fail("Habit not found");
  }

  const [existing] = await db
    .select({
      id: habitChecks.id,
      done: habitChecks.done,
    })
    .from(habitChecks)
    .where(
      and(
        eq(habitChecks.habitId, parsed.data.habitId),
        eq(habitChecks.checkDate, parsed.data.date),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(habitChecks).values({
      habitId: parsed.data.habitId,
      checkDate: parsed.data.date,
      done: true,
    });
  } else {
    await db
      .update(habitChecks)
      .set({ done: !existing.done })
      .where(eq(habitChecks.id, existing.id));
  }

  revalidateHabitPaths();
  return ok();
}
