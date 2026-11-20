"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { toggleHabit } from "@/actions/habits";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import type { HabitTodayRow } from "@/lib/queries";

type HabitsTodayProps = {
  today: string;
  habits: HabitTodayRow[];
};

export function HabitsToday({ today, habits }: HabitsTodayProps) {
  const [pending, startTransition] = useTransition();
  const [optimisticHabits, applyOptimistic] = useOptimistic(
    habits,
    (current: HabitTodayRow[], action: { id: number; done: boolean }) =>
      current.map((habit) =>
        habit.id === action.id ? { ...habit, done: action.done } : habit,
      ),
  );

  function onToggle(habit: HabitTodayRow) {
    const next = !habit.done;
    startTransition(async () => {
      applyOptimistic({ id: habit.id, done: next });
      const result = await toggleHabit(habit.id, today);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Habit checked" : "Habit unchecked", {
        id: "habit-today-toggle",
        duration: 1500,
      });
    });
  }

  if (optimisticHabits.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Habits today
        </h2>
        <EmptyState>No active habits — add some on the Habits page</EmptyState>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Habits today
      </h2>
      <ul className="divide-y rounded-lg border">
        {optimisticHabits.map((habit) => (
          <li key={habit.id} className="flex items-center gap-3 px-3 py-1">
            <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
              <Checkbox
                checked={habit.done}
                className="size-5"
                disabled={pending}
                aria-label={habit.name}
                onCheckedChange={() => onToggle(habit)}
              />
            </label>
            <span className="flex min-h-11 flex-1 items-center text-sm font-medium">
              {habit.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
