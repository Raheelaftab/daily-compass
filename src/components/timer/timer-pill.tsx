"use client";

import { useSyncExternalStore, useTransition } from "react";
import { Square } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { stopTimer } from "@/actions/timers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMinutes } from "@/lib/dates";
import type { RunningTimer } from "@/lib/timer-ops";
import {
  elapsedMinutes,
  formatElapsedClock,
  needsStopConfirmation,
} from "@/lib/timer";
import { cn } from "@/lib/utils";
import { useState } from "react";

type TimerPillProps = {
  timer: RunningTimer | null;
  className?: string;
};

function subscribeSeconds(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(id);
}

function getNowMs() {
  return Date.now();
}

export function TimerPill({ timer, className }: TimerPillProps) {
  const router = useRouter();
  const startedMs = timer ? new Date(timer.startedAt).getTime() : 0;
  const nowMs = useSyncExternalStore(
    subscribeSeconds,
    getNowMs,
    () => startedMs,
  );
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [minutesInput, setMinutesInput] = useState("360");

  if (!timer) return null;

  const startedAt = new Date(timer.startedAt);
  const now = new Date(nowMs);
  const label = timer.taskTitle ?? timer.areaName;
  const clock = formatElapsedClock(startedAt, now);

  function finishStop(minutes?: number) {
    startTransition(async () => {
      const result = await stopTimer(minutes != null ? { minutes } : {});
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      if (result.logged) {
        toast.success(`Logged ${formatMinutes(result.logged.minutes)}`);
      } else {
        toast.message("No timer was running");
      }
      router.refresh();
    });
  }

  function onStopClick() {
    const current = new Date();
    if (needsStopConfirmation(startedAt, current)) {
      setMinutesInput(String(elapsedMinutes(startedAt, current)));
      setConfirmOpen(true);
      return;
    }
    finishStop();
  }

  return (
    <>
      <div
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-full border bg-background px-2 py-1 text-xs shadow-sm",
          className,
        )}
      >
        <span className="min-w-0 truncate font-medium" title={label}>
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {clock}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0"
          aria-label="Stop timer"
          disabled={pending}
          onClick={onStopClick}
        >
          <Square className="size-3.5 fill-current" />
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton>
          <DialogHeader>
            <DialogTitle>Timer ran over 6 hours</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirm how many minutes to log before stopping.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="timer-stop-minutes" className="text-sm font-medium">
              Minutes
            </label>
            <Input
              id="timer-stop-minutes"
              type="number"
              min={1}
              max={720}
              value={minutesInput}
              onChange={(e) => setMinutesInput(e.target.value)}
              className="h-11"
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11"
              disabled={pending}
              onClick={() => {
                const mins = Number(minutesInput);
                if (!Number.isFinite(mins) || mins < 1 || mins > 720) {
                  toast.error("Enter minutes between 1 and 720");
                  return;
                }
                finishStop(Math.round(mins));
              }}
            >
              {pending ? "Saving…" : "Stop & log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
