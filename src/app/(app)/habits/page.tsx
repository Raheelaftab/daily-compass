import { connection } from "next/server";
import { Suspense } from "react";

import { HabitsView } from "@/components/habits/habits-view";
import { getHabitGrid } from "@/lib/queries";

async function HabitsPageContent() {
  await connection();
  const data = await getHabitGrid();
  return <HabitsView data={data} />;
}

export default function HabitsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </div>
      }
    >
      <HabitsPageContent />
    </Suspense>
  );
}
