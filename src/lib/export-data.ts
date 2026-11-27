import { TZDate } from "@date-fns/tz";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { format } from "date-fns";

import { db } from "@/db";
import { areas, tasks, timeLogs } from "@/db/schema";
import { toCsv } from "@/lib/csv";
import { APP_TIMEZONE } from "@/lib/dates";

function instantToYmd(value: Date): string {
  return format(new TZDate(value, APP_TIMEZONE), "yyyy-MM-dd");
}

export async function exportTasksCsv(range: {
  start: string;
  end: string;
}): Promise<string> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      notes: tasks.notes,
      recurrence: tasks.recurrence,
      areaName: areas.name,
      areaSlug: areas.slug,
    })
    .from(tasks)
    .innerJoin(areas, eq(tasks.areaId, areas.id))
    .orderBy(asc(tasks.id));

  const filtered = rows.filter((row) => {
    const dueInRange =
      row.dueDate != null &&
      row.dueDate >= range.start &&
      row.dueDate <= range.end;
    const completedInRange =
      row.completedAt != null &&
      (() => {
        const d = instantToYmd(row.completedAt);
        return d >= range.start && d <= range.end;
      })();
    const createdInRange = (() => {
      const d = instantToYmd(row.createdAt);
      return d >= range.start && d <= range.end;
    })();
    return dueInRange || completedInRange || createdInRange;
  });

  return toCsv(
    [
      "id",
      "title",
      "area",
      "area_slug",
      "status",
      "priority",
      "due_date",
      "completed_at",
      "created_at",
      "recurrence",
      "notes",
    ],
    filtered.map((row) => [
      row.id,
      row.title,
      row.areaName,
      row.areaSlug,
      row.status,
      row.priority,
      row.dueDate,
      row.completedAt ? row.completedAt.toISOString() : null,
      row.createdAt.toISOString(),
      row.recurrence,
      row.notes,
    ]),
  );
}

export async function exportTimeLogsCsv(range: {
  start: string;
  end: string;
}): Promise<string> {
  const rows = await db
    .select({
      id: timeLogs.id,
      logDate: timeLogs.logDate,
      minutes: timeLogs.minutes,
      note: timeLogs.note,
      areaName: areas.name,
      areaSlug: areas.slug,
      taskTitle: tasks.title,
      taskId: timeLogs.taskId,
      createdAt: timeLogs.createdAt,
    })
    .from(timeLogs)
    .innerJoin(areas, eq(timeLogs.areaId, areas.id))
    .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
    .where(
      and(gte(timeLogs.logDate, range.start), lte(timeLogs.logDate, range.end)),
    )
    .orderBy(desc(timeLogs.logDate), desc(timeLogs.createdAt));

  return toCsv(
    [
      "id",
      "log_date",
      "minutes",
      "area",
      "area_slug",
      "task_id",
      "task_title",
      "note",
      "created_at",
    ],
    rows.map((row) => [
      row.id,
      row.logDate,
      row.minutes,
      row.areaName,
      row.areaSlug,
      row.taskId,
      row.taskTitle,
      row.note,
      row.createdAt.toISOString(),
    ]),
  );
}
