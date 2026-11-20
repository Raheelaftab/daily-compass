"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AreaRow, TaskStatusFilter, TaskWithArea } from "@/lib/queries";

type TasksViewProps = {
  tasks: TaskWithArea[];
  areas: AreaRow[];
  today: string;
  areaFilter: string;
  statusFilter: TaskStatusFilter;
};

export function TasksView({
  tasks,
  areas,
  today,
  areaFilter,
  statusFilter,
}: TasksViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWithArea | null>(null);

  function updateFilter(key: "area" | "status", value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (key === "area") {
      if (value === "all") params.delete("area");
      else params.set("area", value);
    } else if (value === "open") {
      params.delete("status");
    } else {
      params.set("status", value);
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/tasks?${query}` : "/tasks");
    });
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(task: TaskWithArea) {
    setEditing(task);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <Button type="button" className="h-11 gap-1.5" onClick={openCreate}>
          <Plus className="size-4" />
          Add task
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Area</span>
          <Select
            value={areaFilter}
            onValueChange={(value) => {
              if (value) updateFilter("area", value);
            }}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={String(area.id)}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Status
          </span>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              if (value === "open" || value === "done" || value === "all") {
                updateFilter("status", value);
              }
            }}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState className="py-10">
          No tasks yet — add your first one
        </EmptyState>
      ) : (
        <ul className="rounded-lg border px-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              onEdit={openEdit}
            />
          ))}
        </ul>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        areas={areas}
        task={editing}
      />
    </div>
  );
}
