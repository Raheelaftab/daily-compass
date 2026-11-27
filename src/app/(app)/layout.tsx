import { connection } from "next/server";
import { Suspense } from "react";

import { MobileBottomNav, MobileTopBar } from "@/components/nav/mobile-nav";
import { Sidebar } from "@/components/nav/sidebar";
import { getRunningTimer } from "@/lib/timer-ops";

// Authenticated shell uses pathname + request-time data; allow blocking for now.
export const instant = false;

function SidebarFallback() {
  return (
    <aside className="hidden md:block md:w-56 md:border-r md:bg-sidebar" />
  );
}

function MobileNavFallback() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 h-14 border-t bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    />
  );
}

function MobileTopBarFallback() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/95 px-4 md:hidden">
      <div className="h-5 w-28 animate-pulse rounded bg-muted" />
    </header>
  );
}

async function AppChrome({ children }: { children: React.ReactNode }) {
  await connection();
  const timer = await getRunningTimer();

  return (
    <div className="flex min-h-full flex-1">
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar timer={timer} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<MobileTopBarFallback />}>
          <MobileTopBar timer={timer} />
        </Suspense>
        <main
          id="main"
          className="flex-1 px-4 py-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6"
        >
          {children}
        </main>
        <Suspense fallback={<MobileNavFallback />}>
          <MobileBottomNav />
        </Suspense>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1">
          <SidebarFallback />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBarFallback />
            <main className="flex-1 px-4 py-4 md:px-6">{children}</main>
            <MobileNavFallback />
          </div>
        </div>
      }
    >
      <AppChrome>{children}</AppChrome>
    </Suspense>
  );
}
