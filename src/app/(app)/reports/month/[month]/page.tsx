import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MonthReportView } from "@/components/reports/month-report-view";
import { currentMonthKey, isMonthKey } from "@/lib/dates";
import { getMonthlyReport } from "@/lib/queries";

type MonthReportPageProps = {
  params: Promise<{ month: string }>;
};

async function MonthReportContent({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  await connection();
  const { month } = await params;

  if (!isMonthKey(month)) {
    notFound();
  }

  const report = await getMonthlyReport(month);
  return (
    <MonthReportView
      report={report}
      currentMonthKey={currentMonthKey()}
    />
  );
}

export default function MonthReportPage({ params }: MonthReportPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </div>
      }
    >
      <MonthReportContent params={params} />
    </Suspense>
  );
}
