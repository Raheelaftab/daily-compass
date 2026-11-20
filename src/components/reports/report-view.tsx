import { ReportWeekNav } from "@/components/reports/report-week-nav";
import { ReviewForm } from "@/components/reports/review-form";
import { EmptyState } from "@/components/ui/empty-state";
import { areaDotClass } from "@/lib/areas";
import { formatMinutes, minutesToHours } from "@/lib/dates";
import type { WeeklyReport } from "@/lib/queries";

type ReportViewProps = {
  report: WeeklyReport;
  currentWeekStart: string;
};

function TaskList({
  title,
  empty,
  tasks,
}: {
  title: string;
  empty: string;
  tasks: WeeklyReport["completedTasks"];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {tasks.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2 px-3 py-3">
              <span className={areaDotClass(task.areaColor, "mt-1.5")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.areaName}
                  {task.dueDate ? ` · Due ${task.dueDate}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReportView({ report, currentWeekStart }: ReportViewProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <ReportWeekNav
        weekStart={report.weekStart}
        currentWeekStart={currentWeekStart}
        displayRange={report.displayRange}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Hours by area
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Area</th>
                <th className="px-3 py-2 font-medium">Logged</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {report.hoursByArea.map((row) => (
                <tr key={row.areaId} className="border-b last:border-b-0">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span className={areaDotClass(row.color)} />
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatMinutes(row.loggedMinutes)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {row.targetMinutes != null
                      ? `${minutesToHours(row.targetMinutes)}h`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.percent != null ? `${row.percent}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TaskList
        title="Tasks completed"
        empty="No tasks completed this week"
        tasks={report.completedTasks}
      />

      <TaskList
        title="Tasks that slipped"
        empty="Nothing slipped — nice"
        tasks={report.slippedTasks}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Top 3 hit rate
        </h2>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-semibold tabular-nums">
            {report.top3HitRate != null ? `${report.top3HitRate}%` : "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.top3Marked === 0
              ? "No Top 3 tasks marked this week"
              : `${report.top3Completed} of ${report.top3Marked} Top 3 tasks completed`}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Habit rate
        </h2>
        {report.habitRates.length === 0 ? (
          <EmptyState>No active habits</EmptyState>
        ) : (
          <ul className="divide-y rounded-lg border">
            {report.habitRates.map((habit) => (
              <li
                key={habit.id}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {habit.name}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {habit.percent != null ? `${habit.percent}%` : "—"}
                  <span className="ml-2 text-xs">
                    ({habit.done}/{habit.possible})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReviewForm
        key={report.weekStart}
        weekStart={report.weekStart}
        initial={report.review}
      />
    </div>
  );
}
