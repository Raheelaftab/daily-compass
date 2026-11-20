"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";

import { logTime } from "@/actions/logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AreaRow, TaskWithArea } from "@/lib/queries";
import { cn } from "@/lib/utils";

const QUICK_MINUTES = [15, 25, 30, 45, 60, 90] as const;
const LAST_AREA_KEY = "dc_last_area_id";

type QuickLogFormProps = {
  areas: AreaRow[];
  openTasks: TaskWithArea[];
};

function readLastAreaId(): string | null {
  try {
    return window.localStorage.getItem(LAST_AREA_KEY);
  } catch {
    return null;
  }
}

function writeLastAreaId(areaId: string) {
  try {
    window.localStorage.setItem(LAST_AREA_KEY, areaId);
  } catch {
    // ignore quota / private mode
  }
}

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function QuickLogForm({ areas, openTasks }: QuickLogFormProps) {
  const defaultArea = areas[0] ? String(areas[0].id) : "";
  const savedAreaId = useSyncExternalStore(
    subscribeToStorage,
    () => {
      const saved = readLastAreaId();
      if (saved && areas.some((area) => String(area.id) === saved)) {
        return saved;
      }
      return defaultArea;
    },
    () => defaultArea,
  );
  const [areaOverride, setAreaOverride] = useState<string | null>(null);
  const areaId = areaOverride ?? savedAreaId;
  const [minutes, setMinutes] = useState("25");
  const [note, setNote] = useState("");
  const [taskId, setTaskId] = useState("");
  const [pending, startTransition] = useTransition();

  const linkedTasks = useMemo(() => {
    if (!areaId) return openTasks;
    const id = Number(areaId);
    return openTasks.filter((task) => task.areaId === id);
  }, [areaId, openTasks]);

  function submit() {
    const mins = Number(minutes);
    if (!areaId) {
      toast.error("Choose an area");
      return;
    }
    if (!Number.isFinite(mins) || mins < 1 || mins > 720) {
      toast.error("Minutes must be between 1 and 720");
      return;
    }

    startTransition(async () => {
      const result = await logTime({
        areaId: Number(areaId),
        minutes: mins,
        note,
        taskId: taskId || undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      writeLastAreaId(areaId);
      toast.success("Time logged");
      setNote("");
      setTaskId("");
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Quick log
      </h2>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Area</span>
          <Select
            value={areaId}
            onValueChange={(value) => {
              if (value) {
                setAreaOverride(value);
                setTaskId("");
              }
            }}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Select area" />
            </SelectTrigger>
            <SelectContent>
              {areas.map((area) => (
                <SelectItem key={area.id} value={String(area.id)}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-minutes" className="text-sm font-medium">
            Minutes
          </label>
          <Input
            id="quick-minutes"
            type="number"
            min={1}
            max={720}
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-11"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_MINUTES.map((value) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                className={cn(
                  "h-11 min-w-11 px-3",
                  minutes === String(value) && "border-foreground",
                )}
                onClick={() => setMinutes(String(value))}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-note" className="text-sm font-medium">
            Note
          </label>
          <Input
            id="quick-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
            className="h-11"
            maxLength={300}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Linked task</span>
          <Select
            value={taskId || "__none__"}
            onValueChange={(value) => {
              if (value === "__none__" || value == null) setTaskId("");
              else setTaskId(value);
            }}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {linkedTasks.map((task) => (
                <SelectItem key={task.id} value={String(task.id)}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          className="h-11 w-full"
          onClick={submit}
          disabled={pending || areas.length === 0}
        >
          {pending ? "Logging…" : "Log time"}
        </Button>
      </div>
    </section>
  );
}
