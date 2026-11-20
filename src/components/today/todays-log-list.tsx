"use client";

import { useOptimistic, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTimeLog } from "@/actions/logs";
import { areaDotClass } from "@/lib/areas";
import { formatMinutes } from "@/lib/dates";
import type { TimeLogWithMeta } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type TodaysLogListProps = {
  logs: TimeLogWithMeta[];
};

export function TodaysLogList({ logs }: TodaysLogListProps) {
  const [pending, startTransition] = useTransition();
  const [optimisticLogs, removeOptimistic] = useOptimistic(
    logs,
    (current: TimeLogWithMeta[], id: number) =>
      current.filter((log) => log.id !== id),
  );

  function onDelete(id: number) {
    startTransition(async () => {
      removeOptimistic(id);
      const result = await deleteTimeLog({ id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Log deleted");
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Today&apos;s log
      </h2>

      {optimisticLogs.length === 0 ? (
        <EmptyState>No time logged yet today</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border">
          {optimisticLogs.map((log) => (
            <li
              key={log.id}
              className="flex items-start gap-3 px-3 py-3"
            >
              <span className={areaDotClass(log.areaColor, "mt-1.5")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{log.areaName}</p>
                  <p className="shrink-0 text-sm font-medium tabular-nums">
                    {formatMinutes(log.minutes)}
                  </p>
                </div>
                {log.taskTitle ? (
                  <p className="text-xs text-muted-foreground">{log.taskTitle}</p>
                ) : null}
                {log.note ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{log.note}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Delete log"
                disabled={pending}
                onClick={() => onDelete(log.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
