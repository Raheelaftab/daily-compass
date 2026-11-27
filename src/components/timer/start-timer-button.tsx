"use client";

import { useTransition } from "react";
import { Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { startTimer } from "@/actions/timers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StartTimerButtonProps = {
  areaId?: number;
  taskId?: number;
  label?: string;
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "default" | "sm" | "icon";
};

export function StartTimerButton({
  areaId,
  taskId,
  label = "Start timer",
  className,
  variant = "ghost",
  size = "default",
}: StartTimerButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await startTimer({ areaId, taskId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Timer started");
      router.refresh();
    });
  }

  if (size === "icon") {
    return (
      <Button
        type="button"
        variant={variant}
        size="icon"
        className={cn("size-11", className)}
        aria-label={label}
        disabled={pending || (areaId == null && taskId == null)}
        onClick={onClick}
      >
        <Timer className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn("h-11", className)}
      disabled={pending || (areaId == null && taskId == null)}
      onClick={onClick}
    >
      <Timer className="size-4" />
      {pending ? "Starting…" : label}
    </Button>
  );
}
