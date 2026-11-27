import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline · Daily Compass",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        Daily Compass
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground">
        Reconnect to load your tasks, logs, and dashboard. Nothing is synced while
        offline.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
      >
        Try again
      </Link>
    </main>
  );
}
