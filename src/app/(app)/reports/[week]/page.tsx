import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ReportView } from "@/components/reports/report-view";
import { todayStr, weekStart } from "@/lib/dates";
import { getWeeklyReport } from "@/lib/queries";

type ReportsWeekPageProps = {
  params: Promise<{ week: string }>;
};

async function ReportsWeekContent({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  await connection();
  const { week } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    notFound();
  }

  const start = weekStart(week);
  if (week !== start) {
    redirect(`/reports/${start}`);
  }

  const report = await getWeeklyReport(start);
  const currentWeekStart = weekStart(todayStr());

  return (
    <ReportView report={report} currentWeekStart={currentWeekStart} />
  );
}

export default function ReportsWeekPage({ params }: ReportsWeekPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
      }
    >
      <ReportsWeekContent params={params} />
    </Suspense>
  );
}
