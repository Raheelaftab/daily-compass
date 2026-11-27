"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { updateTelegramDigestToggles } from "@/lib/telegram/settings";
import { updateTelegramDigestsSchema } from "@/lib/validators";

export async function updateTelegramDigests(
  input: unknown,
): Promise<ActionResult> {
  await requireSession();

  const parsed = updateTelegramDigestsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid settings");
  }

  await updateTelegramDigestToggles(parsed.data);
  revalidatePath("/settings");
  return ok();
}
