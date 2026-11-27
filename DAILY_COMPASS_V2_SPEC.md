# Daily Compass — v2 Build Spec for Cursor

> **For the AI agent (Cursor):** This is the v2 spec. v1 (`DAILY_COMPASS_SPEC.md`) is complete and live.
> Build **one session at a time** (section 10). Before each session, inspect the current code
> (`src/db/schema.ts`, `src/actions`, `src/lib/queries.ts`, `src/app/api/mcp`) and reuse existing patterns.
> After each session: run `npm run build`, `npm run lint`, `npm test`, fix all errors, tick the session's
> checkboxes here, summarize, and **stop**. Never break existing pages, Server Actions or MCP tools.
> Ask instead of guessing. Do not add features that are not in this spec.

---

## 1. Goals of v2

1. A **more interactive dashboard** with a quick view of finished vs open tasks, with graphs.
2. **Recurring tasks** so daily/weekly habits-of-work don't have to be re-added.
3. A **built-in timer** that logs time automatically.
4. **Install on phone** (PWA).
5. **Telegram bot** (free) for a morning digest, evening nudge, and quick commands from the phone.
6. **Monthly report + CSV export.**
7. Small fixes: a **Personal** area, and an **`update_area` MCP tool**.

Everything must stay **free** (Vercel Hobby, Neon free tier, Telegram Bot API).

---

## 2. Database changes (Drizzle migrations — additive only)

```ts
// tasks: add
recurrence: text("recurrence"),            // null | "daily" | "weekdays" | "weekly:MON,WED" | "monthly:15"
recurrenceParentId: integer("recurrence_parent_id"), // id of the task this instance was generated from
// (keep all existing columns)

// new table: timers (at most one running row)
export const timers = pgTable("timers", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  areaId: integer("area_id").notNull().references(() => areas.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  note: varchar("note", { length: 300 }),
});

// new table: telegram_settings (single row)
export const telegramSettings = pgTable("telegram_settings", {
  id: serial("id").primaryKey(),
  chatId: varchar("chat_id", { length: 50 }),   // the owner's chat id, set once via /start
  morningDigest: boolean("morning_digest").notNull().default(true),
  eveningNudge: boolean("evening_nudge").notNull().default(true),
});
```

Seed (idempotent): add area **Personal** (slug `personal`, color `gray`, target null, sortOrder 8).

---

## 3. Interactive dashboard (`/dashboard`)

Keep all existing widgets working, then upgrade:

- **Range selector** at top: This week · Last week · This month · Last 30 days · Custom (date pickers). All widgets follow it. Persist the choice in the URL (`?range=`).
- **Task status overview** (new, top of page):
  - Three big clickable stat cards: **Completed**, **Open**, **Overdue** (counts for the range; open/overdue = current).
  - A **stacked bar chart by area**: done vs open vs overdue per area.
  - Clicking a card or a bar segment opens a **side sheet (desktop) / bottom drawer (mobile)** listing those exact tasks, with quick actions: mark done, open task, set as today's top 3.
- **Completed vs created trend**: line chart per day/week across the range.
- **Hours by area**: keep the bar chart vs target; clicking an area bar opens that area's time logs in the drawer.
- **Daily time chart**: bar per day of the range (stacked by area).
- **Habits**: keep completion rate; add a small heatmap of the last 30 days.
- Charts: Recharts with tooltips on hover/tap, legends, responsive containers, light/dark mode.
- Empty states and loading skeletons for every widget.

All data via new read queries in `src/lib/queries.ts` (e.g. `getTaskStatusByArea(range)`, `getCompletionTrend(range)`, `getDailyMinutes(range)`, `getTasksForDrill(filter)`).

---

## 4. Recurring tasks

- Task form gets a **Repeat** field: None · Daily · Weekdays (Mon–Fri) · Weekly (pick days) · Monthly (day of month).
- When a recurring task is marked **done**, immediately create the **next instance** (same title/area/priority/notes/recurrence, `recurrenceParentId` set, next due date computed in America/New_York). Do not create duplicates if one already exists for that date.
- Changing or clearing recurrence on a task affects only future instances.
- Recurring tasks show a small repeat icon.

---

## 5. Timer

- A **Start timer** button on each task row and on Today (pick area/task).
- Only one running timer at a time (starting a new one stops the previous and logs it).
- A **running timer pill** in the header (all pages) showing elapsed time, with Stop.
- **Stop** creates a `time_logs` row (minutes rounded to nearest minute, min 1; log date = the start date in America/New_York) and deletes the timer row.
- Timer state lives in the DB, so it survives closing the browser and works across phone and laptop.
- If a timer runs over 6 hours, ask for confirmation on stop (edit minutes before saving).

---

## 6. PWA (install on phone)

- `app/manifest.ts` with name "Daily Compass", short name "Compass", theme colors, `display: "standalone"`, start URL `/`.
- App icons (192, 512, maskable) generated from a simple compass SVG.
- Minimal service worker for installability and an offline fallback page ("You're offline"). No offline data sync.
- iOS meta tags (apple-touch-icon, status bar style).

---

## 7. Telegram bot (free)

**Setup (developer does once):** create bot with @BotFather, get `TELEGRAM_BOT_TOKEN`; choose a random `TELEGRAM_WEBHOOK_SECRET`. Add both to Vercel env. Register webhook to `https://<domain>/api/telegram` with `secret_token`.

**Security:**
- `/api/telegram` rejects requests unless header `X-Telegram-Bot-Api-Secret-Token` matches `TELEGRAM_WEBHOOK_SECRET`.
- The bot only responds to the owner's `chatId`. First `/start <PAIR_CODE>` (env `TELEGRAM_PAIR_CODE`) saves the chat id; afterwards all other chats are ignored.
- Never log tokens.

**Commands:**
| Command | Action |
| --- | --- |
| `/today` | Today's top 3, other tasks due today, overdue count, hours logged today |
| `/add <title> #area !high due:fri` | Create task (area slug, optional priority and due date; parse simple words: today, tomorrow, mon–sun, YYYY-MM-DD) |
| `/done <id>` | Mark task done (recurring → next instance) |
| `/top <id>` | Add to today's top 3 (max 3) |
| `/log <minutes> #area note...` | Log time |
| `/start_timer <id or #area>` / `/stop` | Timer control |
| `/week` | Week summary: hours by area vs target, done/open/overdue |
| `/help` | List commands |

Replies are short, plain text with task ids so commands can be chained.

**Scheduled messages (Vercel Cron, Hobby = once per day each, times in UTC, may fire anywhere within the hour):**
- `vercel.json` crons:
  - Morning digest: `0 13 * * *` (≈ 8–9am New York in winter; note DST shift) → `/api/cron/morning`
  - Evening nudge: `0 2 * * *` (≈ 9–10pm New York) → `/api/cron/evening`
- Cron routes require `Authorization: Bearer ${CRON_SECRET}` (Vercel sends this automatically when `CRON_SECRET` is set).
- Morning: top 3 (or "pick your top 3"), due today, overdue.
- Evening: "Log your day" with hours logged today, unfinished top 3, prompt to pick tomorrow's top 3.
- Toggle morning/evening in Settings.

---

## 8. Monthly report + CSV export

- `/reports/month/[YYYY-MM]`: hours by area vs (weekly target × weeks), tasks completed, slipped tasks, habit rate, best day.
- **Export CSV** buttons: tasks (range), time logs (range). Generated server-side via a route handler, downloads directly.

---

## 9. MCP additions

- `update_area`: slug + any of name, color, weeklyTargetHours (null = log only), isActive. Validate with Zod.
- `start_timer` / `stop_timer` (same rules as section 5).
- `create_task` and `update_task` accept `recurrence`.
- Keep: no delete tool. Add tests for each new tool.

---

## 10. Build sessions

### Session 1 — Foundations
- [x] Migrations (recurrence fields, timers, telegram_settings) + Personal area seed
- [x] `update_area` MCP tool + tests
- **Done when:** migration applied, Personal area visible, Claude can change a weekly target.

### Session 2 — Dashboard: task status overview
- [x] Range selector (URL-persisted)
- [x] Completed / Open / Overdue cards + stacked bar by area
- [x] Drill-down drawer with quick actions
- **Done when:** clicking any card/bar shows exactly those tasks and actions work.

### Session 3 — Dashboard: trends
- [x] Completed vs created trend, daily time chart, clickable hours-by-area, habit heatmap
- **Done when:** all widgets follow the range and look right at 375px and on desktop.

### Session 4 — Recurring tasks
- [ ] Repeat field, next-instance generation, icon, MCP support, tests (incl. no duplicates, weekly days, month-end)

### Session 5 — Timer
- [ ] Start/stop, header pill, DB-backed, MCP tools, tests

### Session 6 — PWA
- [ ] Manifest, icons, service worker, offline page
- **Done when:** installable from Chrome (Android) and "Add to Home Screen" (iOS) opens standalone.

### Session 7 — Telegram bot
- [ ] Webhook route + security + pairing, all commands, tests for parsing and auth
- [ ] Cron routes + `vercel.json` + Settings toggles
- [ ] README: BotFather setup, env vars, webhook registration command

### Session 8 — Monthly report + CSV
- [ ] Month report page, CSV export routes, tests

---

## 11. Out of scope for v2
WhatsApp/SMS (cost money for scheduled messages), multi-user, offline editing, AI features inside the app, native mobile app.
