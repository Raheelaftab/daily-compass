"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateArea } from "@/actions/areas";
import { AREA_COLOR_OPTIONS, areaDotClass } from "@/lib/areas";
import type { AreaRow } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SettingsViewProps = {
  areas: AreaRow[];
};

type AreaFormState = {
  name: string;
  color: string;
  weeklyTargetHours: string;
  isActive: boolean;
  sortOrder: string;
};

function toFormState(area: AreaRow): AreaFormState {
  return {
    name: area.name,
    color: area.color,
    weeklyTargetHours:
      area.weeklyTargetMinutes != null
        ? String(Math.round((area.weeklyTargetMinutes / 60) * 100) / 100)
        : "",
    isActive: area.isActive,
    sortOrder: String(area.sortOrder),
  };
}

export function SettingsView({ areas }: SettingsViewProps) {
  const [forms, setForms] = useState<Record<number, AreaFormState>>(() =>
    Object.fromEntries(areas.map((area) => [area.id, toFormState(area)])),
  );
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function updateForm(id: number, patch: Partial<AreaFormState>) {
    setForms((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, ...patch },
    }));
  }

  function onSave(area: AreaRow) {
    const form = forms[area.id];
    if (!form) return;

    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setPendingId(area.id);
    startTransition(async () => {
      const result = await updateArea({
        id: area.id,
        name: form.name,
        color: form.color,
        weeklyTargetHours: form.weeklyTargetHours,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
      });
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${form.name} updated`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Edit life areas, colors, and weekly hour targets
        </p>
      </div>

      {areas.length === 0 ? (
        <EmptyState className="py-10">No areas yet</EmptyState>
      ) : (
        <ul className="space-y-4">
          {areas.map((area) => {
            const form = forms[area.id] ?? toFormState(area);
            const saving = pending && pendingId === area.id;
            return (
              <li key={area.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <span className={areaDotClass(form.color)} />
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {area.slug}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label
                      htmlFor={`area-name-${area.id}`}
                      className="text-sm font-medium"
                    >
                      Name
                    </label>
                    <Input
                      id={`area-name-${area.id}`}
                      value={form.name}
                      onChange={(e) =>
                        updateForm(area.id, { name: e.target.value })
                      }
                      className="h-11"
                      maxLength={60}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Color</span>
                    <Select
                      value={form.color}
                      onValueChange={(value) => {
                        if (value) updateForm(area.id, { color: value });
                      }}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_COLOR_OPTIONS.map((color) => (
                          <SelectItem key={color} value={color}>
                            <span className="inline-flex items-center gap-2 capitalize">
                              <span className={areaDotClass(color)} />
                              {color}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`area-target-${area.id}`}
                      className="text-sm font-medium"
                    >
                      Weekly target (hours)
                    </label>
                    <Input
                      id={`area-target-${area.id}`}
                      type="number"
                      min={0}
                      max={168}
                      step={0.25}
                      inputMode="decimal"
                      value={form.weeklyTargetHours}
                      onChange={(e) =>
                        updateForm(area.id, {
                          weeklyTargetHours: e.target.value,
                        })
                      }
                      placeholder="Log only"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for log-only
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`area-order-${area.id}`}
                      className="text-sm font-medium"
                    >
                      Sort order
                    </label>
                    <Input
                      id={`area-order-${area.id}`}
                      type="number"
                      min={0}
                      value={form.sortOrder}
                      onChange={(e) =>
                        updateForm(area.id, { sortOrder: e.target.value })
                      }
                      className="h-11"
                    />
                  </div>

                  <div className="flex min-h-11 items-center gap-3">
                    <Checkbox
                      id={`area-active-${area.id}`}
                      checked={form.isActive}
                      onCheckedChange={(checked) =>
                        updateForm(area.id, { isActive: Boolean(checked) })
                      }
                      className="size-5"
                    />
                    <label
                      htmlFor={`area-active-${area.id}`}
                      className="text-sm font-medium"
                    >
                      Active
                    </label>
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-11 w-full sm:w-auto"
                  onClick={() => onSave(area)}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save area"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
