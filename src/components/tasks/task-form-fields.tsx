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

export type TaskFormValues = {
  title: string;
  areaId: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  notes: string;
};

type TaskFormFieldsProps = {
  areas: AreaRow[];
  values: TaskFormValues;
  onChange: (values: TaskFormValues) => void;
  idPrefix: string;
};

export function TaskFormFields({
  areas,
  values,
  onChange,
  idPrefix,
}: TaskFormFieldsProps) {
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
