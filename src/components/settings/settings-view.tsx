"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateArea } from "@/actions/areas";
import { savePrayerSettings } from "@/actions/prayers";
import { updateTelegramDigests } from "@/actions/telegram";
import { AREA_COLOR_OPTIONS, areaDotClass } from "@/lib/areas";
import type { PrayerSettingsRow } from "@/lib/prayer/settings";
import { ASR_SCHOOLS, CALCULATION_METHODS } from "@/lib/prayer/types";
import type { AreaRow } from "@/lib/queries";
import type { TelegramSettingsRow } from "@/lib/telegram/settings";
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
  telegram: TelegramSettingsRow;
  prayer: PrayerSettingsRow;
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

export function SettingsView({ areas, telegram, prayer }: SettingsViewProps) {
  const [forms, setForms] = useState<Record<number, AreaFormState>>(() =>
    Object.fromEntries(areas.map((area) => [area.id, toFormState(area)])),
  );
  const [morningDigest, setMorningDigest] = useState(telegram.morningDigest);
  const [eveningNudge, setEveningNudge] = useState(telegram.eveningNudge);
  const [prayerForm, setPrayerForm] = useState({
    city: prayer.city,
    state: prayer.state,
    country: prayer.country,
    latitude: prayer.latitude || "39.437",
    longitude: prayer.longitude || "-76.62",
    method: String(prayer.method),
    school: String(prayer.school),
    snoozeOptionAMinutes: String(prayer.snoozeOptionAMinutes),
    snoozeOptionBMinutes: String(prayer.snoozeOptionBMinutes),
    reRemindIntervalMinutes: String(prayer.reRemindIntervalMinutes),
    fajrEnabled: prayer.fajrEnabled,
    dhuhrEnabled: prayer.dhuhrEnabled,
    asrEnabled: prayer.asrEnabled,
    maghribEnabled: prayer.maghribEnabled,
    ishaEnabled: prayer.ishaEnabled,
  });
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [digestPending, setDigestPending] = useState(false);
  const [prayerPending, setPrayerPending] = useState(false);
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

  function onSaveDigests() {
    setDigestPending(true);
    startTransition(async () => {
      const result = await updateTelegramDigests({
        morningDigest,
        eveningNudge,
      });
      setDigestPending(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Telegram digests updated");
    });
  }

  function onSavePrayer() {
    setPrayerPending(true);
    startTransition(async () => {
      const result = await savePrayerSettings({
        city: prayerForm.city,
        state: prayerForm.state,
        country: prayerForm.country,
        latitude: prayerForm.latitude,
        longitude: prayerForm.longitude,
        method: Number(prayerForm.method),
        school: Number(prayerForm.school),
        snoozeOptionAMinutes: Number(prayerForm.snoozeOptionAMinutes),
        snoozeOptionBMinutes: Number(prayerForm.snoozeOptionBMinutes),
        reRemindIntervalMinutes: Number(prayerForm.reRemindIntervalMinutes),
        fajrEnabled: prayerForm.fajrEnabled,
        dhuhrEnabled: prayerForm.dhuhrEnabled,
        asrEnabled: prayerForm.asrEnabled,
        maghribEnabled: prayerForm.maghribEnabled,
        ishaEnabled: prayerForm.ishaEnabled,
      });
      setPrayerPending(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Prayer settings saved");
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Edit life areas, Telegram digests, and prayer reminders
        </p>
      </div>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Prayer reminders
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Times from AlAdhan by coordinates (Timonium 39.437, -76.62; ISNA +
            Standard/Shafi). Reminders go to Telegram via cron-job.org.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer-city" className="text-sm font-medium">
              City
            </label>
            <Input
              id="prayer-city"
              value={prayerForm.city}
              onChange={(e) =>
                setPrayerForm((p) => ({ ...p, city: e.target.value }))
              }
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer-state" className="text-sm font-medium">
              State
            </label>
            <Input
              id="prayer-state"
              value={prayerForm.state}
              onChange={(e) =>
                setPrayerForm((p) => ({ ...p, state: e.target.value }))
              }
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer-country" className="text-sm font-medium">
              Country
            </label>
            <Input
              id="prayer-country"
              value={prayerForm.country}
              onChange={(e) =>
                setPrayerForm((p) => ({ ...p, country: e.target.value }))
              }
              className="h-11"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer-lat" className="text-sm font-medium">
              Latitude
            </label>
            <Input
              id="prayer-lat"
              value={prayerForm.latitude}
              onChange={(e) =>
                setPrayerForm((p) => ({ ...p, latitude: e.target.value }))
              }
              placeholder="39.437"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer-lon" className="text-sm font-medium">
              Longitude
            </label>
            <Input
              id="prayer-lon"
              value={prayerForm.longitude}
              onChange={(e) =>
                setPrayerForm((p) => ({ ...p, longitude: e.target.value }))
              }
              placeholder="-76.62"
              className="h-11"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Calculation method</span>
            <Select
              value={prayerForm.method}
              onValueChange={(value) => {
                if (value) setPrayerForm((p) => ({ ...p, method: value }));
              }}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALCULATION_METHODS.map((method) => (
                  <SelectItem key={method.id} value={String(method.id)}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Asr school</span>
            <Select
              value={prayerForm.school}
              onValueChange={(value) => {
                if (value) setPrayerForm((p) => ({ ...p, school: value }));
              }}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASR_SCHOOLS.map((school) => (
                  <SelectItem key={school.id} value={String(school.id)}>
                    {school.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer-snooze-a" className="text-sm font-medium">
              Snooze A (min)
            </label>
            <Input
              id="prayer-snooze-a"
              type="number"
              min={1}
              max={180}
              value={prayerForm.snoozeOptionAMinutes}
              onChange={(e) =>
                setPrayerForm((p) => ({
                  ...p,
                  snoozeOptionAMinutes: e.target.value,
                }))
              }
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer-snooze-b" className="text-sm font-medium">
              Snooze B (min)
            </label>
            <Input
              id="prayer-snooze-b"
              type="number"
              min={1}
              max={180}
              value={prayerForm.snoozeOptionBMinutes}
              onChange={(e) =>
                setPrayerForm((p) => ({
                  ...p,
                  snoozeOptionBMinutes: e.target.value,
                }))
              }
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prayer-reremind" className="text-sm font-medium">
              Re-remind (min)
            </label>
            <Input
              id="prayer-reremind"
              type="number"
              min={1}
              max={180}
              value={prayerForm.reRemindIntervalMinutes}
              onChange={(e) =>
                setPrayerForm((p) => ({
                  ...p,
                  reRemindIntervalMinutes: e.target.value,
                }))
              }
              className="h-11"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["fajrEnabled", "Fajr"],
              ["dhuhrEnabled", "Dhuhr"],
              ["asrEnabled", "Asr"],
              ["maghribEnabled", "Maghrib"],
              ["ishaEnabled", "Isha"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex min-h-11 items-center gap-3">
              <Checkbox
                id={`prayer-${key}`}
                checked={prayerForm[key]}
                onCheckedChange={(checked) =>
                  setPrayerForm((p) => ({ ...p, [key]: Boolean(checked) }))
                }
                className="size-5"
              />
              <label htmlFor={`prayer-${key}`} className="text-sm font-medium">
                Remind for {label}
              </label>
            </div>
          ))}
        </div>

        <Button
          type="button"
          className="h-11"
          onClick={onSavePrayer}
          disabled={prayerPending}
        >
          {prayerPending ? "Saving…" : "Save prayer settings"}
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Telegram digests
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {telegram.chatId
              ? "Bot is paired. Toggle morning/evening messages."
              : "Bot not paired yet — send /start <PAIR_CODE> in Telegram first."}
          </p>
        </div>
        <div className="flex min-h-11 items-center gap-3">
          <Checkbox
            id="telegram-morning"
            checked={morningDigest}
            onCheckedChange={(checked) => setMorningDigest(Boolean(checked))}
            className="size-5"
          />
          <label htmlFor="telegram-morning" className="text-sm font-medium">
            Morning digest
          </label>
        </div>
        <div className="flex min-h-11 items-center gap-3">
          <Checkbox
            id="telegram-evening"
            checked={eveningNudge}
            onCheckedChange={(checked) => setEveningNudge(Boolean(checked))}
            className="size-5"
          />
          <label htmlFor="telegram-evening" className="text-sm font-medium">
            Evening nudge
          </label>
        </div>
        <Button
          type="button"
          className="h-11"
          onClick={onSaveDigests}
          disabled={digestPending}
        >
          {digestPending ? "Saving…" : "Save digests"}
        </Button>
      </section>

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
