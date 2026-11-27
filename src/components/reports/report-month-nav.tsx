"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addMonths } from "@/lib/dates";

type ReportMonthNavProps = {
  monthKey: string;
  currentMonthKey: string;
  displayLabel: string;
};

export function ReportMonthNav({
  monthKey,
  currentMonthKey,
  displayLabel,
}: ReportMonthNavProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isCurrent = monthKey === currentMonthKey;

  function goTo(nextKey: string) {
    startTransition(() => {
      router.push(`/reports/month/${nextKey}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Monthly report</h1>
        <p className="truncate text-sm text-muted-foreground">{displayLabel}</p>
        <Link
          href="/reports"
          className="inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Weekly reports
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Previous month"
          disabled={pending}
          onClick={() => goTo(addMonths(monthKey, -1))}
        >
          <ChevronLeft className="size-5" />
        </Button>
        {!isCurrent ? (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => goTo(currentMonthKey)}
          >
            This month
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label="Next month"
          disabled={pending}
          onClick={() => goTo(addMonths(monthKey, 1))}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
