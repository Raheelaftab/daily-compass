import { connection } from "next/server";
import { Suspense } from "react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { todayStr, weekStart } from "@/lib/dates";
import { getWeekStats, getWeeklyTrend } from "@/lib/queries";

type DashboardPageProps = {
  searchParams: Promise<{ week?: string }>;
};

function parseWeekParam(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return weekStart(value);
  }
  return weekStart(todayStr());
}

async function DashboardPageContent({ searchParams }: DashboardPageProps) {
  await connection();
  const params = await searchParams;
  const selectedWeek = parseWeekParam(params.week);
  const currentWeekStart = weekStart(todayStr());

  const [stats, trend] = await Promise.all([
    getWeekStats(selectedWeek),
    getWeeklyTrend(8),
  ]);

  return (
    <DashboardView
      stats={stats}
      trend={trend}
      currentWeekStart={currentWeekStart}
    />
  );
}

export default function DashboardPage(props: DashboardPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-56 animate-pulse rounded-lg bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      }
    >
      <DashboardPageContent {...props} />
    </Suspense>
  );
}
