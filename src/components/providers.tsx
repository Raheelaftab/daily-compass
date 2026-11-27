"use client";

import { ThemeProvider } from "next-themes";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
