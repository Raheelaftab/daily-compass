import { HabitsToday } from "@/components/habits/habits-today";
import { StartTimerPicker } from "@/components/timer/start-timer-picker";
import { QuickLogForm } from "@/components/today/quick-log-form";
import { TodaysLogList } from "@/components/today/todays-log-list";
import { Top3Section } from "@/components/today/top3-section";
import { formatMinutes } from "@/lib/dates";
import type { TodayData } from "@/lib/queries";

type TodayViewProps = {
  data: TodayData;
};

export function TodayView({ data }: TodayViewProps) {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted-foreground">{data.displayDate}</p>
          <p className="text-sm font-medium tabular-nums">
            {formatMinutes(data.totalMinutes)} logged
          </p>
        </div>
      </header>

      <Top3Section
        today={data.today}
        top3={data.top3}
        openTasks={data.openTasks}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Timer
        </h2>
        <StartTimerPicker areas={data.areas} openTasks={data.openTasks} />
      </section>

      <QuickLogForm areas={data.areas} openTasks={data.openTasks} />

      <HabitsToday today={data.today} habits={data.habitsToday} />

      <TodaysLogList logs={data.logs} />
    </div>
  );
}
