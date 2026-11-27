import { connection } from "next/server";
import { Suspense } from "react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import {
  resolveDashboardRange,
  weekStartForLegacyWidgets,
} from "@/lib/dashboard-range";
import {
  getCompletionTrend,
  getDailyMinutes,
  getHabitHeatmap,
  getHabitRateForRange,
  getHoursByAreaForRange,
  getTaskStatusByArea,
  getWeekStats,
} from "@/lib/queries";

type DashboardPageProps = {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    week?: string;
  }>;
};

async function DashboardPageContent({ searchParams }: DashboardPageProps) {
  await connection();
  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const legacyWeek = weekStartForLegacyWidgets(range);
  const rangeKey = { start: range.start, end: range.end };

  const [
    taskOverview,
    stats,
    completionTrend,
    dailyMinutes,
    hoursByArea,
    habitRate,
    habitHeatmap,
  ] = await Promise.all([
    getTaskStatusByArea(rangeKey),
    getWeekStats(legacyWeek),
    getCompletionTrend(rangeKey),
    getDailyMinutes(rangeKey),
    getHoursByAreaForRange(rangeKey),
    getHabitRateForRange(rangeKey),
    getHabitHeatmap(30),
  ]);

  return (
    <DashboardView
      range={range}
      taskOverview={taskOverview}
      stats={stats}
      hoursByArea={hoursByArea}
      completionTrend={completionTrend}
      dailyMinutes={dailyMinutes}
      habitRate={habitRate}
      habitHeatmap={habitHeatmap}
    />
  );
}

export default function DashboardPage(props: DashboardPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-3">
            <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
            <div className="flex gap-2 overflow-hidden">
              <div className="h-11 w-24 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="h-11 w-24 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="h-11 w-28 shrink-0 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-56 animate-pulse rounded-lg bg-muted" />
          <div className="h-56 animate-pulse rounded-lg bg-muted" />
        </div>
      }
    >
      <DashboardPageContent {...props} />
    </Suspense>
  );
}
