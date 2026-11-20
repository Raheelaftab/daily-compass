import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { areas, habitChecks, habits, tasks, timeLogs } from "@/db/schema";
import { addDays, formatDisplay, todayStr, weekStart } from "@/lib/dates";
import { bestStreak, currentStreak } from "@/lib/streaks";

export type TaskStatusFilter = "open" | "done" | "all";

export type TaskFilters = {
  areaId?: number;
  status?: TaskStatusFilter;
};

export type AreaRow = {
  id: number;
  name: string;
  slug: string;
  color: string;
  weeklyTargetMinutes: number | null;
  sortOrder: number;
  isActive: boolean;
};

export type TaskWithArea = {
  id: number;
  areaId: number;
  title: string;
  notes: string | null;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  dueDate: string | null;
  top3For: string | null;
  completedAt: string | null;
  createdAt: string;
  areaName: string;
  areaColor: string;
};

const PRIORITY_RANK: Record<TaskWithArea["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export async function getActiveAreas(): Promise<AreaRow[]> {
  return db
    .select({
      id: areas.id,
      name: areas.name,
      slug: areas.slug,
      color: areas.color,
      weeklyTargetMinutes: areas.weeklyTargetMinutes,
      sortOrder: areas.sortOrder,
      isActive: areas.isActive,
    })
    .from(areas)
    .where(eq(areas.isActive, true))
    .orderBy(asc(areas.sortOrder));
}

export async function getTasks(
  filters: TaskFilters = {},
): Promise<TaskWithArea[]> {
  const statusFilter = filters.status ?? "open";
  const today = todayStr();

  const conditions = [];

  if (filters.areaId != null) {
    conditions.push(eq(tasks.areaId, filters.areaId));
  }

  if (statusFilter === "open") {
    conditions.push(inArray(tasks.status, ["todo", "in_progress"]));
  } else if (statusFilter === "done") {
    conditions.push(eq(tasks.status, "done"));
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const rows = await db
    .select({
      id: tasks.id,
      areaId: tasks.areaId,
      title: tasks.title,
      notes: tasks.notes,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      top3For: tasks.top3For,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      areaName: areas.name,
      areaColor: areas.color,
    })
    .from(tasks)
    .innerJoin(areas, eq(tasks.areaId, areas.id))
    .where(whereClause);

  const mapped: TaskWithArea[] = rows.map((row) => ({
    id: row.id,
    areaId: row.areaId,
    title: row.title,
    notes: row.notes,
    priority: row.priority,
    status: row.status,
    dueDate: row.dueDate,
    top3For: row.top3For,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    areaName: row.areaName,
    areaColor: row.areaColor,
  }));

  mapped.sort((a, b) => {
    const aOverdue =
      a.dueDate != null && a.dueDate < today && a.status !== "done" ? 0 : 1;
    const bOverdue =
      b.dueDate != null && b.dueDate < today && b.status !== "done" ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.dueDate && b.dueDate) {
      const dueDiff = a.dueDate.localeCompare(b.dueDate);
      if (dueDiff !== 0) return dueDiff;
    } else if (a.dueDate) {
      return -1;
    } else if (b.dueDate) {
      return 1;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });

  return mapped;
}

export async function countTop3ForToday(): Promise<number> {
  const today = todayStr();
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.top3For, today));
  return rows.length;
}

export type TimeLogWithMeta = {
  id: number;
  areaId: number;
  taskId: number | null;
  logDate: string;
  minutes: number;
  note: string | null;
  createdAt: string;
  areaName: string;
  areaColor: string;
  taskTitle: string | null;
};

export type HabitTodayRow = {
  id: number;
  name: string;
  done: boolean;
};

export type TodayData = {
  today: string;
  displayDate: string;
  totalMinutes: number;
  top3: TaskWithArea[];
  logs: TimeLogWithMeta[];
  areas: AreaRow[];
  openTasks: TaskWithArea[];
  habitsToday: HabitTodayRow[];
};

export type HabitGridDay = {
  date: string;
  label: string;
};

export type HabitGridRow = {
  id: number;
  name: string;
  sortOrder: number;
  currentStreak: number;
  bestStreak: number;
  /** date -> done */
  checks: Record<string, boolean>;
};

export type HabitGridData = {
  weekStart: string;
  today: string;
  days: HabitGridDay[];
  habits: HabitGridRow[];
};

function mapTaskRow(row: {
  id: number;
  areaId: number;
  title: string;
  notes: string | null;
  priority: TaskWithArea["priority"];
  status: TaskWithArea["status"];
  dueDate: string | null;
  top3For: string | null;
  completedAt: Date | null;
  createdAt: Date;
  areaName: string;
  areaColor: string;
}): TaskWithArea {
  return {
    id: row.id,
    areaId: row.areaId,
    title: row.title,
    notes: row.notes,
    priority: row.priority,
    status: row.status,
    dueDate: row.dueDate,
    top3For: row.top3For,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    areaName: row.areaName,
    areaColor: row.areaColor,
  };
}

function sortOpenTasks(list: TaskWithArea[], today: string): TaskWithArea[] {
  return [...list].sort((a, b) => {
    const aOverdue =
      a.dueDate != null && a.dueDate < today && a.status !== "done" ? 0 : 1;
    const bOverdue =
      b.dueDate != null && b.dueDate < today && b.status !== "done" ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;

    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.dueDate && b.dueDate) {
      const dueDiff = a.dueDate.localeCompare(b.dueDate);
      if (dueDiff !== 0) return dueDiff;
    } else if (a.dueDate) {
      return -1;
    } else if (b.dueDate) {
      return 1;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

export async function getTodayData(): Promise<TodayData> {
  const today = todayStr();

  const [areasList, top3Rows, openTaskRows, logRows, activeHabits, todayChecks] =
    await Promise.all([
      getActiveAreas(),
      db
        .select({
          id: tasks.id,
          areaId: tasks.areaId,
          title: tasks.title,
          notes: tasks.notes,
          priority: tasks.priority,
          status: tasks.status,
          dueDate: tasks.dueDate,
          top3For: tasks.top3For,
          completedAt: tasks.completedAt,
          createdAt: tasks.createdAt,
          areaName: areas.name,
          areaColor: areas.color,
        })
        .from(tasks)
        .innerJoin(areas, eq(tasks.areaId, areas.id))
        .where(eq(tasks.top3For, today)),
      getTasks({ status: "open" }),
      db
        .select({
          id: timeLogs.id,
          areaId: timeLogs.areaId,
          taskId: timeLogs.taskId,
          logDate: timeLogs.logDate,
          minutes: timeLogs.minutes,
          note: timeLogs.note,
          createdAt: timeLogs.createdAt,
          areaName: areas.name,
          areaColor: areas.color,
          taskTitle: tasks.title,
        })
        .from(timeLogs)
        .innerJoin(areas, eq(timeLogs.areaId, areas.id))
        .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
        .where(eq(timeLogs.logDate, today))
        .orderBy(desc(timeLogs.createdAt)),
      db
        .select({
          id: habits.id,
          name: habits.name,
        })
        .from(habits)
        .where(eq(habits.isActive, true))
        .orderBy(asc(habits.sortOrder)),
      db
        .select({
          habitId: habitChecks.habitId,
          done: habitChecks.done,
        })
        .from(habitChecks)
        .where(eq(habitChecks.checkDate, today)),
    ]);

  const top3 = sortOpenTasks(top3Rows.map(mapTaskRow), today);

  const logs: TimeLogWithMeta[] = logRows.map((row) => ({
    id: row.id,
    areaId: row.areaId,
    taskId: row.taskId,
    logDate: row.logDate,
    minutes: row.minutes,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    areaName: row.areaName,
    areaColor: row.areaColor,
    taskTitle: row.taskTitle,
  }));

  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);

  const checkByHabit = new Map(
    todayChecks.map((row) => [row.habitId, row.done] as const),
  );

  const habitsToday: HabitTodayRow[] = activeHabits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    done: checkByHabit.get(habit.id) === true,
  }));

  return {
    today,
    displayDate: formatDisplay(today),
    totalMinutes,
    top3,
    logs,
    areas: areasList,
    openTasks: openTaskRows,
    habitsToday,
  };
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export async function getHabitGrid(
  weekStartDate?: string,
): Promise<HabitGridData> {
  const today = todayStr();
  const start = weekStartDate ?? weekStart(today);
  const days: HabitGridDay[] = WEEKDAY_LABELS.map((label, index) => ({
    label,
    date: addDays(start, index),
  }));

  const activeHabits = await db
    .select({
      id: habits.id,
      name: habits.name,
      sortOrder: habits.sortOrder,
    })
    .from(habits)
    .where(eq(habits.isActive, true))
    .orderBy(asc(habits.sortOrder));

  if (activeHabits.length === 0) {
    return { weekStart: start, today, days, habits: [] };
  }

  const habitIds = activeHabits.map((habit) => habit.id);

  const allChecks = await db
    .select({
      habitId: habitChecks.habitId,
      checkDate: habitChecks.checkDate,
      done: habitChecks.done,
    })
    .from(habitChecks)
    .where(
      and(inArray(habitChecks.habitId, habitIds), eq(habitChecks.done, true)),
    );

  const doneByHabit = new Map<number, Set<string>>();
  for (const habit of activeHabits) {
    doneByHabit.set(habit.id, new Set());
  }
  for (const check of allChecks) {
    doneByHabit.get(check.habitId)?.add(check.checkDate);
  }

  const habitRows: HabitGridRow[] = activeHabits.map((habit) => {
    const doneDates = doneByHabit.get(habit.id) ?? new Set<string>();
    const checks: Record<string, boolean> = {};
    for (const day of days) {
      checks[day.date] = doneDates.has(day.date);
    }

    return {
      id: habit.id,
      name: habit.name,
      sortOrder: habit.sortOrder,
      currentStreak: currentStreak(doneDates, today),
      bestStreak: bestStreak(doneDates),
      checks,
    };
  });

  return {
    weekStart: start,
    today,
    days,
    habits: habitRows,
  };
}
