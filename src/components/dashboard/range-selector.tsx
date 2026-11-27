"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DASHBOARD_RANGE_PRESETS,
  dashboardRangeHref,
  type DashboardDateRange,
  type DashboardRangePreset,
} from "@/lib/dashboard-range";
import { cn } from "@/lib/utils";

const PRESET_LABELS: Record<Exclude<DashboardRangePreset, "custom">, string> =
  {
    "this-week": "This week",
    "last-week": "Last week",
    "this-month": "This month",
    "last-30": "Last 30 days",
  };

type RangeSelectorProps = {
  range: DashboardDateRange;
};

export function RangeSelector({ range }: RangeSelectorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(range.start);
  const [customTo, setCustomTo] = useState(range.end);
  const [showCustom, setShowCustom] = useState(range.preset === "custom");

  function go(preset: DashboardRangePreset, custom?: { from: string; to: string }) {
    startTransition(() => {
      router.push(dashboardRangeHref(preset, custom));
    });
  }

  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="truncate text-sm text-muted-foreground">{range.label}</p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {DASHBOARD_RANGE_PRESETS.filter((p) => p !== "custom").map((preset) => {
          const active = range.preset === preset;
          return (
            <Button
              key={preset}
              type="button"
              variant={active ? "default" : "outline"}
              className={cn("h-11 shrink-0", active && "shadow-sm")}
              disabled={pending}
              onClick={() => {
                setShowCustom(false);
                go(preset);
              }}
            >
              {PRESET_LABELS[preset]}
            </Button>
          );
        })}
        <Button
          type="button"
          variant={range.preset === "custom" || showCustom ? "default" : "outline"}
          className="h-11 shrink-0"
          disabled={pending}
          onClick={() => setShowCustom(true)}
        >
          Custom
        </Button>
      </div>

      {showCustom ? (
        <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="dash-from" className="text-xs font-medium">
              From
            </label>
            <Input
              id="dash-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="dash-to" className="text-xs font-medium">
              To
            </label>
            <Input
              id="dash-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-11"
            />
          </div>
          <Button
            type="button"
            className="h-11 w-full sm:w-auto"
            disabled={pending || !customFrom || !customTo}
            onClick={() => go("custom", { from: customFrom, to: customTo })}
          >
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
}
