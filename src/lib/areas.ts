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

export function areaDotClass(color: string, className?: string): string {
  return cn(
    "inline-block size-2.5 shrink-0 rounded-full",
    AREA_DOT_CLASS[color] ?? "bg-muted-foreground",
    className,
  );
}
