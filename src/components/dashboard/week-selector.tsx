"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDays } from "@/lib/dates";

type WeekSelectorProps = {
  weekStart: string;
  currentWeekStart: string;
  displayRange: string;
};

export function WeekSelector({
  weekStart,
  currentWeekStart,
  displayRange,
}: WeekSelectorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isCurrentWeek = weekStart === currentWeekStart;

  function goTo(nextStart: string) {
    startTransition(() => {
      if (nextStart === currentWeekStart) {
        router.push("/dashboard");
      } else {
        router.push(`/dashboard?week=${nextStart}`);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="truncate text-sm text-muted-foreground">{displayRange}</p>
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
