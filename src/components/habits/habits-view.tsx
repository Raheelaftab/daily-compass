"use client";

import { useOptimistic, useState, useTransition } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { createHabit, toggleHabit, updateHabit } from "@/actions/habits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { HabitGridData, HabitGridRow } from "@/lib/queries";
import { cn } from "@/lib/utils";

type HabitsViewProps = {
  data: HabitGridData;
};

type OptimisticGrid = HabitGridData;

export function HabitsView({ data }: HabitsViewProps) {
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [renameHabit, setRenameHabit] = useState<HabitGridRow | null>(null);
  const [optimistic, applyOptimistic] = useOptimistic(
    data,
    (
      current: OptimisticGrid,
      action:
        | { type: "toggle"; habitId: number; date: string }
        | { type: "rename"; habitId: number; name: string }
        | { type: "remove"; habitId: number },
    ): OptimisticGrid => {
      if (action.type === "remove") {
        return {
          ...current,
          habits: current.habits.filter((habit) => habit.id !== action.habitId),
        };
      }
      if (action.type === "rename") {
        return {
          ...current,
          habits: current.habits.map((habit) =>
            habit.id === action.habitId
              ? { ...habit, name: action.name }
              : habit,
          ),
        };
      }
      return {
        ...current,
        habits: current.habits.map((habit) => {
          if (habit.id !== action.habitId) return habit;
          const nextDone = !habit.checks[action.date];
          return {
            ...habit,
            checks: { ...habit.checks, [action.date]: nextDone },
          };
        }),
      };
    },
  );

  function onToggleCell(habitId: number, date: string) {
    startTransition(async () => {
      applyOptimistic({ type: "toggle", habitId, date });
      const result = await toggleHabit(habitId, date);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  }

  function onDeactivate(habit: HabitGridRow) {
    if (!window.confirm(`Deactivate “${habit.name}”?`)) return;
    startTransition(async () => {
      applyOptimistic({ type: "remove", habitId: habit.id });
      const result = await updateHabit({ id: habit.id, isActive: false });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Habit deactivated");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground">
            Week of {optimistic.weekStart}
          </p>
        </div>
        <Button
          type="button"
          className="h-11 gap-1.5"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {optimistic.habits.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No habits yet — add your first one
        </p>
      ) : (
        <div className="space-y-3">
          {/* Day header */}
          <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,2rem)] items-center gap-1 px-1 text-[10px] font-medium text-muted-foreground sm:grid-cols-[minmax(0,1.2fr)_repeat(7,2.25rem)_auto]">
            <span className="sr-only sm:not-sr-only sm:truncate">Habit</span>
            {optimistic.days.map((day) => (
              <span
                key={day.date}
                className={cn(
                  "text-center",
                  day.date === optimistic.today && "text-foreground",
                )}
              >
                {day.label}
              </span>
            ))}
            <span className="hidden text-right sm:block">Streak</span>
          </div>

          <ul className="space-y-2">
            {optimistic.habits.map((habit) => (
              <li
                key={habit.id}
                className="rounded-lg border px-2 py-2 sm:px-3"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,2rem)] items-center gap-1 sm:grid-cols-[minmax(0,1.2fr)_repeat(7,2.25rem)_auto]">
                  <div className="flex min-w-0 items-center gap-1 pr-1">
                    <p className="truncate text-sm font-medium">{habit.name}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0"
                            aria-label={`${habit.name} actions`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="min-w-40">
                        <DropdownMenuItem
                          className="min-h-11"
                          onClick={() => setRenameHabit(habit)}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="min-h-11"
                          variant="destructive"
                          onClick={() => onDeactivate(habit)}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {optimistic.days.map((day) => {
                    const done = habit.checks[day.date] === true;
                    return (
                      <div key={day.date} className="flex justify-center">
                        <Checkbox
                          checked={done}
                          className="size-5"
                          disabled={pending}
                          aria-label={`${habit.name} ${day.label}`}
                          onCheckedChange={() =>
                            onToggleCell(habit.id, day.date)
                          }
                        />
                      </div>
                    );
                  })}

                  <div className="col-span-8 mt-1 flex justify-between text-xs text-muted-foreground sm:col-span-1 sm:mt-0 sm:block sm:text-right">
                    <span>
                      Now {habit.currentStreak}
                      <span className="sm:hidden">
                        {" "}
                        · Best {habit.bestStreak}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      Best {habit.bestStreak}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <HabitNameDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add habit"
        confirmLabel="Add habit"
        onSubmit={(name) => {
          startTransition(async () => {
            const result = await createHabit({ name });
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Habit added");
            setAddOpen(false);
          });
        }}
      />

      <HabitNameDialog
        open={renameHabit != null}
        onOpenChange={(open) => {
          if (!open) setRenameHabit(null);
        }}
        title="Rename habit"
        confirmLabel="Save"
        initialName={renameHabit?.name ?? ""}
        formKey={renameHabit ? `rename-${renameHabit.id}` : "rename"}
        onSubmit={(name) => {
          if (!renameHabit) return;
          const id = renameHabit.id;
          startTransition(async () => {
            applyOptimistic({ type: "rename", habitId: id, name });
            const result = await updateHabit({ id, name });
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success("Habit renamed");
            setRenameHabit(null);
          });
        }}
      />
    </div>
  );
}

function HabitNameDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  initialName = "",
  formKey = "create",
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  initialName?: string;
  formKey?: string;
  onSubmit: (name: string) => void;
}) {
  if (!open) return null;

  return (
    <HabitNameDialogInner
      key={formKey}
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      confirmLabel={confirmLabel}
      initialName={initialName}
      onSubmit={onSubmit}
    />
  );
}

function HabitNameDialogInner({
  open,
  onOpenChange,
  title,
  confirmLabel,
  initialName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  initialName: string;
  onSubmit: (name: string) => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [name, setName] = useState(initialName);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    onSubmit(trimmed);
  }

  const fields = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="habit-name" className="text-sm font-medium">
        Name
      </label>
      <Input
        id="habit-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-11"
        maxLength={100}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
    </div>
  );

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button type="button" className="h-11" onClick={submit}>
        {confirmLabel}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {fields}
          <DialogFooter className="gap-2 sm:justify-end">{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-2">{fields}</div>
        <DrawerFooter className="flex-row gap-2">{actions}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
