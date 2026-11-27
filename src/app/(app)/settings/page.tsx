import { connection } from "next/server";
import { Suspense } from "react";

import { SettingsView } from "@/components/settings/settings-view";
import { getAllAreas } from "@/lib/queries";
import { getOrCreateTelegramSettings } from "@/lib/telegram/settings";

async function SettingsPageContent() {
  await connection();
  const [areas, telegram] = await Promise.all([
    getAllAreas(),
    getOrCreateTelegramSettings(),
  ]);
  return <SettingsView areas={areas} telegram={telegram} />;
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
