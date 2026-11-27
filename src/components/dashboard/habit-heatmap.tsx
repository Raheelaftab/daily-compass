import { EmptyState } from "@/components/ui/empty-state";
import { formatDisplay } from "@/lib/dates";
import type { HabitHeatmapData } from "@/lib/queries";

type HabitHeatmapProps = {
  data: HabitHeatmapData;
};

function cellClass(ratePercent: number | null): string {
  if (ratePercent == null || ratePercent === 0) {
    return "bg-muted";
  }
  if (ratePercent < 34) {
    return "bg-chart-2/30";
  }
  if (ratePercent < 67) {
    return "bg-chart-2/55";
  }
  if (ratePercent < 100) {
    return "bg-chart-2/80";
  }
  return "bg-chart-2";
}

export function HabitHeatmap({ data }: HabitHeatmapProps) {
  if (data.days.length === 0) {
    return (
      <EmptyState className="border-0 py-6">No habit days to show</EmptyState>
    );
  }

  const hasHabits = data.days.some((day) => day.possible > 0);
  if (!hasHabits) {
    return (
      <EmptyState className="border-0 py-6">No active habits</EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(1.25rem, 1fr))",
        }}
        role="img"
        aria-label={`Habit completion heatmap from ${formatDisplay(data.start)} to ${formatDisplay(data.end)}`}
      >
        {data.days.map((day) => {
          const title =
            day.ratePercent == null
              ? `${formatDisplay(day.date)}: no habits`
              : `${formatDisplay(day.date)}: ${day.done}/${day.possible} (${day.ratePercent}%)`;
          return (
            <div
              key={day.date}
              title={title}
              className={`aspect-square rounded-sm ${cellClass(day.ratePercent)}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{data.days[0]?.label}</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <span className="size-3 rounded-sm bg-muted" />
          <span className="size-3 rounded-sm bg-chart-2/30" />
          <span className="size-3 rounded-sm bg-chart-2/55" />
          <span className="size-3 rounded-sm bg-chart-2/80" />
          <span className="size-3 rounded-sm bg-chart-2" />
          <span>More</span>
        </div>
        <span>{data.days[data.days.length - 1]?.label}</span>
      </div>
    </div>
  );
}
