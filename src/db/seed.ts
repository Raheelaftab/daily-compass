import { config } from "dotenv";

config({ path: ".env.local" });

const AREA_SEED = [
  {
    sortOrder: 1,
    name: "Master's degree",
    slug: "masters",
    color: "purple",
    weeklyTargetMinutes: 180,
  },
  {
    sortOrder: 2,
    name: "Job search",
    slug: "job-search",
    color: "blue",
    weeklyTargetMinutes: 150,
  },
  {
    sortOrder: 3,
    name: "Rinoviy",
    slug: "rinoviy",
    color: "teal",
    weeklyTargetMinutes: 150,
  },
  {
    sortOrder: 4,
    name: "Dubai office",
    slug: "dubai-office",
    color: "orange",
    weeklyTargetMinutes: null,
  },
  {
    sortOrder: 5,
    name: "Hungry Theory",
    slug: "hungry-theory",
    color: "red",
    weeklyTargetMinutes: 60,
  },
  {
    sortOrder: 6,
    name: "Family",
    slug: "family",
    color: "green",
    weeklyTargetMinutes: null,
  },
  {
    sortOrder: 7,
    name: "Health & habits",
    slug: "health",
    color: "yellow",
    weeklyTargetMinutes: 60,
  },
  {
    sortOrder: 8,
    name: "Personal",
    slug: "personal",
    color: "gray",
    weeklyTargetMinutes: null,
  },
] as const;

const HABIT_SEED = [
  { name: "Healthy breakfast", sortOrder: 1 },
  { name: "No junk food after 9pm", sortOrder: 2 },
  { name: "8 glasses of water", sortOrder: 3 },
  { name: "20-minute walk", sortOrder: 4 },
] as const;

async function seed() {
  // Dynamic imports so dotenv loads before DATABASE_URL is read.
  const { eq } = await import("drizzle-orm");
  const { db } = await import("./index");
  const { areas, habits } = await import("./schema");

  for (const area of AREA_SEED) {
    await db
      .insert(areas)
      .values({
        name: area.name,
        slug: area.slug,
        color: area.color,
        weeklyTargetMinutes: area.weeklyTargetMinutes,
        sortOrder: area.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: areas.slug,
        set: {
          name: area.name,
          color: area.color,
          weeklyTargetMinutes: area.weeklyTargetMinutes,
          sortOrder: area.sortOrder,
          isActive: true,
        },
      });
  }

  const [healthArea] = await db
    .select()
    .from(areas)
    .where(eq(areas.slug, "health"))
    .limit(1);

  if (!healthArea) {
    throw new Error('Seed failed: area with slug "health" not found');
  }

  for (const habit of HABIT_SEED) {
    const [existing] = await db
      .select()
      .from(habits)
      .where(eq(habits.name, habit.name))
      .limit(1);

    if (existing) {
      await db
        .update(habits)
        .set({
          areaId: healthArea.id,
          isActive: true,
          sortOrder: habit.sortOrder,
        })
        .where(eq(habits.id, existing.id));
    } else {
      await db.insert(habits).values({
        name: habit.name,
        areaId: healthArea.id,
        isActive: true,
        sortOrder: habit.sortOrder,
      });
    }
  }

  console.log("Seed complete: 8 areas, 4 habits");
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
