import { z } from "zod";

import { AREA_COLOR_OPTIONS } from "@/lib/areas";
import {
  isValidRecurrenceString,
  parseRecurrence,
  serializeRecurrence,
} from "@/lib/recurrence";
import { taskPrioritySchema, taskStatusSchema } from "@/lib/validators";

/** null / "" / "none" clear; otherwise daily | weekdays | weekly:… | monthly:… */
const recurrenceMcpSchema = z
  .union([z.null(), z.literal(""), z.literal("none"), z.string()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value == null || value === "" || value === "none") return null;
    if (!isValidRecurrenceString(value)) {
      ctx.addIssue({ code: "custom", message: "Invalid recurrence" });
      return z.NEVER;
    }
    return serializeRecurrence(parseRecurrence(value));
  });

const areaColorSchema = z.enum(AREA_COLOR_OPTIONS);

export const ymdDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const optionalYmd = z
  .union([z.literal(""), ymdDateSchema])
  .optional()
  .transform((value) => (value === "" || value == null ? undefined : value));

const optionalNotes = z
  .union([z.literal(""), z.string().trim().max(5000)])
  .optional()
  .transform((value) => (value === "" || value == null ? undefined : value));

const optionalLogNote = z
  .union([z.literal(""), z.string().trim().max(300)])
  .optional()
  .transform((value) => (value === "" || value == null ? undefined : value));

export const listAreasSchema = z.object({});

export const listTasksSchema = z.object({
  areaSlug: z.string().trim().min(1).optional(),
  status: z.enum(["open", "done", "all"]).default("open"),
  /** Include tasks with dueDate strictly before this YYYY-MM-DD. */
  dueBefore: optionalYmd,
});

export const createTaskMcpSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  areaSlug: z.string().trim().min(1, "Area slug is required"),
  priority: taskPrioritySchema.default("medium"),
  dueDate: optionalYmd,
  notes: optionalNotes,
  recurrence: recurrenceMcpSchema,
});

export const updateTaskMcpSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    title: z.string().trim().min(1).max(200).optional(),
    priority: taskPrioritySchema.optional(),
    /** Pass null to clear the due date. */
    dueDate: z
      .union([z.null(), z.literal(""), ymdDateSchema])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === "" || value === null) return null;
        return value;
      }),
    status: taskStatusSchema.optional(),
    notes: optionalNotes,
    /** Pass null to clear recurrence. Affects this task only. */
    recurrence: recurrenceMcpSchema,
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.priority !== undefined ||
      data.dueDate !== undefined ||
      data.status !== undefined ||
      data.notes !== undefined ||
      data.recurrence !== undefined,
    { message: "Provide at least one field to update" },
  );

export const setTop3Schema = z.object({
  taskId: z.coerce.number().int().positive(),
  /** Defaults to today (America/New_York) when omitted. */
  date: optionalYmd,
});

export const logTimeMcpSchema = z.object({
  areaSlug: z.string().trim().min(1, "Area slug is required"),
  minutes: z.coerce.number().int().min(1).max(720),
  note: optionalLogNote,
  /** Defaults to today (America/New_York) when omitted. */
  date: optionalYmd,
  taskId: z.coerce.number().int().positive().optional(),
});

export const getWeekSummarySchema = z.object({
  /** Any YYYY-MM-DD in the week, or the Monday; defaults to the current week. */
  weekStart: optionalYmd,
});

export const startTimerMcpSchema = z
  .object({
    /** Area slug from list_areas. Required unless taskId is provided. */
    areaSlug: z.string().trim().min(1).optional(),
    taskId: z.coerce.number().int().positive().optional(),
    note: optionalLogNote,
  })
  .refine((data) => data.areaSlug != null || data.taskId != null, {
    message: "Provide areaSlug or taskId",
  });

export const stopTimerMcpSchema = z.object({
  /**
   * Optional minutes override (e.g. after a long run).
   * When omitted, minutes are computed from startedAt (nearest minute, min 1).
   */
  minutes: z.coerce.number().int().min(1).max(720).optional(),
});

export const updateAreaMcpSchema = z
  .object({
    slug: z.string().trim().min(1, "Area slug is required"),
    name: z.string().trim().min(1).max(60).optional(),
    color: areaColorSchema.optional(),
    /**
     * Weekly target in hours. Pass null (or "") for log-only (clears target).
     * Omit to leave unchanged.
     */
    weeklyTargetHours: z
      .union([z.null(), z.literal(""), z.coerce.number().min(0).max(168)])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === "" || value === null) return null;
        return value;
      }),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.color !== undefined ||
      data.weeklyTargetHours !== undefined ||
      data.isActive !== undefined,
    { message: "Provide at least one field to update" },
  );

export type ListTasksInput = z.infer<typeof listTasksSchema>;
export type CreateTaskMcpInput = z.infer<typeof createTaskMcpSchema>;
export type UpdateTaskMcpInput = z.infer<typeof updateTaskMcpSchema>;
export type SetTop3Input = z.infer<typeof setTop3Schema>;
export type LogTimeMcpInput = z.infer<typeof logTimeMcpSchema>;
export type GetWeekSummaryInput = z.infer<typeof getWeekSummarySchema>;
export type UpdateAreaMcpInput = z.infer<typeof updateAreaMcpSchema>;
export type StartTimerMcpInput = z.infer<typeof startTimerMcpSchema>;
export type StopTimerMcpInput = z.infer<typeof stopTimerMcpSchema>;
