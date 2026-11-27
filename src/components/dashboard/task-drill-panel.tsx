"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";

import { setTaskStatus, toggleTop3 } from "@/actions/tasks";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { areaDotClass } from "@/lib/areas";
import { todayStr } from "@/lib/dates";
import type { DashboardTaskBucket, TaskWithArea } from "@/lib/queries";
import { cn } from "@/lib/utils";

const BUCKET_TITLES: Record<DashboardTaskBucket, string> = {
  completed: "Completed",
  open: "Open",
  overdue: "Overdue",
};

type TaskDrillPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: DashboardTaskBucket;
  areaName?: string | null;
  tasks: TaskWithArea[];
  loading: boolean;
  onTasksChange: (tasks: TaskWithArea[]) => void;
};

export function TaskDrillPanel({
  open,
  onOpenChange,
  bucket,
  areaName,
  tasks,
  loading,
  onTasksChange,
}: TaskDrillPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = todayStr();
  const title = areaName
    ? `${BUCKET_TITLES[bucket]} · ${areaName}`
    : BUCKET_TITLES[bucket];

  function markDone(task: TaskWithArea) {
    startTransition(async () => {
      const result = await setTaskStatus({ id: task.id, status: "done" });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Task completed");
      onTasksChange(tasks.filter((t) => t.id !== task.id));
      router.refresh();
    });
  }

  function setTop3(task: TaskWithArea) {
    if (task.top3For === today) {
      toast.success("Already in today's Top 3");
      return;
    }
    startTransition(async () => {
      const result = await toggleTop3(task.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Added to Top 3");
      onTasksChange(
        tasks.map((t) =>
          t.id === task.id ? { ...t, top3For: today } : t,
        ),
      );
      router.refresh();
    });
  }

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      {loading ? (
        <div className="space-y-3 p-4">
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-4">
          <EmptyState>No tasks in this view</EmptyState>
        </div>
      ) : (
        <ul className="divide-y overflow-y-auto">
          {tasks.map((task) => {
            const isTop3 = task.top3For === today;
            const isDone = task.status === "done";
            return (
              <li
                key={task.id}
                className={cn(
                  "flex flex-col gap-2 px-4 py-3",
                  pending && "opacity-70",
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={areaDotClass(task.areaColor, "mt-1.5")} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium leading-snug",
                        isDone && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {task.areaName}
                      {task.dueDate ? ` · Due ${task.dueDate}` : ""}
                      {isTop3 ? " · Top 3" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-4">
                  {!isDone ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-1.5"
                      disabled={pending}
                      onClick={() => markDone(task)}
                    >
                      <Check className="size-4" />
                      Mark done
                    </Button>
                  ) : null}
                  {!isDone ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-1.5"
                      disabled={pending || isTop3}
                      onClick={() => setTop3(task)}
                    >
                      <Star className="size-4" />
                      {isTop3 ? "In Top 3" : "Top 3"}
                    </Button>
                  ) : null}
                  <Link
                    href="/tasks?status=all"
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-11 gap-1.5",
                    )}
                  >
                    <ExternalLink className="size-4" />
                    Open task
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
