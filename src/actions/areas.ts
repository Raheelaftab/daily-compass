"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { areas } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { updateAreaSchema } from "@/lib/validators";

function revalidateAreaPaths() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/settings");
}

export async function updateArea(input: unknown): Promise<ActionResult> {
  await requireSession();

  const parsed = updateAreaSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid area");
  }

  const { id, name, color, weeklyTargetHours, isActive, sortOrder } =
    parsed.data;

  const [existing] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(eq(areas.id, id))
    .limit(1);

  if (!existing) {
    return fail("Area not found");
  }

  const weeklyTargetMinutes =
    weeklyTargetHours === ""
      ? null
      : Math.round(Number(weeklyTargetHours) * 60);

  await db
    .update(areas)
    .set({
      name,
      color,
      weeklyTargetMinutes,
      isActive,
      sortOrder,
    })
    .where(eq(areas.id, id));

  revalidateAreaPaths();
  return ok();
}
