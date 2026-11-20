import { z } from "zod";

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

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  areaId: z.coerce.number().int().positive(),
  priority: taskPrioritySchema.default("medium"),
  dueDate: optionalDate,
  notes: optionalNotes,
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
