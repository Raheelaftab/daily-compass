"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createTask, updateTask } from "@/actions/tasks";
import {
  TaskFormFields,
  type TaskFormValues,
} from "@/components/tasks/task-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { AreaRow, TaskWithArea } from "@/lib/queries";
import {
  formToRecurrenceString,
  recurrenceToForm,
} from "@/lib/recurrence";

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areas: AreaRow[];
  task?: TaskWithArea | null;
};

function emptyValues(areas: AreaRow[]): TaskFormValues {
  return {
    title: "",
    areaId: areas[0] ? String(areas[0].id) : "",
    priority: "medium",
    dueDate: "",
    notes: "",
    recurrence: recurrenceToForm(null),
  };
}

function valuesFromTask(task: TaskWithArea): TaskFormValues {
  return {
    title: task.title,
    areaId: String(task.areaId),
    priority: task.priority,
    dueDate: task.dueDate ?? "",
    notes: task.notes ?? "",
    recurrence: recurrenceToForm(task.recurrence),
  };
}

function TaskFormDialogInner({
  open,
  onOpenChange,
  areas,
  task = null,
}: TaskFormDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [values, setValues] = useState<TaskFormValues>(() =>
    task ? valuesFromTask(task) : emptyValues(areas),
  );
  const [pending, startTransition] = useTransition();
  const isEdit = task != null;

  function handleSubmit() {
    if (!values.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!values.areaId) {
      toast.error("Area is required");
      return;
    }

    startTransition(async () => {
      const recurrence = formToRecurrenceString(values.recurrence);
      if (
        values.recurrence.kind === "weekly" &&
        values.recurrence.weeklyDays.length === 0
      ) {
        toast.error("Pick at least one weekday");
        return;
      }

      const payload = {
        title: values.title,
        areaId: Number(values.areaId),
        priority: values.priority,
        dueDate: values.dueDate,
        notes: values.notes,
        recurrence,
      };

      const result = isEdit
        ? await updateTask({ ...payload, id: task.id })
        : await createTask(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Task updated" : "Task added");
      onOpenChange(false);
    });
  }

  const fields = (
    <TaskFormFields
      areas={areas}
      values={values}
      onChange={setValues}
      idPrefix={isEdit ? `edit-${task.id}` : "new"}
    />
  );

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => onOpenChange(false)}
        disabled={pending}
      >
        Cancel
      </Button>
      <Button
        type="button"
        className="h-11"
        onClick={handleSubmit}
        disabled={pending}
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Add task"}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit task" : "Add task"}</DialogTitle>
          </DialogHeader>
          {fields}
          <DialogFooter className="gap-2 sm:justify-end">{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isEdit ? "Edit task" : "Add task"}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-2">{fields}</div>
        <DrawerFooter className="flex-row gap-2">{actions}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function TaskFormDialog(props: TaskFormDialogProps) {
  if (!props.open) return null;

  // Remount when switching create/edit so form state resets without an effect.
  return (
    <TaskFormDialogInner
      key={props.task ? `edit-${props.task.id}` : "create"}
      {...props}
    />
  );
}
