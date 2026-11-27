"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { fetchDrillTasks } from "@/actions/dashboard";
import { TaskStatusByAreaChart } from "@/components/charts/task-status-by-area-chart";
import { TaskDrillPanel } from "@/components/dashboard/task-drill-panel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  DashboardTaskBucket,
  TaskStatusOverview,
  TaskWithArea,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

type DrillState = {
  bucket: DashboardTaskBucket;
  areaId?: number;
  areaName?: string | null;
};

type TaskStatusOverviewProps = {
  overview: TaskStatusOverview;
};

export function TaskStatusOverviewSection({
  overview,
}: TaskStatusOverviewProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [drillTasks, setDrillTasks] = useState<TaskWithArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  function openDrill(next: DrillState) {
    setDrill(next);
    setPanelOpen(true);
    setLoading(true);
    setDrillTasks([]);

    startTransition(async () => {
      const result = await fetchDrillTasks({
        bucket: next.bucket,
        rangeStart: overview.rangeStart,
        rangeEnd: overview.rangeEnd,
        areaId: next.areaId,
        includeOverdue: next.bucket === "open" && next.areaId == null,
      });
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDrillTasks(result.tasks);
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Task status
      </h2>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            {
              bucket: "completed" as const,
              label: "Completed",
              value: overview.totals.completed,
              hint: "In range",
            },
            {
              bucket: "open" as const,
              label: "Open",
              value: overview.totals.open,
              hint: "Current",
            },
            {
              bucket: "overdue" as const,
              label: "Overdue",
              value: overview.totals.overdue,
              hint: "Current",
            },
          ] as const
        ).map((card) => (
          <button
            key={card.bucket}
            type="button"
            className={cn(
              "rounded-xl text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              "min-h-11",
            )}
            onClick={() => openDrill({ bucket: card.bucket })}
          >
            <Card className="h-full gap-1 py-4 ring-foreground/10 hover:bg-muted/40">
              <CardHeader className="gap-1 px-3 sm:px-4">
                <CardDescription className="text-[10px] font-medium tracking-wide uppercase sm:text-xs">
                  {card.label}
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {card.value}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  {card.hint}
                </p>
              </CardHeader>
            </Card>
          </button>
        ))}
      </div>

      <div className="rounded-lg border p-3">
        {overview.byArea.length === 0 ? (
          <EmptyState className="border-0">No tasks in this range</EmptyState>
        ) : (
          <TaskStatusByAreaChart
            data={overview.byArea}
            onSegmentClick={(areaId, bucket) => {
              const area = overview.byArea.find((row) => row.areaId === areaId);
              openDrill({
                bucket,
                areaId,
                areaName: area?.name ?? null,
              });
            }}
          />
        )}
      </div>

      {drill ? (
        <TaskDrillPanel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          bucket={drill.bucket}
          areaName={drill.areaName}
          tasks={drillTasks}
          loading={loading}
          onTasksChange={setDrillTasks}
        />
      ) : null}
    </section>
  );
}
