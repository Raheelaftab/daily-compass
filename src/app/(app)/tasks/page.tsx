import { connection } from "next/server";
import { Suspense } from "react";

import { TasksView } from "@/components/tasks/tasks-view";
import { todayStr } from "@/lib/dates";
import {
  getActiveAreas,
  getTasks,
  type TaskStatusFilter,
} from "@/lib/queries";

import TasksLoading from "./loading";

type TasksPageProps = {
  searchParams: Promise<{ area?: string; status?: string }>;
};

function parseStatus(value: string | undefined): TaskStatusFilter {
  if (value === "done" || value === "all" || value === "open") return value;
  return "open";
}

async function TasksPageContent({ searchParams }: TasksPageProps) {
  await connection();

  const params = await searchParams;
  const statusFilter = parseStatus(params.status);
  const areaRaw = params.area;
  const areaId =
    areaRaw && areaRaw !== "all" && /^\d+$/.test(areaRaw)
      ? Number(areaRaw)
      : undefined;

  const [areas, tasks] = await Promise.all([
    getActiveAreas(),
    getTasks({
      status: statusFilter,
      areaId,
    }),
  ]);

  return (
    <TasksView
      tasks={tasks}
      areas={areas}
      today={todayStr()}
      areaFilter={areaId != null ? String(areaId) : "all"}
      statusFilter={statusFilter}
    />
  );
}

export default function TasksPage(props: TasksPageProps) {
  return (
    <Suspense fallback={<TasksLoading />}>
      <TasksPageContent {...props} />
    </Suspense>
  );
}
