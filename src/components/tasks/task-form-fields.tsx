"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AreaRow } from "@/lib/queries";
import {
  WEEKDAY_CODES,
  type RecurrenceFormState,
  type WeekdayCode,
} from "@/lib/recurrence";
import { cn } from "@/lib/utils";

export type TaskFormValues = {
  title: string;
  areaId: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  notes: string;
  recurrence: RecurrenceFormState;
};

type TaskFormFieldsProps = {
  areas: AreaRow[];
  values: TaskFormValues;
  onChange: (values: TaskFormValues) => void;
  idPrefix: string;
};

const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export function TaskFormFields({
  areas,
  values,
  onChange,
  idPrefix,
}: TaskFormFieldsProps) {
  function setRecurrence(patch: Partial<RecurrenceFormState>) {
    onChange({
      ...values,
      recurrence: { ...values.recurrence, ...patch },
    });
  }

  function toggleWeeklyDay(day: WeekdayCode) {
    const current = values.recurrence.weeklyDays;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setRecurrence({
      weeklyDays: next.length > 0 ? next : [day],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-title`} className="text-sm font-medium">
          Title
        </label>
        <Input
          id={`${idPrefix}-title`}
          value={values.title}
          onChange={(e) => onChange({ ...values, title: e.target.value })}
          required
          className="h-11"
          placeholder="What needs doing?"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Area</span>
        <Select
          value={values.areaId}
          onValueChange={(areaId) => {
            if (areaId != null) onChange({ ...values, areaId });
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Select area" />
          </SelectTrigger>
          <SelectContent>
            {areas.map((area) => (
              <SelectItem key={area.id} value={String(area.id)}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Priority</span>
        <Select
          value={values.priority}
          onValueChange={(priority) => {
            if (
              priority === "high" ||
              priority === "medium" ||
              priority === "low"
            ) {
              onChange({ ...values, priority });
            }
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-due`} className="text-sm font-medium">
          Due date
        </label>
        <Input
          id={`${idPrefix}-due`}
          type="date"
          value={values.dueDate}
          onChange={(e) => onChange({ ...values, dueDate: e.target.value })}
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Repeat</span>
        <Select
          value={values.recurrence.kind}
          onValueChange={(kind) => {
            if (
              kind === "none" ||
              kind === "daily" ||
              kind === "weekdays" ||
              kind === "weekly" ||
              kind === "monthly"
            ) {
              setRecurrence({ kind });
            }
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
            <SelectItem value="weekly">Weekly (pick days)</SelectItem>
            <SelectItem value="monthly">Monthly (day of month)</SelectItem>
          </SelectContent>
        </Select>

        {values.recurrence.kind === "weekly" ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {WEEKDAY_CODES.map((day) => {
              const selected = values.recurrence.weeklyDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={cn(
                    "inline-flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-xs font-medium",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground",
                  )}
                  aria-pressed={selected}
                  onClick={() => toggleWeeklyDay(day)}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              );
            })}
          </div>
        ) : null}

        {values.recurrence.kind === "monthly" ? (
          <div className="flex flex-col gap-1.5 pt-1">
            <label
              htmlFor={`${idPrefix}-monthly-day`}
              className="text-xs text-muted-foreground"
            >
              Day of month (1–31)
            </label>
            <Input
              id={`${idPrefix}-monthly-day`}
              type="number"
              min={1}
              max={31}
              value={values.recurrence.monthlyDay}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setRecurrence({
                  monthlyDay: Math.min(31, Math.max(1, Math.round(n))),
                });
              }}
              className="h-11"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-notes`} className="text-sm font-medium">
          Notes
        </label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          rows={3}
          placeholder="Optional"
        />
      </div>
    </div>
  );
}
