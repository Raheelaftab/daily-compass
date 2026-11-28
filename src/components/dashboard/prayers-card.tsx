import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  PrayerDashboardSummary,
  PrayerDotStatus,
} from "@/lib/queries";

type PrayersCardProps = {
  summary: PrayerDashboardSummary;
};

function dotClass(status: PrayerDotStatus): string {
  switch (status) {
    case "prayed":
      return "bg-chart-2";
    case "missed":
      return "bg-destructive";
    case "pending":
      return "bg-chart-4";
    case "upcoming":
    default:
      return "bg-muted ring-1 ring-border";
  }
}

export function PrayersCard({ summary }: PrayersCardProps) {
  const weekLabel =
    summary.weekPossible > 0
      ? `${summary.weekPrayed}/${summary.weekPossible} this week`
      : "No prayers tracked this week";

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-1 px-4">
        <CardDescription className="text-xs font-medium tracking-wide uppercase">
          Prayers
        </CardDescription>
        <CardTitle className="text-lg font-semibold">Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        <div className="flex items-center justify-between gap-2">
          {summary.dots.map((dot) => (
            <div
              key={dot.prayer}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              title={
                dot.time
                  ? `${dot.label} ${dot.time} — ${dot.status}`
                  : `${dot.label} — ${dot.status}`
              }
            >
              <span
                className={`size-3 rounded-full ${dotClass(dot.status)}`}
                aria-hidden
              />
              <span className="truncate text-[10px] font-medium text-muted-foreground">
                {dot.label.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{weekLabel}</p>
      </CardContent>
    </Card>
  );
}
