import { connection } from "next/server";
import { Suspense } from "react";

import { SettingsView } from "@/components/settings/settings-view";
import { getAllAreas } from "@/lib/queries";

async function SettingsPageContent() {
  await connection();
  const areas = await getAllAreas();
  return <SettingsView areas={areas} />;
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
