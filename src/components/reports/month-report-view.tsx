import { ReportMonthNav } from "@/components/reports/report-month-nav";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { areaDotClass } from "@/lib/areas";
import { formatMinutes, minutesToHours } from "@/lib/dates";
import type { MonthlyReport } from "@/lib/queries";
import { cn } from "@/lib/utils";

type MonthReportViewProps = {
  report: MonthlyReport;
  currentMonthKey: string;
};

function TaskList({
  title,
  empty,
  tasks,
}: {
  title: string;
  empty: string;
  tasks: MonthlyReport["completedTasks"];
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

export function MonthReportView({
  report,
  currentMonthKey,
}: MonthReportViewProps) {
  const tasksHref = `/api/export/tasks?from=${report.start}&to=${report.end}`;
  const logsHref = `/api/export/time-logs?from=${report.start}&to=${report.end}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <ReportMonthNav
        monthKey={report.monthKey}
        currentMonthKey={currentMonthKey}
        displayLabel={report.displayLabel}
      />

      <section className="flex flex-wrap gap-2">
        <a
          href={tasksHref}
          className={cn(buttonVariants({ variant: "outline" }), "h-11")}
        >
          Export tasks CSV
        </a>
        <a
          href={logsHref}
          className={cn(buttonVariants({ variant: "outline" }), "h-11")}
        >
          Export time logs CSV
        </a>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Tasks completed
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {report.tasksCompleted}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Habit rate
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {report.habitRatePercent != null
              ? `${report.habitRatePercent}%`
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.habitPossible > 0
              ? `${report.habitChecksDone} of ${report.habitPossible} checks`
              : "No habit checks yet"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Best day
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {report.bestDay ? report.bestDay.label : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.bestDay
              ? formatMinutes(report.bestDay.minutes)
              : "No time logged"}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Hours by area
          </h2>
          <p className="text-xs text-muted-foreground">
            Target = weekly hours × {report.weeks.toFixed(2)} weeks in month
          </p>
        </div>
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
        empty="No tasks completed this month"
        tasks={report.completedTasks}
      />

      <TaskList
        title="Tasks that slipped"
        empty="Nothing slipped — nice"
        tasks={report.slippedTasks}
      />
    </div>
  );
}
