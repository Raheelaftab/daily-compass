"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveWeeklyReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WeeklyReviewData } from "@/lib/queries";

type ReviewFormProps = {
  weekStart: string;
  initial: WeeklyReviewData;
};

export function ReviewForm({ weekStart, initial }: ReviewFormProps) {
  const [wins, setWins] = useState(initial.wins);
  const [slipped, setSlipped] = useState(initial.slipped);
  const [nextTop3, setNextTop3] = useState(initial.nextTop3);
  const [pending, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const result = await saveWeeklyReview({
        weekStart,
        wins,
        slipped,
        nextTop3,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Review saved");
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Weekly review
      </h2>
      <div className="space-y-4 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="review-wins" className="text-sm font-medium">
            Wins
          </label>
          <Textarea
            id="review-wins"
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            rows={3}
            placeholder="What went well?"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="review-slipped" className="text-sm font-medium">
            What slipped
          </label>
          <Textarea
            id="review-slipped"
            value={slipped}
            onChange={(e) => setSlipped(e.target.value)}
            rows={3}
            placeholder="What got away?"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="review-next" className="text-sm font-medium">
            Next week&apos;s top 3
          </label>
          <Textarea
            id="review-next"
            value={nextTop3}
            onChange={(e) => setNextTop3(e.target.value)}
            rows={3}
            placeholder="Focus for next week"
          />
        </div>
        <Button
          type="button"
          className="h-11 w-full sm:w-auto"
          onClick={onSave}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save review"}
        </Button>
      </div>
    </section>
  );
}
