"use server";

import { requireSession } from "@/lib/auth";
import {
  getTasksForDrill,
  type TaskWithArea,
  type TasksForDrillFilter,
} from "@/lib/queries";

export async function fetchDrillTasks(
  filter: TasksForDrillFilter,
): Promise<{ ok: true; tasks: TaskWithArea[] } | { ok: false; error: string }> {
  await requireSession();

  if (
    filter.bucket !== "completed" &&
    filter.bucket !== "open" &&
    filter.bucket !== "overdue"
  ) {
    return { ok: false, error: "Invalid bucket" };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(filter.rangeStart) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(filter.rangeEnd)
  ) {
    return { ok: false, error: "Invalid range" };
  }

  if (
    filter.areaId != null &&
    (!Number.isInteger(filter.areaId) || filter.areaId < 1)
  ) {
    return { ok: false, error: "Invalid area" };
  }

  const tasks = await getTasksForDrill(filter);
  return { ok: true, tasks };
}
