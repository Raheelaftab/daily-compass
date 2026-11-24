import { z } from "zod";

import { taskPrioritySchema, taskStatusSchema } from "@/lib/validators";

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
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.priority !== undefined ||
      data.dueDate !== undefined ||
      data.status !== undefined ||
      data.notes !== undefined,
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

export type ListTasksInput = z.infer<typeof listTasksSchema>;
export type CreateTaskMcpInput = z.infer<typeof createTaskMcpSchema>;
export type UpdateTaskMcpInput = z.infer<typeof updateTaskMcpSchema>;
export type SetTop3Input = z.infer<typeof setTop3Schema>;
export type LogTimeMcpInput = z.infer<typeof logTimeMcpSchema>;
export type GetWeekSummaryInput = z.infer<typeof getWeekSummarySchema>;
