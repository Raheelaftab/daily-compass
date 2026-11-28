import { addDays, todayStr } from "@/lib/dates";
import { logPrayerError } from "@/lib/prayer/errors";
import {
  claimReminderMinute,
  ensurePrayerLogsForDate,
  getPrayerLog,
  markPrayerMissed,
  type PrayerLogRow,
} from "@/lib/prayer/log";
import {
  getOrCreatePrayerSettings,
  isPrayerEnabled,
  type PrayerSettingsRow,
} from "@/lib/prayer/settings";
import { ensurePrayerTimesForDate } from "@/lib/prayer/times";
import {
  PRAYER_LABELS,
  PRAYER_NAMES,
  type DayPrayerTimes,
  type PrayerName,
} from "@/lib/prayer/types";
import {
  decideReminderAction,
  minuteKey,
  prayerCutoff,
  wallClockToDate,
} from "@/lib/prayer/windows";
import {
  sendTelegramMessage,
  type InlineKeyboard,
} from "@/lib/telegram/api";
import { getOrCreateTelegramSettings } from "@/lib/telegram/settings";

export type PrayerCronResult = {
  ok: true;
  date: string;
  reminded: PrayerName[];
  missed: PrayerName[];
  skipped: number;
};

function reminderKeyboard(
  prayerDate: string,
  prayer: PrayerName,
  snoozeA: number,
  snoozeB: number,
): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        {
          text: "✅ Prayed",
          callback_data: `p:prayed:${prayerDate}:${prayer}`,
        },
      ],
      [
        {
          text: `⏰ ${snoozeA} min`,
          callback_data: `p:snooze:${prayerDate}:${prayer}:${snoozeA}`,
        },
        {
          text: `⏰ ${snoozeB} min`,
          callback_data: `p:snooze:${prayerDate}:${prayer}:${snoozeB}`,
        },
      ],
    ],
  };
}

type WorkItem = {
  prayerDate: string;
  prayer: PrayerName;
  log: PrayerLogRow;
  times: DayPrayerTimes;
  nextFajr: string;
};

async function processItem(input: {
  item: WorkItem;
  now: Date;
  currentMinute: string;
  settings: PrayerSettingsRow;
  chatId: string | null;
  reminded: PrayerName[];
  missed: PrayerName[];
}): Promise<number> {
  const { item, now, currentMinute, settings, chatId } = input;
  const { prayer, prayerDate, log, times, nextFajr } = item;
  const enabled = isPrayerEnabled(settings, prayer);
  const prayerStart = wallClockToDate(prayerDate, times[prayer]);
  const cutoff = prayerCutoff(prayerDate, prayer, times, nextFajr);

  const decision = decideReminderAction({
    now,
    prayerStart,
    cutoff,
    status: log.status,
    enabled,
    firstRemindedAt: log.firstRemindedAt,
    lastRemindedAt: log.lastRemindedAt,
    snoozeUntil: log.snoozeUntil,
    reRemindIntervalMinutes: settings.reRemindIntervalMinutes,
    lastReminderMinuteKey: log.lastReminderMinuteKey,
    currentMinuteKey: currentMinute,
  });

  if (decision === "skip") return 1;

  if (decision === "mark_missed") {
    const updated = await markPrayerMissed(log.id);
    if (updated) input.missed.push(prayer);
    return updated ? 0 : 1;
  }

  if (!chatId) return 1;

  const claimed = await claimReminderMinute({
    id: log.id,
    now,
    minuteKey: currentMinute,
  });
  if (!claimed) return 1;

  const label = PRAYER_LABELS[prayer];
  const time = times[prayer];
  const text = `🕌 ${label} time has started (${time})`;
  const sent = await sendTelegramMessage(chatId, text, {
    replyMarkup: reminderKeyboard(
      prayerDate,
      prayer,
      settings.snoozeOptionAMinutes,
      settings.snoozeOptionBMinutes,
    ),
  });

  if (sent.ok) {
    input.reminded.push(prayer);
    return 0;
  }
  return 1;
}

/**
 * One tick of the prayer reminder cron (idempotent per America/New_York minute).
 * Also continues yesterday's Isha until today's Fajr (overnight window).
 */
export async function runPrayerCronTick(
  now: Date = new Date(),
): Promise<PrayerCronResult> {
  try {
    const date = todayStr();
    const yesterday = addDays(date, -1);
    const settings = await getOrCreatePrayerSettings();
    const telegram = await getOrCreateTelegramSettings();

    const todayCached = await ensurePrayerTimesForDate(date, settings);
    const tomorrowCached = await ensurePrayerTimesForDate(
      addDays(date, 1),
      settings,
    );
    const yesterdayCached = await ensurePrayerTimesForDate(yesterday, settings);

    const todayLogs = await ensurePrayerLogsForDate(date);
    await ensurePrayerLogsForDate(yesterday);

    const work: WorkItem[] = todayLogs.map((log) => ({
      prayerDate: date,
      prayer: log.prayer,
      log,
      times: todayCached.times,
      nextFajr: tomorrowCached.times.fajr,
    }));

    // Overnight Isha: still pending on yesterday until today's Fajr.
    const yesterdayIsha = await getPrayerLog(yesterday, "isha");
    if (yesterdayIsha && yesterdayIsha.status === "pending") {
      work.push({
        prayerDate: yesterday,
        prayer: "isha",
        log: yesterdayIsha,
        times: yesterdayCached.times,
        nextFajr: todayCached.times.fajr,
      });
    }

    // Stable order: yesterday Isha first (if any), then today's prayers.
    work.sort((a, b) => {
      if (a.prayerDate !== b.prayerDate) {
        return a.prayerDate < b.prayerDate ? -1 : 1;
      }
      return PRAYER_NAMES.indexOf(a.prayer) - PRAYER_NAMES.indexOf(b.prayer);
    });

    const currentMinute = minuteKey(now);
    const reminded: PrayerName[] = [];
    const missed: PrayerName[] = [];
    let skipped = 0;

    for (const item of work) {
      skipped += await processItem({
        item,
        now,
        currentMinute,
        settings,
        chatId: telegram.chatId,
        reminded,
        missed,
      });
    }

    return { ok: true, date, reminded, missed, skipped };
  } catch (error) {
    logPrayerError("runPrayerCronTick", error);
    throw error;
  }
}
