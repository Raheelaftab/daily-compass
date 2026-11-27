import { z } from "zod";

import { isValidRecurrenceString, serializeRecurrence, parseRecurrence } from "@/lib/recurrence";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const taskPrioritySchema = z.enum(["high", "medium", "low"]);
export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);

const optionalDate = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")])
  .optional()
  .transform((value) => (value === "" || value == null ? undefined : value));

const optionalNotes = z
  .union([z.literal(""), z.string().trim().max(5000)])
  .optional()
  .transform((value) => (value === "" || value == null ? undefined : value));

/** null / "" / "none" clear recurrence; otherwise stored recurrence string. */
export const recurrenceFieldSchema = z
  .union([z.null(), z.string()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value == null || value === "" || value === "none") return null;
    if (!isValidRecurrenceString(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid recurrence",
      });
      return z.NEVER;
    }
    return serializeRecurrence(parseRecurrence(value));
  });

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  areaId: z.coerce.number().int().positive(),
  priority: taskPrioritySchema.default("medium"),
  dueDate: optionalDate,
  notes: optionalNotes,
  recurrence: recurrenceFieldSchema,
});

export const updateTaskSchema = createTaskSchema.extend({
  id: z.coerce.number().int().positive(),
});

export const setTaskStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: taskStatusSchema,
});

export const taskIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

const optionalTaskId = z
  .union([z.literal(""), z.coerce.number().int().positive()])
  .optional()
  .transform((value) =>
    value === "" || value == null ? undefined : value,
  );

const optionalLogNote = z
  .union([z.literal(""), z.string().trim().max(300)])
  .optional()
  .transform((value) => (value === "" || value == null ? undefined : value));

export const logTimeSchema = z.object({
  areaId: z.coerce.number().int().positive(),
  minutes: z.coerce.number().int().min(1).max(720),
  note: optionalLogNote,
  taskId: optionalTaskId,
  logDate: optionalDate,
});

export const deleteTimeLogSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type LogTimeInput = z.infer<typeof logTimeSchema>;

export const createHabitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export const updateHabitSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const toggleHabitSchema = z.object({
  habitId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;

export const saveWeeklyReviewSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid week"),
  wins: z.string().max(10000).optional().default(""),
  slipped: z.string().max(10000).optional().default(""),
  nextTop3: z.string().max(10000).optional().default(""),
});

export const updateAreaSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "Name is required").max(60),
  color: z.enum([
    "purple",
    "blue",
    "teal",
    "orange",
    "red",
    "green",
    "yellow",
    "gray",
  ]),
  /** Hours as decimal string/number; empty string → log-only (null minutes). */
  weeklyTargetHours: z.union([
    z.literal(""),
    z.coerce.number().min(0).max(168),
  ]),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export const updateTelegramDigestsSchema = z
  .object({
    morningDigest: z.boolean().optional(),
    eveningNudge: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.morningDigest !== undefined || data.eveningNudge !== undefined,
    { message: "Provide at least one toggle" },
  );

export type SaveWeeklyReviewInput = z.infer<typeof saveWeeklyReviewSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type UpdateTelegramDigestsInput = z.infer<
  typeof updateTelegramDigestsSchema
>;

