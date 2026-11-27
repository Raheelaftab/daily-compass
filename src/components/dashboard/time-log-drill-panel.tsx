"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatMinutes } from "@/lib/dates";
import type { TimeLogDrillRow } from "@/lib/queries";

type TimeLogDrillPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaName: string;
  logs: TimeLogDrillRow[];
  loading: boolean;
};

export function TimeLogDrillPanel({
  open,
  onOpenChange,
  areaName,
  logs,
  loading,
}: TimeLogDrillPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const title = `Time logs · ${areaName}`;

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      {loading ? (
        <div className="space-y-3 p-4">
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-4">
          <EmptyState>No time logged for this area in range</EmptyState>
        </div>
      ) : (
        <ul className="divide-y overflow-y-auto">
          {logs.map((log) => (
            <li key={log.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{log.logDate}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {log.taskTitle ?? "No linked task"}
                    {log.note ? ` · ${log.note}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums font-medium">
                  {formatMinutes(log.minutes)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
