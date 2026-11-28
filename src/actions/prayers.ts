"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { prayerTimes } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { updatePrayerSettings } from "@/lib/prayer/settings";
import { updatePrayerSettingsSchema } from "@/lib/validators";

export async function savePrayerSettings(
  input: unknown,
): Promise<ActionResult> {
  await requireSession();

  const parsed = updatePrayerSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid prayer settings");
  }

  await updatePrayerSettings(parsed.data);
  // Location/method changes invalidate cached AlAdhan times.
  await db.delete(prayerTimes);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return ok();
}
