import { Suspense } from "react";

import { MobileBottomNav, MobileTopBar } from "@/components/nav/mobile-nav";
import { Sidebar } from "@/components/nav/sidebar";

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
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
