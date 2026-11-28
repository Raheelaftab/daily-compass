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
    /** null | "daily" | "weekdays" | "weekly:MON,WED" | "monthly:15" */
    recurrence: text("recurrence"),
    recurrenceParentId: integer("recurrence_parent_id"),
  },
  (t) => [
    index("tasks_status_due_idx").on(t.status, t.dueDate),
    index("tasks_top3_idx").on(t.top3For),
    index("tasks_recurrence_parent_idx").on(t.recurrenceParentId),
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

/** At most one running timer row (enforced in application logic). */
export const timers = pgTable("timers", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, {
    onDelete: "set null",
  }),
  areaId: integer("area_id")
    .notNull()
    .references(() => areas.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  note: varchar("note", { length: 300 }),
});

/** Single-owner Telegram preferences (chat id set via /start pairing). */
export const telegramSettings = pgTable("telegram_settings", {
  id: serial("id").primaryKey(),
  chatId: varchar("chat_id", { length: 50 }),
  morningDigest: boolean("morning_digest").notNull().default(true),
  eveningNudge: boolean("evening_nudge").notNull().default(true),
});

export const prayerNameEnum = pgEnum("prayer_name", [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
]);

export const prayerStatusEnum = pgEnum("prayer_status", [
  "pending",
  "prayed",
  "missed",
]);

/** Single-owner prayer reminder preferences (location + AlAdhan params). */
export const prayerSettings = pgTable("prayer_settings", {
  id: serial("id").primaryKey(),
  city: varchar("city", { length: 100 }).notNull().default("Timonium"),
  state: varchar("state", { length: 50 }).notNull().default("MD"),
  country: varchar("country", { length: 50 }).notNull().default("US"),
  /** Optional lat/long override; when both set, timings-by-coords is used. */
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  /** AlAdhan calculation method (2 = ISNA). */
  method: integer("method").notNull().default(2),
  /** AlAdhan Asr school: 0 = Shafi/Standard, 1 = Hanafi. */
  school: integer("school").notNull().default(0),
  snoozeOptionAMinutes: integer("snooze_option_a_minutes").notNull().default(10),
  snoozeOptionBMinutes: integer("snooze_option_b_minutes").notNull().default(20),
  reRemindIntervalMinutes: integer("re_remind_interval_minutes")
    .notNull()
    .default(15),
  fajrEnabled: boolean("fajr_enabled").notNull().default(true),
  dhuhrEnabled: boolean("dhuhr_enabled").notNull().default(true),
  asrEnabled: boolean("asr_enabled").notNull().default(true),
  maghribEnabled: boolean("maghrib_enabled").notNull().default(true),
  ishaEnabled: boolean("isha_enabled").notNull().default(true),
});

/** Cached daily prayer times (America/New_York calendar date, HH:mm wall clock). */
export const prayerTimes = pgTable("prayer_times", {
  id: serial("id").primaryKey(),
  prayerDate: date("prayer_date").notNull().unique(),
  fajr: varchar("fajr", { length: 5 }).notNull(),
  dhuhr: varchar("dhuhr", { length: 5 }).notNull(),
  asr: varchar("asr", { length: 5 }).notNull(),
  maghrib: varchar("maghrib", { length: 5 }).notNull(),
  isha: varchar("isha", { length: 5 }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const prayerLog = pgTable(
  "prayer_log",
  {
    id: serial("id").primaryKey(),
    prayerDate: date("prayer_date").notNull(),
    prayer: prayerNameEnum("prayer").notNull(),
    status: prayerStatusEnum("status").notNull().default("pending"),
    firstRemindedAt: timestamp("first_reminded_at", { withTimezone: true }),
    lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
    /** America/New_York minute key `YYYY-MM-DDTHH:mm` — prevents duplicate sends. */
    lastReminderMinuteKey: varchar("last_reminder_minute_key", { length: 20 }),
    snoozeUntil: timestamp("snooze_until", { withTimezone: true }),
    prayedAt: timestamp("prayed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("prayer_log_date_prayer_unique").on(t.prayerDate, t.prayer),
    index("prayer_log_date_idx").on(t.prayerDate),
  ],
);
