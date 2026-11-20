"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { toggleHabit } from "@/actions/habits";
import { Checkbox } from "@/components/ui/checkbox";
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
    });
  }

  if (optimisticHabits.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Habits today
        </h2>
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          No active habits — add some on the Habits page
        </p>
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
          <li key={habit.id} className="flex items-center gap-3 px-3 py-2">
            <Checkbox
              checked={habit.done}
              className="size-5"
              disabled={pending}
              aria-label={habit.name}
              onCheckedChange={() => onToggle(habit)}
            />
            <span className="min-h-11 flex flex-1 items-center text-sm font-medium">
              {habit.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
