import { HoursByAreaChart } from "@/components/charts/hours-by-area-chart";
import { WeeklyTrendChart } from "@/components/charts/weekly-trend-chart";
import { WeekSelector } from "@/components/dashboard/week-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { areaDotClass } from "@/lib/areas";
import { formatMinutes, minutesToHours } from "@/lib/dates";
import type { WeekStats, WeeklyTrendPoint } from "@/lib/queries";

type DashboardViewProps = {
  stats: WeekStats;
  trend: WeeklyTrendPoint[];
  currentWeekStart: string;
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="gap-1 px-4">
        <CardDescription className="text-xs font-medium tracking-wide uppercase">
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="px-4">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function DashboardView({
  stats,
  trend,
  currentWeekStart,
}: DashboardViewProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <WeekSelector
        weekStart={stats.weekStart}
        currentWeekStart={currentWeekStart}
        displayRange={stats.displayRange}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Hours by area
        </h2>
        <div className="rounded-lg border p-3">
          <HoursByAreaChart data={stats.hoursByArea} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Hours logged"
          value={`${minutesToHours(stats.totalLoggedMinutes)}h`}
          hint={formatMinutes(stats.totalLoggedMinutes)}
        />
        <StatCard
          label="Target reached"
          value={
            stats.targetPercent != null ? `${stats.targetPercent}%` : "—"
          }
          hint={
            stats.totalTargetMinutes > 0
              ? `${minutesToHours(stats.totalLoggedMinutes)}h of ${minutesToHours(stats.totalTargetMinutes)}h target`
              : "No weekly targets set"
          }
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Tasks
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Completed" value={String(stats.tasksCompleted)} />
          <StatCard label="Open" value={String(stats.tasksOpen)} />
          <StatCard label="Overdue" value={String(stats.tasksOverdue)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Open tasks by area
        </h2>
        {stats.openByArea.length === 0 ? (
          <EmptyState>No open tasks</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border">
            {stats.openByArea.map((row) => (
              <li
                key={row.areaId}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <span className={areaDotClass(row.color)} />
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Habits
        </h2>
        <StatCard
          label="Completion rate"
          value={
            stats.habitRatePercent != null
              ? `${stats.habitRatePercent}%`
              : "—"
          }
          hint={
            stats.habitPossible > 0
              ? `${stats.habitChecksDone} of ${stats.habitPossible} checks (${stats.daysElapsed} day${stats.daysElapsed === 1 ? "" : "s"} elapsed)`
              : "No habit checks possible yet"
          }
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Trend (last 8 weeks)
        </h2>
        <div className="rounded-lg border p-3">
          <WeeklyTrendChart data={trend} />
        </div>
      </section>
    </div>
  );
}
