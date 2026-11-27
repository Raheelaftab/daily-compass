"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Leaf,
  MoreHorizontal,
  FileText,
  Settings,
} from "lucide-react";

import { logout } from "@/actions/auth";
import { TimerPill } from "@/components/timer/timer-pill";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RunningTimer } from "@/lib/timer-ops";
import { cn } from "@/lib/utils";

const tabLinks = [
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Leaf },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

type MobileTopBarProps = {
  timer: RunningTimer | null;
};

export function MobileTopBar({ timer }: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <Link
        href="/"
        className="shrink-0 text-base font-semibold tracking-tight"
      >
        Daily Compass
      </Link>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        <TimerPill timer={timer} className="min-w-0" />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="More"
            >
              <MoreHorizontal className="size-5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            className="min-h-11"
            render={<Link href="/reports" />}
          >
            <FileText className="size-4" />
            Reports
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11"
            render={<Link href="/settings" />}
          >
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11"
            onClick={() => {
              void logout();
            }}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {tabLinks.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
