"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { fetchDrillTimeLogs } from "@/actions/dashboard";
import { HoursByAreaChart } from "@/components/charts/hours-by-area-chart";
import { TimeLogDrillPanel } from "@/components/dashboard/time-log-drill-panel";
import type { TimeLogDrillRow, WeekAreaHours } from "@/lib/queries";

type HoursByAreaSectionProps = {
  data: WeekAreaHours[];
  rangeStart: string;
  rangeEnd: string;
};

export function HoursByAreaSection({
  data,
  rangeStart,
  rangeEnd,
}: HoursByAreaSectionProps) {
  const [open, setOpen] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [logs, setLogs] = useState<TimeLogDrillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  function openArea(areaId: number) {
    const area = data.find((row) => row.areaId === areaId);
    if (!area) return;
    setAreaName(area.name);
    setOpen(true);
    setLoading(true);
    setLogs([]);

    startTransition(async () => {
      const result = await fetchDrillTimeLogs({
        areaId,
        rangeStart,
        rangeEnd,
      });
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLogs(result.logs);
    });
  }

  return (
    <>
      <div className="rounded-lg border p-3">
        <HoursByAreaChart data={data} onLoggedBarClick={openArea} />
      </div>
      <TimeLogDrillPanel
        open={open}
        onOpenChange={setOpen}
        areaName={areaName}
        logs={logs}
        loading={loading}
      />
    </>
  );
}
