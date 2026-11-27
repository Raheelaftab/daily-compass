"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Repeat } from "lucide-react";
import { toast } from "sonner";

import { setTaskStatus, toggleTop3 } from "@/actions/tasks";
import { areaDotClass } from "@/lib/areas";
import type { TaskWithArea } from "@/lib/queries";
import { parseRecurrence, recurrenceLabel } from "@/lib/recurrence";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type Top3SectionProps = {
  today: string;
  top3: TaskWithArea[];
  openTasks: TaskWithArea[];
};

export function Top3Section({ today, top3, openTasks }: Top3SectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimisticTop3, applyOptimistic] = useOptimistic(
    top3,
    (
      current: TaskWithArea[],
      action: { type: "complete"; id: number; done: boolean },
    ) =>
      current.map((task) =>
        task.id === action.id
          ? { ...task, status: action.done ? ("done" as const) : ("todo" as const) }
          : task,
      ),
  );

  const pickable = openTasks.filter(
    (task) =>
      task.top3For !== today &&
      !optimisticTop3.some((t) => t.id === task.id),
  );

  function completeTask(task: TaskWithArea, done: boolean) {
    startTransition(async () => {
      applyOptimistic({ type: "complete", id: task.id, done });
      const result = await setTaskStatus({
        id: task.id,
        status: done ? "done" : "todo",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(done ? "Task completed" : "Task reopened");
    });
  }

  function pickTask(taskId: number) {
    startTransition(async () => {
      const result = await toggleTop3(taskId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Added to Top 3");
      setPickerOpen(false);
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Top 3
        </h2>
        {optimisticTop3.length < 3 ? (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setPickerOpen(true)}
            disabled={pending}
          >
            Pick from tasks
          </Button>
        ) : null}
      </div>

      {optimisticTop3.length === 0 ? (
        <EmptyState>No Top 3 yet — pick up to three focus tasks</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border">
          {optimisticTop3.map((task) => {
            const done = task.status === "done";
            return (
              <li key={task.id} className="flex items-start gap-3 px-3 py-3">
                <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                  <Checkbox
                    checked={done}
                    className="size-5"
                    aria-label={done ? "Mark incomplete" : "Mark complete"}
                    onCheckedChange={(checked) => {
                      completeTask(task, Boolean(checked));
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span className={areaDotClass(task.areaColor, "mt-1.5")} />
                    <p
                      className={cn(
                        "text-sm font-medium leading-snug",
                        done && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    {parseRecurrence(task.recurrence) ? (
                      <span
                        title={recurrenceLabel(task.recurrence) ?? "Repeats"}
                        className="mt-0.5 inline-flex shrink-0"
                      >
                        <Repeat
                          className="size-3.5 text-muted-foreground"
                          aria-label={
                            recurrenceLabel(task.recurrence) ?? "Repeats"
                          }
                        />
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 pl-4 text-xs text-muted-foreground">
                    {task.areaName}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Top3Picker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        tasks={pickable}
        today={today}
        onPick={pickTask}
        pending={pending}
      />
    </section>
  );
}

function Top3Picker({
  open,
  onOpenChange,
  tasks,
  today,
  onPick,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: TaskWithArea[];
  today: string;
  onPick: (taskId: number) => void;
  pending: boolean;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const body =
    tasks.length === 0 ? (
      <EmptyState className="mx-4 border-0">
        No open tasks available to pick
      </EmptyState>
    ) : (
      <ul className="max-h-[60vh] divide-y overflow-y-auto">
        {tasks.map((task) => {
          const isOverdue =
            task.dueDate != null && task.dueDate < today && task.status !== "done";
          return (
            <li key={task.id}>
              <button
                type="button"
                className="flex min-h-14 w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/60 disabled:opacity-50"
                disabled={pending}
                onClick={() => onPick(task.id)}
              >
                <span className={areaDotClass(task.areaColor, "mt-1.5")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{task.title}</span>
                  <span className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{task.areaName}</span>
                    <span className="capitalize">{task.priority}</span>
                    {task.dueDate ? (
                      <span
                        className={cn(
                          isOverdue && "font-medium text-destructive",
                        )}
                      >
                        Due {task.dueDate}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );

  if (!open) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 sm:max-w-md" showCloseButton>
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Pick a Top 3 task</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Pick a Top 3 task</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
