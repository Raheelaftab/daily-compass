import { addDays } from "@/lib/dates";

/**
 * Current streak: consecutive done days ending today,
 * or ending yesterday if today is not yet checked.
 */
export function currentStreak(
  doneDates: Set<string>,
  today: string,
): number {
  const todayDone = doneDates.has(today);
  let cursor = todayDone ? today : addDays(today, -1);

  if (!doneDates.has(cursor)) {
    return 0;
  }

  let streak = 0;
  while (doneDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest consecutive run of done days in the given set. */
export function bestStreak(doneDates: Set<string>): number {
  if (doneDates.size === 0) return 0;

  const sorted = [...doneDates].sort();
  let best = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev && curr && addDays(prev, 1) === curr) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  return best;
}
