import { Suspense } from "react";

type ReportsWeekPageProps = {
  params: Promise<{ week: string }>;
};

async function ReportsWeekContent({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Weekly report</h1>
      <p className="text-sm text-muted-foreground">
        Week of {week}. Full report coming in Session 7.
      </p>
    </div>
  );
}

export default function ReportsWeekPage({ params }: ReportsWeekPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Weekly report
          </h1>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <ReportsWeekContent params={params} />
    </Suspense>
  );
}
