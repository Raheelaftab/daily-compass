import { CompletionTrendChart } from "@/components/charts/completion-trend-chart";
import { DailyMinutesChart } from "@/components/charts/daily-minutes-chart";
import { HabitHeatmap } from "@/components/dashboard/habit-heatmap";
import { HoursByAreaSection } from "@/components/dashboard/hours-by-area-section";
import { PrayerHeatmap } from "@/components/dashboard/prayer-heatmap";
import { PrayersCard } from "@/components/dashboard/prayers-card";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { TaskStatusOverviewSection } from "@/components/dashboard/task-status-overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { areaDotClass } from "@/lib/areas";
import type { DashboardDateRange } from "@/lib/dashboard-range";
import { formatMinutes, minutesToHours } from "@/lib/dates";
import type {
  CompletionTrendPoint,
  DailyMinutesChartData,
  HabitHeatmapData,
  HabitRateSummary,
  PrayerDashboardSummary,
  PrayerHeatmapData,
  TaskStatusOverview,
  WeekAreaHours,
  WeekStats,
} from "@/lib/queries";

type DashboardViewProps = {
  range: DashboardDateRange;
  taskOverview: TaskStatusOverview;
  stats: WeekStats;
  hoursByArea: WeekAreaHours[];
  completionTrend: CompletionTrendPoint[];
  dailyMinutes: DailyMinutesChartData;
  habitRate: HabitRateSummary;
  habitHeatmap: HabitHeatmapData;
  prayerSummary: PrayerDashboardSummary;
  prayerHeatmap: PrayerHeatmapData;
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
  range,
  taskOverview,
  stats,
  hoursByArea,
  completionTrend,
  dailyMinutes,
  habitRate,
  habitHeatmap,
  prayerSummary,
  prayerHeatmap,
}: DashboardViewProps) {
  const totalLoggedMinutes = hoursByArea.reduce(
    (sum, row) => sum + row.loggedMinutes,
    0,
  );
  const totalTargetMinutes = hoursByArea.reduce(
    (sum, row) => sum + (row.targetMinutes ?? 0),
    0,
  );
  const targetPercent =
    totalTargetMinutes > 0
      ? Math.round((totalLoggedMinutes / totalTargetMinutes) * 100)
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <RangeSelector range={range} />

      <TaskStatusOverviewSection overview={taskOverview} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Completed vs created
        </h2>
        <div className="rounded-lg border p-3">
          <CompletionTrendChart data={completionTrend} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Daily time
        </h2>
        <div className="rounded-lg border p-3">
          <DailyMinutesChart data={dailyMinutes} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Hours by area
        </h2>
        <p className="text-xs text-muted-foreground">
          Tap a logged bar to see time logs. Targets scale with the selected
          range.
        </p>
        <HoursByAreaSection
          data={hoursByArea}
          rangeStart={range.start}
          rangeEnd={range.end}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Hours logged"
          value={`${minutesToHours(totalLoggedMinutes)}h`}
          hint={formatMinutes(totalLoggedMinutes)}
        />
        <StatCard
          label="Target reached"
          value={targetPercent != null ? `${targetPercent}%` : "—"}
          hint={
            totalTargetMinutes > 0
              ? `${minutesToHours(totalLoggedMinutes)}h of ${minutesToHours(totalTargetMinutes)}h target`
              : "No weekly targets set"
          }
        />
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
          Habits & prayers
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            label="Habit completion"
            value={
              habitRate.habitRatePercent != null
                ? `${habitRate.habitRatePercent}%`
                : "—"
            }
            hint={
              habitRate.habitPossible > 0
                ? `${habitRate.habitChecksDone} of ${habitRate.habitPossible} checks (${habitRate.daysElapsed} day${habitRate.daysElapsed === 1 ? "" : "s"} in range)`
                : "No habit checks possible yet"
            }
          />
          <PrayersCard summary={prayerSummary} />
        </div>
        <div className="rounded-lg border p-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Habits · last 30 days
          </p>
          <HabitHeatmap data={habitHeatmap} />
        </div>
        <div className="rounded-lg border p-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Prayers · last 30 days
          </p>
          <PrayerHeatmap data={prayerHeatmap} />
        </div>
      </section>
    </div>
  );
}
