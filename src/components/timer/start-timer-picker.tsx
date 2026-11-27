"use client";

import { useMemo, useState, useTransition } from "react";
import { Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { startTimer } from "@/actions/timers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { AreaRow, TaskWithArea } from "@/lib/queries";

type StartTimerPickerProps = {
  areas: AreaRow[];
  openTasks: TaskWithArea[];
};

export function StartTimerPicker({ areas, openTasks }: StartTimerPickerProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [areaId, setAreaId] = useState(areas[0] ? String(areas[0].id) : "");
  const [taskId, setTaskId] = useState("");
  const [pending, startTransition] = useTransition();

  const linkedTasks = useMemo(() => {
    if (!areaId) return openTasks;
    const id = Number(areaId);
    return openTasks.filter((task) => task.areaId === id);
  }, [areaId, openTasks]);

  function submit() {
    if (!areaId) {
      toast.error("Choose an area");
      return;
    }
    startTransition(async () => {
      const result = await startTimer({
        areaId: Number(areaId),
        taskId: taskId ? Number(taskId) : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Timer started");
      setOpen(false);
      router.refresh();
    });
  }

  const fields = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Area</span>
        <Select
          value={areaId}
          onValueChange={(value) => {
            if (value == null) return;
            setAreaId(value);
            setTaskId("");
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
        <span className="text-sm font-medium">Task (optional)</span>
        <Select
          value={taskId || "__none__"}
          onValueChange={(value) => {
            if (value == null || value === "__none__") {
              setTaskId("");
              return;
            }
            setTaskId(value);
            const task = openTasks.find((t) => String(t.id) === value);
            if (task) setAreaId(String(task.areaId));
          }}
        >
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="No task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No task</SelectItem>
            {linkedTasks.map((task) => (
              <SelectItem key={task.id} value={String(task.id)}>
                {task.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => setOpen(false)}
        disabled={pending}
      >
        Cancel
      </Button>
      <Button
        type="button"
        className="h-11"
        onClick={submit}
        disabled={pending}
      >
        {pending ? "Starting…" : "Start"}
      </Button>
    </>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => setOpen(true)}
      >
        <Timer className="size-4" />
        Start timer
      </Button>

      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md" showCloseButton>
            <DialogHeader>
              <DialogTitle>Start timer</DialogTitle>
            </DialogHeader>
            {fields}
            <DialogFooter className="gap-2 sm:justify-end">
              {actions}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Start timer</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">{fields}</div>
            <DrawerFooter className="flex-row gap-2">{actions}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
