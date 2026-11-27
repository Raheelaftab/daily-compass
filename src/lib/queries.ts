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
  daysBetweenInclusive,
  daysElapsedInWeek,
  formatDisplay,
  formatMonthLabel,
  formatShortDate,
  isMonthKey,
  minutesToHours,
  monthEnd,
  monthStart,
  todayStr,
  weekEnd,
  weeksInMonth,
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
  recurrence: string | null;
  recurrenceParentId: number | null;
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
      recurrence: tasks.recurrence,
      recurrenceParentId: tasks.recurrenceParentId,
      areaName: areas.name,
      areaColor: areas.color,
    })
    .from(tasks)
    .innerJoin(areas, eq(tasks.areaId, areas.id))
    .where(whereClause);

  const mapped: TaskWithArea[] = rows.map((row) => mapTaskRow(row));

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
  recurrence: string | null;
  recurrenceParentId: number | null;
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
    recurrence: row.recurrence,
    recurrenceParentId: row.recurrenceParentId,
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
          recurrence: tasks.recurrence,
          recurrenceParentId: tasks.recurrenceParentId,
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

export type MonthlyReport = {
  monthKey: string;
  start: string;
  end: string;
  today: string;
  displayLabel: string;
  weeks: number;
  hoursByArea: Array<
    WeekAreaHours & {
      percent: number | null;
    }
  >;
  tasksCompleted: number;
  completedTasks: WeeklyReportTask[];
  slippedTasks: WeeklyReportTask[];
  habitChecksDone: number;
  habitPossible: number;
  habitRatePercent: number | null;
  bestDay: {
    date: string;
    label: string;
    minutes: number;
  } | null;
};

/** Monthly rollup: hours vs (weekly target × weeks), completed/slipped, habits, best day. */
export async function getMonthlyReport(
  monthKey: string,
): Promise<MonthlyReport> {
  if (!isMonthKey(monthKey)) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const today = todayStr();
  const start = monthStart(monthKey);
  const end = monthEnd(monthKey);
  const weeks = weeksInMonth(monthKey);
  const habitEnd = today < end ? today : end;
  const habitDays =
    start > habitEnd ? 0 : daysBetweenInclusive(start, habitEnd);

  const [activeAreas, logRows, taskRows, activeHabits, habitCheckRows] =
    await Promise.all([
      getActiveAreas(),
      db
        .select({
          areaId: timeLogs.areaId,
          minutes: timeLogs.minutes,
          logDate: timeLogs.logDate,
        })
        .from(timeLogs)
        .where(and(gte(timeLogs.logDate, start), lte(timeLogs.logDate, end))),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          status: tasks.status,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
          areaName: areas.name,
          areaColor: areas.color,
        })
        .from(tasks)
        .innerJoin(areas, eq(tasks.areaId, areas.id)),
      db
        .select({ id: habits.id })
        .from(habits)
        .where(eq(habits.isActive, true)),
      db
        .select({
          habitId: habitChecks.habitId,
          checkDate: habitChecks.checkDate,
        })
        .from(habitChecks)
        .innerJoin(habits, eq(habitChecks.habitId, habits.id))
        .where(
          and(
            eq(habits.isActive, true),
            eq(habitChecks.done, true),
            gte(habitChecks.checkDate, start),
            lte(habitChecks.checkDate, habitEnd),
          ),
        ),
    ]);

  const loggedByArea = new Map<number, number>();
  const minutesByDate = new Map<string, number>();
  for (const row of logRows) {
    loggedByArea.set(
      row.areaId,
      (loggedByArea.get(row.areaId) ?? 0) + row.minutes,
    );
    minutesByDate.set(
      row.logDate,
      (minutesByDate.get(row.logDate) ?? 0) + row.minutes,
    );
  }

  const hoursByArea = activeAreas.map((area) => {
    const loggedMinutes = loggedByArea.get(area.id) ?? 0;
    const targetMinutes =
      area.weeklyTargetMinutes != null
        ? Math.round(area.weeklyTargetMinutes * weeks)
        : null;
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
        task.dueDate >= start &&
        task.dueDate <= end,
    )
    .map((task) => ({
      id: task.id,
      title: task.title,
      areaName: task.areaName,
      areaColor: task.areaColor,
      dueDate: task.dueDate,
    }));

  const habitPossible = activeHabits.length * habitDays;
  const habitChecksDone = habitCheckRows.length;
  const habitRatePercent =
    habitPossible > 0
      ? Math.round((habitChecksDone / habitPossible) * 100)
      : null;

  let bestDay: MonthlyReport["bestDay"] = null;
  for (const [date, minutes] of minutesByDate) {
    if (!bestDay || minutes > bestDay.minutes) {
      bestDay = {
        date,
        label: formatShortDate(date),
        minutes,
      };
    }
  }

  return {
    monthKey,
    start,
    end,
    today,
    displayLabel: formatMonthLabel(monthKey),
    weeks,
    hoursByArea,
    tasksCompleted: completedTasks.length,
    completedTasks,
    slippedTasks,
    habitChecksDone,
    habitPossible,
    habitRatePercent,
    bestDay,
  };
}

export type DashboardTaskBucket = "completed" | "open" | "overdue";

export type TaskStatusByAreaRow = {
  areaId: number;
  name: string;
  color: string;
  completed: number;
  open: number;
  overdue: number;
};

export type TaskStatusOverview = {
  rangeStart: string;
  rangeEnd: string;
  today: string;
  totals: {
    completed: number;
    open: number;
    overdue: number;
  };
  byArea: TaskStatusByAreaRow[];
};

export type TasksForDrillFilter = {
  bucket: DashboardTaskBucket;
  rangeStart: string;
  rangeEnd: string;
  areaId?: number;
  /**
   * For bucket "open" only: when true (Open card), include overdue opens.
   * Chart "open" segments leave this false so overdue stays in its own stack.
   */
  includeOverdue?: boolean;
};

/**
 * Task status overview for the dashboard range.
 * Completed = done with completedAt in range; open/overdue = current snapshot.
 */
export async function getTaskStatusByArea(range: {
  start: string;
  end: string;
}): Promise<TaskStatusOverview> {
  const today = todayStr();
  const [activeAreas, allTasks] = await Promise.all([
    getActiveAreas(),
    db
      .select({
        id: tasks.id,
        areaId: tasks.areaId,
        status: tasks.status,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
      })
      .from(tasks),
  ]);

  const completedIdsByArea = new Map<number, number>();
  let completedTotal = 0;

  for (const task of allTasks) {
    if (task.status !== "done" || !task.completedAt) continue;
    const d = completedDateStr(task.completedAt);
    if (d < range.start || d > range.end) continue;
    completedTotal += 1;
    completedIdsByArea.set(
      task.areaId,
      (completedIdsByArea.get(task.areaId) ?? 0) + 1,
    );
  }

  const openTasks = allTasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress",
  );
  const overdueTasks = openTasks.filter(
    (task) => task.dueDate != null && task.dueDate < today,
  );
  const openNonOverdue = openTasks.filter(
    (task) => !(task.dueDate != null && task.dueDate < today),
  );

  const openByArea = new Map<number, number>();
  const overdueByArea = new Map<number, number>();
  for (const task of openNonOverdue) {
    openByArea.set(task.areaId, (openByArea.get(task.areaId) ?? 0) + 1);
  }
  for (const task of overdueTasks) {
    overdueByArea.set(task.areaId, (overdueByArea.get(task.areaId) ?? 0) + 1);
  }

  const byArea: TaskStatusByAreaRow[] = activeAreas
    .map((area) => ({
      areaId: area.id,
      name: area.name,
      color: area.color,
      completed: completedIdsByArea.get(area.id) ?? 0,
      open: openByArea.get(area.id) ?? 0,
      overdue: overdueByArea.get(area.id) ?? 0,
    }))
    .filter((row) => row.completed > 0 || row.open > 0 || row.overdue > 0);

  return {
    rangeStart: range.start,
    rangeEnd: range.end,
    today,
    totals: {
      completed: completedTotal,
      open: openTasks.length,
      overdue: overdueTasks.length,
    },
    byArea,
  };
}

/** Tasks matching a dashboard drill-down filter (card or chart segment). */
export async function getTasksForDrill(
  filter: TasksForDrillFilter,
): Promise<TaskWithArea[]> {
  const today = todayStr();
  const conditions = [];

  if (filter.areaId != null) {
    conditions.push(eq(tasks.areaId, filter.areaId));
  }

  if (filter.bucket === "completed") {
    conditions.push(eq(tasks.status, "done"));
  } else if (filter.bucket === "open" || filter.bucket === "overdue") {
    conditions.push(inArray(tasks.status, ["todo", "in_progress"]));
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
      recurrence: tasks.recurrence,
      recurrenceParentId: tasks.recurrenceParentId,
      areaName: areas.name,
      areaColor: areas.color,
    })
    .from(tasks)
    .innerJoin(areas, eq(tasks.areaId, areas.id))
    .where(whereClause)
    .orderBy(desc(tasks.createdAt));

  const mapped: TaskWithArea[] = rows.map((row) => mapTaskRow(row));

  if (filter.bucket === "completed") {
    return mapped.filter((task) => {
      if (!task.completedAt) return false;
      const d = completedDateStr(new Date(task.completedAt));
      return d >= filter.rangeStart && d <= filter.rangeEnd;
    });
  }

  if (filter.bucket === "overdue") {
    return mapped.filter(
      (task) => task.dueDate != null && task.dueDate < today,
    );
  }

  if (filter.includeOverdue) {
    return mapped;
  }

  return mapped.filter(
    (task) => !(task.dueDate != null && task.dueDate < today),
  );
}

export type CompletionTrendPoint = {
  key: string;
  label: string;
  completed: number;
  created: number;
};

/**
 * Completed vs created counts across a range.
 * Daily buckets when span ≤ 45 days; otherwise weekly (Mon start).
 */
export async function getCompletionTrend(range: {
  start: string;
  end: string;
}): Promise<CompletionTrendPoint[]> {
  const span = daysBetweenInclusive(range.start, range.end);
  const weekly = span > 45;

  const rows = await db
    .select({
      status: tasks.status,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
    })
    .from(tasks);

  const bucketKey = (ymd: string) => (weekly ? weekStart(ymd) : ymd);

  const keys: string[] = [];
  if (weekly) {
    let cursor = weekStart(range.start);
    const last = weekStart(range.end);
    while (cursor <= last) {
      keys.push(cursor);
      cursor = addDays(cursor, 7);
    }
  } else {
    let cursor = range.start;
    while (cursor <= range.end) {
      keys.push(cursor);
      cursor = addDays(cursor, 1);
    }
  }

  const completedMap = new Map<string, number>();
  const createdMap = new Map<string, number>();
  for (const key of keys) {
    completedMap.set(key, 0);
    createdMap.set(key, 0);
  }

  for (const row of rows) {
    const createdYmd = completedDateStr(row.createdAt);
    if (createdYmd >= range.start && createdYmd <= range.end) {
      const key = bucketKey(createdYmd);
      if (createdMap.has(key)) {
        createdMap.set(key, (createdMap.get(key) ?? 0) + 1);
      }
    }
    if (row.status === "done" && row.completedAt) {
      const doneYmd = completedDateStr(row.completedAt);
      if (doneYmd >= range.start && doneYmd <= range.end) {
        const key = bucketKey(doneYmd);
        if (completedMap.has(key)) {
          completedMap.set(key, (completedMap.get(key) ?? 0) + 1);
        }
      }
    }
  }

  return keys.map((key) => ({
    key,
    label: weekly ? formatShortDate(key) : formatShortDate(key),
    completed: completedMap.get(key) ?? 0,
    created: createdMap.get(key) ?? 0,
  }));
}

export type DailyMinutesSeries = {
  areaId: number;
  name: string;
  color: string;
  slug: string;
};

export type DailyMinutesPoint = {
  date: string;
  label: string;
  totalHours: number;
  /** Hours per area keyed by area slug for stacked bars. */
  [areaSlug: string]: string | number;
};

export type DailyMinutesChartData = {
  series: DailyMinutesSeries[];
  points: DailyMinutesPoint[];
};

/** Minutes logged per day in range, stacked by area (as hours). */
export async function getDailyMinutes(range: {
  start: string;
  end: string;
}): Promise<DailyMinutesChartData> {
  const activeAreas = await getActiveAreas();
  const series: DailyMinutesSeries[] = activeAreas.map((area) => ({
    areaId: area.id,
    name: area.name,
    color: area.color,
    slug: area.slug,
  }));

  const logRows = await db
    .select({
      logDate: timeLogs.logDate,
      areaId: timeLogs.areaId,
      minutes: timeLogs.minutes,
    })
    .from(timeLogs)
    .where(
      and(gte(timeLogs.logDate, range.start), lte(timeLogs.logDate, range.end)),
    );

  const minutesByDateArea = new Map<string, number>();
  for (const row of logRows) {
    const key = `${row.logDate}:${row.areaId}`;
    minutesByDateArea.set(
      key,
      (minutesByDateArea.get(key) ?? 0) + row.minutes,
    );
  }

  const points: DailyMinutesPoint[] = [];
  let cursor = range.start;
  while (cursor <= range.end) {
    const point: DailyMinutesPoint = {
      date: cursor,
      label: formatShortDate(cursor),
      totalHours: 0,
    };
    let totalMinutes = 0;
    for (const area of series) {
      const mins = minutesByDateArea.get(`${cursor}:${area.areaId}`) ?? 0;
      totalMinutes += mins;
      point[area.slug] = minutesToHours(mins);
    }
    point.totalHours = minutesToHours(totalMinutes);
    points.push(point);
    cursor = addDays(cursor, 1);
  }

  return { series, points };
}

/**
 * Hours by area for an arbitrary date range.
 * Weekly targets are scaled by daysInRange / 7.
 */
export async function getHoursByAreaForRange(range: {
  start: string;
  end: string;
}): Promise<WeekAreaHours[]> {
  const days = daysBetweenInclusive(range.start, range.end);
  const scale = days / 7;

  const [activeAreas, logRows] = await Promise.all([
    getActiveAreas(),
    db
      .select({
        areaId: timeLogs.areaId,
        minutes: timeLogs.minutes,
      })
      .from(timeLogs)
      .where(
        and(
          gte(timeLogs.logDate, range.start),
          lte(timeLogs.logDate, range.end),
        ),
      ),
  ]);

  const loggedByArea = new Map<number, number>();
  for (const row of logRows) {
    loggedByArea.set(
      row.areaId,
      (loggedByArea.get(row.areaId) ?? 0) + row.minutes,
    );
  }

  return activeAreas.map((area) => ({
    areaId: area.id,
    name: area.name,
    color: area.color,
    loggedMinutes: loggedByArea.get(area.id) ?? 0,
    targetMinutes:
      area.weeklyTargetMinutes != null
        ? Math.round(area.weeklyTargetMinutes * scale)
        : null,
  }));
}

export type TimeLogDrillRow = {
  id: number;
  logDate: string;
  minutes: number;
  note: string | null;
  taskTitle: string | null;
  areaId: number;
  areaName: string;
  areaColor: string;
};

/** Time logs for an area within a range (hours-by-area drill-down). */
export async function getTimeLogsForAreaRange(filter: {
  areaId: number;
  rangeStart: string;
  rangeEnd: string;
}): Promise<TimeLogDrillRow[]> {
  const rows = await db
    .select({
      id: timeLogs.id,
      logDate: timeLogs.logDate,
      minutes: timeLogs.minutes,
      note: timeLogs.note,
      areaId: timeLogs.areaId,
      areaName: areas.name,
      areaColor: areas.color,
      taskTitle: tasks.title,
    })
    .from(timeLogs)
    .innerJoin(areas, eq(timeLogs.areaId, areas.id))
    .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
    .where(
      and(
        eq(timeLogs.areaId, filter.areaId),
        gte(timeLogs.logDate, filter.rangeStart),
        lte(timeLogs.logDate, filter.rangeEnd),
      ),
    )
    .orderBy(desc(timeLogs.logDate), desc(timeLogs.createdAt));

  return rows.map((row) => ({
    id: row.id,
    logDate: row.logDate,
    minutes: row.minutes,
    note: row.note,
    taskTitle: row.taskTitle,
    areaId: row.areaId,
    areaName: row.areaName,
    areaColor: row.areaColor,
  }));
}

export type HabitRateSummary = {
  habitChecksDone: number;
  habitPossible: number;
  habitRatePercent: number | null;
  daysElapsed: number;
};

/** Habit completion rate for an arbitrary date range (up to today). */
export async function getHabitRateForRange(range: {
  start: string;
  end: string;
}): Promise<HabitRateSummary> {
  const today = todayStr();
  const effectiveEnd = range.end < today ? range.end : today;
  const daysElapsed =
    range.start > effectiveEnd
      ? 0
      : daysBetweenInclusive(range.start, effectiveEnd);

  const activeHabits = await db
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.isActive, true));

  const habitCount = activeHabits.length;
  const habitPossible = habitCount * daysElapsed;

  if (habitPossible === 0 || range.start > effectiveEnd) {
    return {
      habitChecksDone: 0,
      habitPossible: 0,
      habitRatePercent: null,
      daysElapsed,
    };
  }

  const habitCheckRows = await db
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
        gte(habitChecks.checkDate, range.start),
        lte(habitChecks.checkDate, effectiveEnd),
      ),
    );

  const habitChecksDone = habitCheckRows.length;
  const habitRatePercent = Math.round((habitChecksDone / habitPossible) * 100);

  return {
    habitChecksDone,
    habitPossible,
    habitRatePercent,
    daysElapsed,
  };
}

export type HabitHeatmapDay = {
  date: string;
  label: string;
  done: number;
  possible: number;
  ratePercent: number | null;
};

export type HabitHeatmapData = {
  start: string;
  end: string;
  days: HabitHeatmapDay[];
};

/** Daily habit completion intensity for the last `dayCount` days (incl. today). */
export async function getHabitHeatmap(
  dayCount = 30,
): Promise<HabitHeatmapData> {
  const end = todayStr();
  const start = addDays(end, -(dayCount - 1));

  const activeHabits = await db
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.isActive, true));

  const possible = activeHabits.length;

  const doneByDate = new Map<string, number>();
  if (possible > 0) {
    const habitIds = activeHabits.map((habit) => habit.id);
    const checks = await db
      .select({
        checkDate: habitChecks.checkDate,
      })
      .from(habitChecks)
      .where(
        and(
          inArray(habitChecks.habitId, habitIds),
          eq(habitChecks.done, true),
          gte(habitChecks.checkDate, start),
          lte(habitChecks.checkDate, end),
        ),
      );

    for (const check of checks) {
      doneByDate.set(
        check.checkDate,
        (doneByDate.get(check.checkDate) ?? 0) + 1,
      );
    }
  }

  const days: HabitHeatmapDay[] = [];
  let cursor = start;
  while (cursor <= end) {
    const done = doneByDate.get(cursor) ?? 0;
    days.push({
      date: cursor,
      label: formatShortDate(cursor),
      done,
      possible,
      ratePercent:
        possible > 0 ? Math.round((done / possible) * 100) : null,
    });
    cursor = addDays(cursor, 1);
  }

  return { start, end, days };
}

