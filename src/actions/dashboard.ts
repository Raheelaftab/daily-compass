"use server";

import { requireSession } from "@/lib/auth";
import {
  getTasksForDrill,
  getTimeLogsForAreaRange,
  type TaskWithArea,
  type TasksForDrillFilter,
  type TimeLogDrillRow,
} from "@/lib/queries";

function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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

  if (!isYmd(filter.rangeStart) || !isYmd(filter.rangeEnd)) {
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

export async function fetchDrillTimeLogs(filter: {
  areaId: number;
  rangeStart: string;
  rangeEnd: string;
}): Promise<
  { ok: true; logs: TimeLogDrillRow[] } | { ok: false; error: string }
> {
  await requireSession();

  if (!Number.isInteger(filter.areaId) || filter.areaId < 1) {
    return { ok: false, error: "Invalid area" };
  }
  if (!isYmd(filter.rangeStart) || !isYmd(filter.rangeEnd)) {
    return { ok: false, error: "Invalid range" };
  }

  const logs = await getTimeLogsForAreaRange(filter);
  return { ok: true, logs };
}
