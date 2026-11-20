"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { weeklyReviews } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { weekStart } from "@/lib/dates";
import { saveWeeklyReviewSchema } from "@/lib/validators";

export async function saveWeeklyReview(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = saveWeeklyReviewSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid review");
  }

  const start = weekStart(parsed.data.weekStart);

  await db
    .insert(weeklyReviews)
    .values({
      weekStart: start,
      wins: parsed.data.wins || null,
      slipped: parsed.data.slipped || null,
      nextTop3: parsed.data.nextTop3 || null,
    })
    .onConflictDoUpdate({
      target: weeklyReviews.weekStart,
      set: {
        wins: parsed.data.wins || null,
        slipped: parsed.data.slipped || null,
        nextTop3: parsed.data.nextTop3 || null,
      },
    });

  revalidatePath(`/reports/${start}`);
  revalidatePath("/reports");
  return ok();
}
