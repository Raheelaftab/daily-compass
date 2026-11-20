import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const statusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);

export const areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  color: varchar("color", { length: 20 }).notNull(),
  weeklyTargetMinutes: integer("weekly_target_minutes"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    areaId: integer("area_id")
      .notNull()
      .references(() => areas.id),
    title: varchar("title", { length: 200 }).notNull(),
    notes: text("notes"),
    priority: priorityEnum("priority").notNull().default("medium"),
    status: statusEnum("status").notNull().default("todo"),
    dueDate: date("due_date"),
    top3For: date("top3_for"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tasks_status_due_idx").on(t.status, t.dueDate),
    index("tasks_top3_idx").on(t.top3For),
  ],
);

export const timeLogs = pgTable(
  "time_logs",
  {
    id: serial("id").primaryKey(),
    areaId: integer("area_id")
      .notNull()
      .references(() => areas.id),
    taskId: integer("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    logDate: date("log_date").notNull(),
    minutes: integer("minutes").notNull(),
    note: varchar("note", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("time_logs_date_idx").on(t.logDate)],
);

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  areaId: integer("area_id").references(() => areas.id),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const habitChecks = pgTable(
  "habit_checks",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    checkDate: date("check_date").notNull(),
    done: boolean("done").notNull().default(true),
  },
  (t) => [
    uniqueIndex("habit_checks_unique").on(t.habitId, t.checkDate),
    index("habit_checks_date_idx").on(t.checkDate),
  ],
);

export const weeklyReviews = pgTable("weekly_reviews", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull().unique(),
  wins: text("wins"),
  slipped: text("slipped"),
  nextTop3: text("next_top3"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
