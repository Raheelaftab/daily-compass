import { eq } from "drizzle-orm";

import { db } from "@/db";
import { areas, tasks, timeLogs } from "@/db/schema";
import { formatMinutes, todayStr, weekStart } from "@/lib/dates";
import { countTop3ForToday, getTodayData, getWeekStats } from "@/lib/queries";
import { spawnNextRecurringTask } from "@/lib/recurrence-spawn";
import { verifyPairCode } from "@/lib/telegram/auth";
import {
  parseAddArgs,
  parseCommandLine,
  parseLogArgs,
  parseStartTimerArgs,
} from "@/lib/telegram/parse";
import {
  getOrCreateTelegramSettings,
  setTelegramChatId,
} from "@/lib/telegram/settings";
import { startTimerRun, stopRunningTimer } from "@/lib/timer-ops";

const HELP_TEXT = [
  "Commands:",
  "/today — top 3, due today, overdue, hours",
  "/add <title> #area !high due:fri",
  "/done <id>",
  "/top <id>",
  "/log <minutes> #area note...",
  "/start_timer <id|#area>",
  "/stop",
  "/week",
  "/help",
].join("\n");

async function findAreaBySlug(slug: string) {
  const [area] = await db
    .select({
      id: areas.id,
      name: areas.name,
      slug: areas.slug,
    })
    .from(areas)
    .where(eq(areas.slug, slug))
    .limit(1);
  return area ?? null;
}

export async function handleTelegramText(
  chatId: string,
  text: string,
): Promise<string | null> {
  const parsed = parseCommandLine(text);
  if (!parsed) {
    return "Send /help for commands.";
  }

  const settings = await getOrCreateTelegramSettings();

  if (parsed.command === "start") {
    if (settings.chatId && settings.chatId !== chatId) {
      return null; // ignore other chats
    }
    if (settings.chatId === chatId) {
      return "Already paired. Send /help.";
    }
    if (!parsed.args || !verifyPairCode(parsed.args)) {
      return null; // wrong/missing code — ignore
    }
    await setTelegramChatId(chatId);
    return "Paired. Send /help for commands.";
  }

  // All other commands require the owner chat.
  if (!settings.chatId || settings.chatId !== chatId) {
    return null;
  }

  switch (parsed.command) {
    case "help":
      return HELP_TEXT;
    case "today":
      return await cmdToday();
    case "add":
      return await cmdAdd(parsed.args);
    case "done":
      return await cmdDone(parsed.args);
    case "top":
      return await cmdTop(parsed.args);
    case "log":
      return await cmdLog(parsed.args);
    case "start_timer":
      return await cmdStartTimer(parsed.args);
    case "stop":
      return await cmdStop();
    case "week":
      return await cmdWeek();
    default:
      return "Unknown command. Send /help.";
  }
}

async function cmdToday(): Promise<string> {
  const data = await getTodayData();
  const lines: string[] = [`Today ${data.today}`];

  if (data.top3.length === 0) {
    lines.push("Top 3: (none — pick your top 3)");
  } else {
    lines.push("Top 3:");
    for (const task of data.top3) {
      const mark = task.status === "done" ? "✓" : "•";
      lines.push(`${mark} #${task.id} ${task.title}`);
    }
  }

  const top3Ids = new Set(data.top3.map((t) => t.id));
  const dueToday = data.openTasks.filter(
    (t) => t.dueDate === data.today && !top3Ids.has(t.id),
  );
  if (dueToday.length > 0) {
    lines.push("Due today:");
    for (const task of dueToday.slice(0, 8)) {
      lines.push(`• #${task.id} ${task.title}`);
    }
  }

  const overdue = data.openTasks.filter(
    (t) => t.dueDate != null && t.dueDate < data.today,
  );
  lines.push(`Overdue: ${overdue.length}`);
  lines.push(`Hours logged: ${formatMinutes(data.totalMinutes)}`);
  return lines.join("\n");
}

async function cmdAdd(args: string): Promise<string> {
  const parsed = parseAddArgs(args);
  if (!parsed.title) {
    return "Usage: /add <title> #area !high due:fri";
  }
  if (!parsed.areaSlug) {
    return "Include an area slug, e.g. #rinoviy";
  }
  const area = await findAreaBySlug(parsed.areaSlug);
  if (!area) {
    return `Unknown area #${parsed.areaSlug}`;
  }

  const [created] = await db
    .insert(tasks)
    .values({
      title: parsed.title.slice(0, 200),
      areaId: area.id,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      status: "todo",
    })
    .returning({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate });

  const due = created.dueDate ? ` due ${created.dueDate}` : "";
  return `Added #${created.id} ${created.title}${due} (#${area.slug})`;
}

async function cmdDone(args: string): Promise<string> {
  const id = Number(args.trim());
  if (!Number.isInteger(id) || id < 1) {
    return "Usage: /done <id>";
  }

  const [existing] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      areaId: tasks.areaId,
      priority: tasks.priority,
      notes: tasks.notes,
      recurrence: tasks.recurrence,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!existing) return `Task #${id} not found`;
  if (existing.status === "done") return `#${id} already done`;

  await db
    .update(tasks)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(tasks.id, id));

  const spawned = await spawnNextRecurringTask({
    id: existing.id,
    title: existing.title,
    areaId: existing.areaId,
    priority: existing.priority,
    notes: existing.notes,
    recurrence: existing.recurrence,
    dueDate: existing.dueDate,
  });

  if (spawned.created && spawned.dueDate) {
    return `Done #${id}. Next due ${spawned.dueDate}`;
  }
  return `Done #${id} ${existing.title}`;
}

async function cmdTop(args: string): Promise<string> {
  const id = Number(args.trim());
  if (!Number.isInteger(id) || id < 1) {
    return "Usage: /top <id>";
  }
  const today = todayStr();

  const [existing] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      top3For: tasks.top3For,
    })
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (!existing) return `Task #${id} not found`;

  if (existing.top3For === today) {
    return `#${id} already in today's top 3`;
  }

  const count = await countTop3ForToday();
  if (count >= 3) {
    return "Top 3 is full — remove one first";
  }

  await db.update(tasks).set({ top3For: today }).where(eq(tasks.id, id));
  return `Top 3 ← #${id} ${existing.title}`;
}

async function cmdLog(args: string): Promise<string> {
  const parsed = parseLogArgs(args);
  if (!parsed) {
    return "Usage: /log <minutes> #area note...";
  }
  if (!parsed.areaSlug) {
    return "Include an area slug, e.g. #work";
  }
  const area = await findAreaBySlug(parsed.areaSlug);
  if (!area) {
    return `Unknown area #${parsed.areaSlug}`;
  }

  await db.insert(timeLogs).values({
    areaId: area.id,
    minutes: parsed.minutes,
    note: parsed.note,
    logDate: todayStr(),
  });

  return `Logged ${formatMinutes(parsed.minutes)} to #${area.slug}`;
}

async function cmdStartTimer(args: string): Promise<string> {
  const parsed = parseStartTimerArgs(args);
  if (!parsed) {
    return "Usage: /start_timer <id|#area>";
  }

  try {
    if ("taskId" in parsed) {
      const [task] = await db
        .select({ id: tasks.id, areaId: tasks.areaId, title: tasks.title })
        .from(tasks)
        .where(eq(tasks.id, parsed.taskId))
        .limit(1);
      if (!task) return `Task #${parsed.taskId} not found`;
      await startTimerRun({ areaId: task.areaId, taskId: task.id });
      return `Timer started on #${task.id} ${task.title}`;
    }

    const area = await findAreaBySlug(parsed.areaSlug);
    if (!area) return `Unknown area #${parsed.areaSlug}`;
    await startTimerRun({ areaId: area.id });
    return `Timer started on #${area.slug}`;
  } catch (error) {
    return error instanceof Error ? error.message : "Could not start timer";
  }
}

async function cmdStop(): Promise<string> {
  const logged = await stopRunningTimer();
  if (!logged) return "No timer running";
  return `Stopped — logged ${formatMinutes(logged.minutes)}`;
}

async function cmdWeek(): Promise<string> {
  const start = weekStart(todayStr());
  const stats = await getWeekStats(start);
  const lines: string[] = [
    `Week ${stats.displayRange}`,
    `Done ${stats.tasksCompleted} · Open ${stats.tasksOpen} · Overdue ${stats.tasksOverdue}`,
    "Hours:",
  ];
  for (const row of stats.hoursByArea) {
    const target =
      row.targetMinutes != null
        ? ` / ${formatMinutes(row.targetMinutes)}`
        : "";
    lines.push(`• ${row.name}: ${formatMinutes(row.loggedMinutes)}${target}`);
  }
  return lines.join("\n");
}

/** Build morning digest text (also used by cron). */
export async function buildMorningDigest(): Promise<string> {
  const data = await getTodayData();
  const lines: string[] = ["Morning digest", `Today ${data.today}`];

  if (data.top3.length === 0) {
    lines.push("Pick your top 3");
  } else {
    lines.push("Top 3:");
    for (const task of data.top3) {
      lines.push(`• #${task.id} ${task.title}`);
    }
  }

  const dueToday = data.openTasks.filter((t) => t.dueDate === data.today);
  lines.push(`Due today: ${dueToday.length}`);
  const overdue = data.openTasks.filter(
    (t) => t.dueDate != null && t.dueDate < data.today,
  );
  lines.push(`Overdue: ${overdue.length}`);
  return lines.join("\n");
}

/** Build evening nudge text (also used by cron). */
export async function buildEveningNudge(): Promise<string> {
  const data = await getTodayData();
  const lines: string[] = [
    "Log your day",
    `Hours logged: ${formatMinutes(data.totalMinutes)}`,
  ];

  const unfinished = data.top3.filter((t) => t.status !== "done");
  if (unfinished.length === 0) {
    lines.push("Top 3: all done ✓");
  } else {
    lines.push("Unfinished top 3:");
    for (const task of unfinished) {
      lines.push(`• #${task.id} ${task.title}`);
    }
  }

  lines.push("Pick tomorrow's top 3 when you're ready (/top <id>).");
  return lines.join("\n");
}
