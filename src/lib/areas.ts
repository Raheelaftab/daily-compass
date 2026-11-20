import { cn } from "@/lib/utils";

/** Map seed area color names to Tailwind background classes for dots/badges. */
const AREA_DOT_CLASS: Record<string, string> = {
  purple: "bg-purple-500",
  blue: "bg-blue-500",
  teal: "bg-teal-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
};

/** Hex colors for chart bars (aligned with area color names). */
const AREA_HEX: Record<string, string> = {
  purple: "#a855f7",
  blue: "#3b82f6",
  teal: "#14b8a6",
  orange: "#f97316",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
};

export function areaDotClass(color: string, className?: string): string {
  return cn(
    "inline-block size-2.5 shrink-0 rounded-full",
    AREA_DOT_CLASS[color] ?? "bg-muted-foreground",
    className,
  );
}

export function areaHex(color: string): string {
  return AREA_HEX[color] ?? "#737373";
}

export const AREA_COLOR_OPTIONS = [
  "purple",
  "blue",
  "teal",
  "orange",
  "red",
  "green",
  "yellow",
] as const;

export type AreaColorName = (typeof AREA_COLOR_OPTIONS)[number];

