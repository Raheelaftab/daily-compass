"use client";

import { useOptimistic, useTransition } from "react";
import { MoreHorizontal, Repeat, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteTask,
  setTaskStatus,
  toggleTop3,
} from "@/actions/tasks";
import { startTimer } from "@/actions/timers";
import { areaDotClass } from "@/lib/areas";
import type { TaskWithArea } from "@/lib/queries";
import { parseRecurrence, recurrenceLabel } from "@/lib/recurrence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type TaskRowProps = {
  task: TaskWithArea;
  today: string;
  onEdit: (task: TaskWithArea) => void;
};

export function TaskRow({ task, today, onEdit }: TaskRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(task.status);

  const isDone = optimisticStatus === "done";
  const isOverdue =
    task.dueDate != null && task.dueDate < today && !isDone;
  const isTop3 = task.top3For === today;
  const isRecurring = parseRecurrence(task.recurrence) != null;
  const repeatTitle = recurrenceLabel(task.recurrence) ?? "Repeats";

  function runStatus(status: TaskWithArea["status"]) {
    startTransition(async () => {
      setOptimisticStatus(status);
      const result = await setTaskStatus({ id: task.id, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        status === "done"
          ? "Task completed"
          : status === "in_progress"
            ? "Marked in progress"
            : "Marked to do",
      );
    });
  }

  function runToggleTop3() {
    startTransition(async () => {
      const result = await toggleTop3(task.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isTop3 ? "Removed from Top 3" : "Added to Top 3");
    });
  }

  function runDelete() {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    startTransition(async () => {
      const result = await deleteTask({ id: task.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Task deleted");
    });
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 border-b py-3 last:border-b-0",
        pending && "opacity-70",
      )}
    >
      <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center">
        <Checkbox
          checked={isDone}
          className="size-5"
          aria-label={isDone ? "Mark incomplete" : "Mark complete"}
          onCheckedChange={(checked) => {
            runStatus(checked ? "done" : "todo");
          }}
        />
      </label>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start gap-2">
          <span className={areaDotClass(task.areaColor, "mt-1.5")} />
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          {isRecurring ? (
            <span title={repeatTitle} className="mt-0.5 inline-flex shrink-0">
              <Repeat
                className="size-3.5 text-muted-foreground"
                aria-label={repeatTitle}
              />
            </span>
          ) : null}
          {isTop3 ? (
            <Star className="mt-0.5 size-3.5 shrink-0 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-4">
          <span className="text-xs text-muted-foreground">{task.areaName}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
            {task.priority}
          </Badge>
          {task.dueDate ? (
            <span
              className={cn(
                "text-xs",
                isOverdue ? "font-medium text-destructive" : "text-muted-foreground",
              )}
            >
              Due {task.dueDate}
            </span>
          ) : null}
          {optimisticStatus === "in_progress" ? (
            <Badge className="h-5 px-1.5 text-[10px]">In progress</Badge>
          ) : null}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label="Task actions"
            >
              <MoreHorizontal className="size-5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem className="min-h-11" onClick={() => onEdit(task)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11"
            onClick={() => {
              startTransition(async () => {
                const result = await startTimer({ taskId: task.id });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Timer started");
                router.refresh();
              });
            }}
          >
            Start timer
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11"
            onClick={() => runStatus("todo")}
          >
            Status: To do
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11"
            onClick={() => runStatus("in_progress")}
          >
            Status: In progress
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11"
            onClick={() => runStatus("done")}
          >
            Status: Done
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="min-h-11" onClick={runToggleTop3}>
            {isTop3 ? "Remove from Top 3" : "Add to Top 3"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11"
            variant="destructive"
            onClick={runDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
