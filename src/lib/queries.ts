import { TZDate } from "@date-fns/tz";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { format } from "date-fns";

import { db } from "@/db";
import {
  areas,
  habitChecks,
  habits,
  tasks,
  timeLogs,
  weeklyReviews,
} from "@/db/schema";
import {
  APP_TIMEZONE,
  addDays,
  daysElapsedInWeek,
  formatDisplay,
  todayStr,
  weekEnd,
  weekStart,
} from "@/lib/dates";
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

export async function getAllAreas(): Promise<AreaRow[]> {
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
    .orderBy(asc(areas.sortOrder), asc(areas.id));
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

export type WeekAreaHours = {
  areaId: number;
  name: string;
  color: string;
  loggedMinutes: number;
  targetMinutes: number | null;
};

export type WeekStats = {
  weekStart: string;
  weekEnd: string;
  today: string;
  displayRange: string;
  hoursByArea: WeekAreaHours[];
  totalLoggedMinutes: number;
  totalTargetMinutes: number;
  targetPercent: number | null;
  tasksCompleted: number;
  tasksOpen: number;
  tasksOverdue: number;
  openByArea: Array<{
    areaId: number;
    name: string;
    color: string;
    count: number;
  }>;
  habitChecksDone: number;
  habitPossible: number;
  habitRatePercent: number | null;
  daysElapsed: number;
};

export type WeeklyTrendPoint = {
  weekStart: string;
  label: string;
  hours: number;
};

function completedDateStr(completedAt: Date): string {
  return format(new TZDate(completedAt, APP_TIMEZONE), "yyyy-MM-dd");
}

export async function getWeekStats(weekStartDate: string): Promise<WeekStats> {
  const today = todayStr();
  const start = weekStart(weekStartDate);
  const end = weekEnd(start);
  const daysElapsed = daysElapsedInWeek(start, today);

  const [activeAreas, logRows, allTasks, activeHabits, habitCheckRows] =
    await Promise.all([
      getActiveAreas(),
      db
        .select({
          areaId: timeLogs.areaId,
          minutes: timeLogs.minutes,
        })
        .from(timeLogs)
        .where(
          and(gte(timeLogs.logDate, start), lte(timeLogs.logDate, end)),
        ),
      db
        .select({
          id: tasks.id,
          areaId: tasks.areaId,
          status: tasks.status,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
        })
        .from(tasks),
      db
        .select({ id: habits.id })
        .from(habits)
        .where(eq(habits.isActive, true)),
      db
        .select({
          id: habitChecks.id,
          habitId: habitChecks.habitId,
          checkDate: habitChecks.checkDate,
          done: habitChecks.done,
        })
        .from(habitChecks)
        .innerJoin(habits, eq(habitChecks.habitId, habits.id))
        .where(
          and(
            eq(habits.isActive, true),
            eq(habitChecks.done, true),
            gte(habitChecks.checkDate, start),
            lte(habitChecks.checkDate, end),
          ),
        ),
    ]);

  const habitCutoff = today < end ? today : end;

  const loggedByArea = new Map<number, number>();
  for (const row of logRows) {
    loggedByArea.set(
      row.areaId,
      (loggedByArea.get(row.areaId) ?? 0) + row.minutes,
    );
  }

  const hoursByArea: WeekAreaHours[] = activeAreas.map((area) => ({
    areaId: area.id,
    name: area.name,
    color: area.color,
    loggedMinutes: loggedByArea.get(area.id) ?? 0,
    targetMinutes: area.weeklyTargetMinutes,
  }));

  const totalLoggedMinutes = hoursByArea.reduce(
    (sum, row) => sum + row.loggedMinutes,
    0,
  );
  const totalTargetMinutes = hoursByArea.reduce(
    (sum, row) => sum + (row.targetMinutes ?? 0),
    0,
  );
  const targetPercent =
    totalTargetMinutes > 0
      ? Math.round((totalLoggedMinutes / totalTargetMinutes) * 100)
      : null;

  const tasksCompleted = allTasks.filter((task) => {
    if (task.status !== "done" || !task.completedAt) return false;
    const d = completedDateStr(task.completedAt);
    return d >= start && d <= end;
  }).length;

  const openTasks = allTasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress",
  );
  const tasksOpen = openTasks.length;
  const tasksOverdue = openTasks.filter(
    (task) => task.dueDate != null && task.dueDate < today,
  ).length;

  const openCountByArea = new Map<number, number>();
  for (const task of openTasks) {
    openCountByArea.set(
      task.areaId,
      (openCountByArea.get(task.areaId) ?? 0) + 1,
    );
  }

  const openByArea = activeAreas
    .map((area) => ({
      areaId: area.id,
      name: area.name,
      color: area.color,
      count: openCountByArea.get(area.id) ?? 0,
    }))
    .filter((row) => row.count > 0);

  const habitChecksDone = habitCheckRows.filter(
    (row) => row.checkDate <= habitCutoff,
  ).length;
  const habitPossible = activeHabits.length * daysElapsed;
  const habitRatePercent =
    habitPossible > 0
      ? Math.round((habitChecksDone / habitPossible) * 100)
      : null;

  return {
    weekStart: start,
    weekEnd: end,
    today,
    displayRange: `${formatDisplay(start)} – ${formatDisplay(end)}`,
    hoursByArea,
    totalLoggedMinutes,
    totalTargetMinutes,
    targetPercent,
    tasksCompleted,
    tasksOpen,
    tasksOverdue,
    openByArea,
    habitChecksDone,
    habitPossible,
    habitRatePercent,
    daysElapsed,
  };
}

export async function getWeeklyTrend(
  weeks = 8,
): Promise<WeeklyTrendPoint[]> {
  const today = todayStr();
  const currentStart = weekStart(today);
  const oldestStart = addDays(currentStart, -7 * (weeks - 1));
  const newestEnd = weekEnd(currentStart);

  const logRows = await db
    .select({
      logDate: timeLogs.logDate,
      minutes: timeLogs.minutes,
    })
    .from(timeLogs)
    .where(
      and(
        gte(timeLogs.logDate, oldestStart),
        lte(timeLogs.logDate, newestEnd),
      ),
    );

  const points: WeeklyTrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = addDays(currentStart, -7 * i);
    const end = weekEnd(start);
    const minutes = logRows
      .filter((row) => row.logDate >= start && row.logDate <= end)
      .reduce((sum, row) => sum + row.minutes, 0);

    points.push({
      weekStart: start,
      label: format(TZDate.tz(APP_TIMEZONE, start), "MMM d"),
      hours: Math.round((minutes / 60) * 10) / 10,
    });
  }

  return points;
}

export type WeeklyReportTask = {
  id: number;
  title: string;
  areaName: string;
  areaColor: string;
  dueDate: string | null;
};

export type WeeklyReportHabitRate = {
  id: number;
  name: string;
  done: number;
  possible: number;
  percent: number | null;
};

export type WeeklyReviewData = {
  wins: string;
  slipped: string;
  nextTop3: string;
};

export type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  today: string;
  displayRange: string;
  hoursByArea: Array<
    WeekAreaHours & {
      percent: number | null;
    }
  >;
  completedTasks: WeeklyReportTask[];
  slippedTasks: WeeklyReportTask[];
  top3Marked: number;
  top3Completed: number;
  top3HitRate: number | null;
  habitRates: WeeklyReportHabitRate[];
  review: WeeklyReviewData;
};

export async function getWeeklyReport(
  weekStartDate: string,
): Promise<WeeklyReport> {
  const today = todayStr();
  const start = weekStart(weekStartDate);
  const end = weekEnd(start);
  const daysElapsed = daysElapsedInWeek(start, today);
  const habitCutoff = today < end ? today : end;

  const [
    activeAreas,
    logRows,
    taskRows,
    activeHabits,
    habitCheckRows,
    reviewRows,
  ] = await Promise.all([
    getActiveAreas(),
    db
      .select({
        areaId: timeLogs.areaId,
        minutes: timeLogs.minutes,
      })
      .from(timeLogs)
      .where(and(gte(timeLogs.logDate, start), lte(timeLogs.logDate, end))),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        areaId: tasks.areaId,
        status: tasks.status,
        dueDate: tasks.dueDate,
        top3For: tasks.top3For,
        completedAt: tasks.completedAt,
        areaName: areas.name,
        areaColor: areas.color,
      })
      .from(tasks)
      .innerJoin(areas, eq(tasks.areaId, areas.id)),
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
        checkDate: habitChecks.checkDate,
        done: habitChecks.done,
      })
      .from(habitChecks)
      .innerJoin(habits, eq(habitChecks.habitId, habits.id))
      .where(
        and(
          eq(habits.isActive, true),
          eq(habitChecks.done, true),
          gte(habitChecks.checkDate, start),
          lte(habitChecks.checkDate, end),
        ),
      ),
    db
      .select({
        wins: weeklyReviews.wins,
        slipped: weeklyReviews.slipped,
        nextTop3: weeklyReviews.nextTop3,
      })
      .from(weeklyReviews)
      .where(eq(weeklyReviews.weekStart, start))
      .limit(1),
  ]);

  const loggedByArea = new Map<number, number>();
  for (const row of logRows) {
    loggedByArea.set(
      row.areaId,
      (loggedByArea.get(row.areaId) ?? 0) + row.minutes,
    );
  }

  const hoursByArea = activeAreas.map((area) => {
    const loggedMinutes = loggedByArea.get(area.id) ?? 0;
    const targetMinutes = area.weeklyTargetMinutes;
    const percent =
      targetMinutes != null && targetMinutes > 0
        ? Math.round((loggedMinutes / targetMinutes) * 100)
        : null;
    return {
      areaId: area.id,
      name: area.name,
      color: area.color,
      loggedMinutes,
      targetMinutes,
      percent,
    };
  });

  const completedTasks: WeeklyReportTask[] = taskRows
    .filter((task) => {
      if (task.status !== "done" || !task.completedAt) return false;
      const d = completedDateStr(task.completedAt);
      return d >= start && d <= end;
    })
    .map((task) => ({
      id: task.id,
      title: task.title,
      areaName: task.areaName,
      areaColor: task.areaColor,
      dueDate: task.dueDate,
    }));

  const slippedTasks: WeeklyReportTask[] = taskRows
    .filter(
      (task) =>
        task.status !== "done" &&
        task.dueDate != null &&
        task.dueDate <= end,
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      areaName: task.areaName,
      areaColor: task.areaColor,
      dueDate: task.dueDate,
    }));

  const top3InWeek = taskRows.filter(
    (task) =>
      task.top3For != null && task.top3For >= start && task.top3For <= end,
  );
  const top3Marked = top3InWeek.length;
  const top3Completed = top3InWeek.filter(
    (task) => task.status === "done",
  ).length;
  const top3HitRate =
    top3Marked > 0 ? Math.round((top3Completed / top3Marked) * 100) : null;

  const doneByHabit = new Map<number, number>();
  for (const check of habitCheckRows) {
    if (check.checkDate > habitCutoff) continue;
    doneByHabit.set(
      check.habitId,
      (doneByHabit.get(check.habitId) ?? 0) + 1,
    );
  }

  const habitRates: WeeklyReportHabitRate[] = activeHabits.map((habit) => {
    const done = doneByHabit.get(habit.id) ?? 0;
    const possible = daysElapsed;
    return {
      id: habit.id,
      name: habit.name,
      done,
      possible,
      percent:
        possible > 0 ? Math.round((done / possible) * 100) : null,
    };
  });

  const reviewRow = reviewRows[0];
  const review: WeeklyReviewData = {
    wins: reviewRow?.wins ?? "",
    slipped: reviewRow?.slipped ?? "",
    nextTop3: reviewRow?.nextTop3 ?? "",
  };

  return {
    weekStart: start,
    weekEnd: end,
    today,
    displayRange: `${formatDisplay(start)} – ${formatDisplay(end)}`,
    hoursByArea,
    completedTasks,
    slippedTasks,
    top3Marked,
    top3Completed,
    top3HitRate,
    habitRates,
    review,
  };
}

