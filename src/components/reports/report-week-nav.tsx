"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDays, currentMonthKey } from "@/lib/dates";

type ReportWeekNavProps = {
  weekStart: string;
  currentWeekStart: string;
  displayRange: string;
};

export function ReportWeekNav({
  weekStart,
  currentWeekStart,
  displayRange,
}: ReportWeekNavProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isCurrentWeek = weekStart === currentWeekStart;

  function goTo(nextStart: string) {
    startTransition(() => {
      router.push(`/reports/${nextStart}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Weekly report</h1>
        <p className="truncate text-sm text-muted-foreground">{displayRange}</p>
        <Link
          href={`/reports/month/${currentMonthKey()}`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Monthly report
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Previous week"
          disabled={pending}
          onClick={() => goTo(addDays(weekStart, -7))}
        >
          <ChevronLeft className="size-5" />
        </Button>
        {!isCurrentWeek ? (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => goTo(currentWeekStart)}
          >
            This week
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Next week"
          disabled={pending}
          onClick={() => goTo(addDays(weekStart, 7))}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
