import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { todayStr } from "@/lib/dates";
import {
  nextDueDateOnOrAfter,
  parseRecurrence,
} from "@/lib/recurrence";

export type RecurringTaskSeed = {
  id: number;
  title: string;
  areaId: number;
  priority: "high" | "medium" | "low";
  notes: string | null;
  recurrence: string | null;
  dueDate: string | null;
};

/**
 * When a recurring task is marked done, create the next open instance.
 * Skips if recurrence is none, or a matching task already exists for that due date.
 */
export async function spawnNextRecurringTask(
  completed: RecurringTaskSeed,
): Promise<{ created: boolean; dueDate: string | null }> {
  const rule = parseRecurrence(completed.recurrence);
  if (!rule || completed.recurrence == null) {
    return { created: false, dueDate: null };
  }

  const today = todayStr();
  const from = completed.dueDate ?? today;
  const nextDue = nextDueDateOnOrAfter(rule, from, today);

  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.dueDate, nextDue),
        eq(tasks.areaId, completed.areaId),
        eq(tasks.title, completed.title),
        eq(tasks.recurrence, completed.recurrence),
      ),
    )
    .limit(1);

  if (existing) {
    return { created: false, dueDate: nextDue };
  }

  await db.insert(tasks).values({
    title: completed.title,
    areaId: completed.areaId,
    priority: completed.priority,
    notes: completed.notes,
    recurrence: completed.recurrence,
    dueDate: nextDue,
    status: "todo",
    recurrenceParentId: completed.id,
  });

  return { created: true, dueDate: nextDue };
}
