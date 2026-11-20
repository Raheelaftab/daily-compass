# Daily Compass — Build Spec for Cursor

> **For the AI agent (Cursor):** This file is the single source of truth for this project.
> Build it **one session at a time** (see "Build Sessions" at the bottom). After each session:
> run `npm run build` and `npm run lint`, fix all errors, tick the session's checkboxes in this
> file, summarize what you did, and **stop and wait** for the developer before starting the next session.
> If anything in this spec is ambiguous, ask instead of guessing. Do not add features that are not in this spec.

---

## 1. What we are building

A private, single-user, mobile-first web app where the owner (Raheel) plans, logs and reviews his work
across seven life areas. He uses it twice a day — a morning block (~8:00–9:45) and an evening block
(~9:30–10:30) — plus a Sunday review. It must work equally well on a phone and a laptop.

Core goals:
- Adding a task or logging time takes under 10 seconds on a phone.
- The Today page shows the day's **top 3** tasks and nothing competing for attention.
- The Dashboard shows hours per area this week vs target, open/overdue tasks, and habit consistency.
- A weekly report supports a Sunday review.

---

## 2. Tech stack (use latest stable versions)

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Neon Postgres via `@neondatabase/serverless` |
| ORM | Drizzle ORM + drizzle-kit (migrations in `/drizzle`) |
| Auth | Custom single-user: `bcryptjs` + signed JWT cookie with `jose` |
| Validation | Zod |
| Charts | Recharts |
| Dates | date-fns + `@date-fns/tz` (or date-fns-tz), timezone `America/New_York` |
| Icons | lucide-react |
| Hosting | Vercel |

No separate backend. Pages are **Server Components** that query the DB directly; all writes go through
**Server Actions**. No API routes unless strictly required.

Route protection: use Next.js `proxy.ts` (Next 16+) — or `middleware.ts` if the installed Next version
still uses it. Check the installed version and use the correct one.

---

## 3. Environment variables

`.env.local` (never committed; add `.env.example` with empty values):

```
DATABASE_URL=            # Neon pooled connection string
ADMIN_EMAIL=             # the only login email
ADMIN_PASSWORD_HASH=     # bcrypt hash, cost 12
AUTH_SECRET=             # 32+ random bytes, base64 (openssl rand -base64 32)
```

Add a script `scripts/hash-password.ts` that prints a bcrypt hash for a password passed as an argument:
`npx tsx scripts/hash-password.ts "my-password"`.

---

## 4. Folder structure

```
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx              # sidebar (desktop) + bottom tab bar (mobile)
    (app)/page.tsx                # Today
    (app)/tasks/page.tsx
    (app)/habits/page.tsx
    (app)/dashboard/page.tsx
    (app)/reports/page.tsx        # redirects to current week
    (app)/reports/[week]/page.tsx # week = YYYY-MM-DD (Monday)
    (app)/settings/page.tsx
    layout.tsx
    globals.css
  actions/        # auth.ts, tasks.ts, logs.ts, habits.ts, reviews.ts, areas.ts
  db/             # schema.ts, index.ts, seed.ts
  lib/            # auth.ts, dates.ts, queries.ts, validators.ts, utils.ts
  components/
    ui/           # shadcn components
    charts/
    forms/
    nav/
  proxy.ts        # (or middleware.ts — see section 2)
scripts/hash-password.ts
drizzle.config.ts
```

---

## 5. Database schema (Drizzle)

Implement exactly this in `src/db/schema.ts` (adjust syntax to the installed Drizzle version):

```ts
import { pgTable, pgEnum, serial, integer, text, varchar, boolean, date, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const statusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);

export const areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull().unique(),
  color: varchar("color", { length: 20 }).notNull(),          // tailwind color name, e.g. "purple"
  weeklyTargetMinutes: integer("weekly_target_minutes"),      // null = "log only"
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  areaId: integer("area_id").notNull().references(() => areas.id),
  title: varchar("title", { length: 200 }).notNull(),
  notes: text("notes"),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: statusEnum("status").notNull().default("todo"),
  dueDate: date("due_date"),
  top3For: date("top3_for"),                                  // the day this task is in the top 3
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("tasks_status_due_idx").on(t.status, t.dueDate), index("tasks_top3_idx").on(t.top3For)]);

export const timeLogs = pgTable("time_logs", {
  id: serial("id").primaryKey(),
  areaId: integer("area_id").notNull().references(() => areas.id),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
  logDate: date("log_date").notNull(),
  minutes: integer("minutes").notNull(),                      // 1..720
  note: varchar("note", { length: 300 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("time_logs_date_idx").on(t.logDate)]);

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  areaId: integer("area_id").references(() => areas.id),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const habitChecks = pgTable("habit_checks", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  checkDate: date("check_date").notNull(),
  done: boolean("done").notNull().default(true),
}, (t) => [uniqueIndex("habit_checks_unique").on(t.habitId, t.checkDate), index("habit_checks_date_idx").on(t.checkDate)]);

export const weeklyReviews = pgTable("weekly_reviews", {
  id: serial("id").primaryKey(),
  weekStart: date("week_start").notNull().unique(),           // always a Monday
  wins: text("wins"),
  slipped: text("slipped"),
  nextTop3: text("next_top3"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### Seed data (`src/db/seed.ts`, idempotent — upsert by slug / name)

Areas:

| sortOrder | name | slug | color | weeklyTargetMinutes |
| --- | --- | --- | --- | --- |
| 1 | Master's degree | masters | purple | 180 |
| 2 | Job search | job-search | blue | 150 |
| 3 | Rinoviy | rinoviy | teal | 150 |
| 4 | Dubai office | dubai-office | orange | null |
| 5 | Hungry Theory | hungry-theory | red | 60 |
| 6 | Family | family | green | null |
| 7 | Health & habits | health | yellow | 60 |

Habits (all linked to `health`): "Healthy breakfast", "No junk food after 9pm", "8 glasses of water", "20-minute walk".

Scripts in `package.json`: `db:generate`, `db:migrate`, `db:seed`, `db:studio`.

---

## 6. Dates and time rules (important)

- App timezone is **America/New_York**. Put this in one constant in `src/lib/dates.ts`.
- "Today" = the current calendar date in that timezone, as a `YYYY-MM-DD` string. Never use the server's UTC date.
- Weeks start **Monday**. Helpers: `todayStr()`, `weekStart(dateStr)`, `weekEnd(dateStr)`, `addDays(dateStr, n)`, `formatDisplay(dateStr)`.
- All `date` columns store `YYYY-MM-DD` strings in local time.

---

## 7. Authentication

- `src/lib/auth.ts`: `createSession()` signs a JWT (HS256, `AUTH_SECRET`, 30-day expiry, payload `{ sub: "owner" }`)
  and sets an `httpOnly`, `secure` (in production), `sameSite=lax` cookie named `dc_session`.
  `verifySession()` returns true/false. `destroySession()` clears the cookie.
- `actions/auth.ts`: `login(formData)` — Zod-validate email + password; compare email to `ADMIN_EMAIL`
  (case-insensitive) and password with `bcrypt.compare` against `ADMIN_PASSWORD_HASH`; on success create
  session and redirect to `/`; on failure return a generic "Invalid email or password". `logout()`.
- `proxy.ts` / `middleware.ts`: for every route except `/login`, static files and `_next`, verify the cookie with
  `jose` (edge-safe); if invalid redirect to `/login`. If logged in and visiting `/login`, redirect to `/`.
- Every Server Action must also call `verifySession()` and throw if not authenticated (defense in depth).

---

## 8. Pages and behavior

### Layout `(app)/layout.tsx`
- Desktop (≥ md): left sidebar with app name "Daily Compass", links: Today, Tasks, Habits, Dashboard, Reports, Settings; logout at bottom.
- Mobile: fixed bottom tab bar with Today, Tasks, Habits, Dashboard (icons + labels); Reports and Settings in a top-right menu.
- Respect iOS safe area at the bottom. Light and dark mode (follow system).

### Today `/`
1. Header: today's date and total time logged today (e.g. "2h 15m").
2. **Top 3**: tasks where `top3For = today`. Each shows title, area color dot, a checkbox to complete. If fewer than 3, a "Pick from tasks" button opens a sheet listing open tasks (overdue first, then by priority, then due date) to add. Max 3 enforced in the action.
3. **Quick log**: area select (remembers last used area in localStorage, wrapped in try/catch), minutes input with quick buttons (15, 25, 30, 45, 60, 90), optional note, optional linked task. Submit → `logTime`.
4. **Habits today**: list of active habits with checkboxes → `toggleHabit`.
5. **Today's log**: list of today's time logs with delete.

### Tasks `/tasks`
- Filters: area (all / each), status (open = todo+in_progress / done / all). Default: open.
- Sort: overdue first, then priority (high→low), then due date (soonest), then created.
- Overdue = `dueDate < today` and status ≠ done → red due label.
- "Add task" button opens a sheet (Drawer on mobile, Dialog on desktop): title (required), area (required), priority, due date, notes.
- Row actions: edit, change status, set/unset as today's top 3, delete (with confirm).
- Completing a task sets `completedAt = now()`; reopening clears it.

### Habits `/habits`
- List of habits with a 7-day grid (Mon–Sun of current week) of toggleable cells, current streak and best streak.
- Streak = consecutive days with `done = true` ending today (or yesterday if today not yet checked).
- Add / rename / deactivate habits.

### Dashboard `/dashboard`
Week selector (defaults to current week). Widgets:
1. **Hours by area** — horizontal bar chart: logged hours vs target per area (log-only areas show logged hours without a target bar).
2. **Totals** — hours logged this week; % of total target reached (only areas with targets).
3. **Tasks** — completed this week, open, overdue.
4. **Open tasks by area** — small list with counts.
5. **Habits** — completion rate this week (checks done / (active habits × days elapsed)).
6. **Trend** — line chart of hours per week for the last 8 weeks.

### Weekly report `/reports/[week]`
- Prev / next week navigation.
- Hours by area table (logged, target, %).
- Tasks completed this week (list with area).
- Tasks that slipped: due this week or earlier, still not done.
- Top-3 hit rate: of tasks marked top-3 on days of this week, how many were completed.
- Habit rate per habit.
- Review form: Wins, What slipped, Next week's top 3 → `saveWeeklyReview` (upsert by weekStart).

### Settings `/settings`
- Edit each area: name, color, weekly target (hours, decimal allowed → stored as minutes; empty = log only), active, order.

---

## 9. Server Actions (all in `src/actions/`)

Every action: verify session → Zod-validate input → DB write → `revalidatePath` of affected pages → return `{ ok: true }` or `{ ok: false, error }`.

| File | Actions |
| --- | --- |
| auth.ts | `login`, `logout` |
| tasks.ts | `createTask`, `updateTask`, `setTaskStatus`, `deleteTask`, `toggleTop3(taskId)` |
| logs.ts | `logTime`, `deleteTimeLog` |
| habits.ts | `createHabit`, `updateHabit`, `toggleHabit(habitId, date)` |
| reviews.ts | `saveWeeklyReview` |
| areas.ts | `updateArea` |

Read queries live in `src/lib/queries.ts` (e.g. `getTodayData()`, `getTasks(filters)`, `getWeekStats(weekStart)`, `getWeeklyTrend(weeks)`, `getHabitGrid(weekStart)`).

---

## 10. UI and quality rules

- Mobile-first; test at 375px width. Touch targets ≥ 44px. Forms usable with one thumb.
- Use shadcn components: Button, Card, Input, Textarea, Select, Checkbox, Dialog, Drawer/Sheet, Tabs, Badge, DropdownMenu, Sonner (toasts).
- Show a toast on every successful write and on errors.
- Use optimistic UI (`useOptimistic`) for checkboxes (tasks, habits) so they feel instant.
- Empty states with a one-line hint (e.g. "No tasks yet — add your first one").
- Loading states via `loading.tsx` skeletons.
- Clean, minimal design; neutral background, area colors only as small dots/badges and chart bars.
- No `any`. No unused code. Keep components small.
- Never log secrets. `.env*` in `.gitignore` except `.env.example`.

---

## 11. Deployment (Vercel + Neon)

1. Create a **new** Neon project `daily-compass` (separate from Rinoviy). Copy the pooled connection string.
2. Locally: fill `.env.local`, run `npm run db:migrate` then `npm run db:seed`.
3. Generate hash: `npx tsx scripts/hash-password.ts "your-password"`; generate secret: `openssl rand -base64 32`.
4. Push to a private GitHub repo.
5. Vercel → Import project → add the 4 env vars → Deploy.
6. Open on phone → log in → "Add to Home Screen".

Add a `README.md` with these steps.

---

## 12. Build Sessions

Do these in order. One session per run. Stop after each.

### Session 1 — Project setup & database
- [x] Create Next.js app (TypeScript, Tailwind, App Router, `src/`, ESLint).
- [x] Install and init shadcn/ui; add the components listed in section 10.
- [x] Install drizzle-orm, drizzle-kit, @neondatabase/serverless, zod, date-fns, date-fns tz package, recharts, jose, bcryptjs, lucide-react, tsx.
- [x] `drizzle.config.ts`, `src/db/index.ts`, `src/db/schema.ts` (section 5).
- [x] Generate + run migration; write and run idempotent seed.
- [x] `src/lib/dates.ts` with helpers (section 6).
- [x] `.env.example`, `.gitignore`, `scripts/hash-password.ts`.
- **Done when:** `npm run build` passes; `db:studio` shows 7 areas and 4 habits.

### Session 2 — Auth, layout, deploy
- [ ] `src/lib/auth.ts`, `actions/auth.ts`, login page.
- [ ] `proxy.ts`/`middleware.ts` route protection.
- [ ] `(app)/layout.tsx` with sidebar + mobile bottom nav; placeholder pages for all routes.
- [ ] README with deployment steps.
- **Done when:** unauthenticated visit redirects to `/login`; correct login reaches `/`; logout works; developer deploys to Vercel.

### Session 3 — Tasks
- [ ] `queries.getTasks`, task actions, Tasks page with filters, sorting, add/edit sheet, status change, delete, overdue styling.
- **Done when:** full task CRUD works on mobile and desktop.

### Session 4 — Today
- [ ] Top 3 section with picker (max 3), quick time log, today's log list, today's total.
- **Done when:** a task can be added to top 3, completed, and time logged in under 10 seconds on a phone.

### Session 5 — Habits
- [ ] Habits page (7-day grid, streaks, add/rename/deactivate) and habit checkboxes on Today.
- **Done when:** toggling is instant (optimistic) and streaks are correct.

### Session 6 — Dashboard
- [ ] `getWeekStats`, `getWeeklyTrend`; all six widgets; week selector.
- **Done when:** numbers match the raw data in `db:studio` for a test week.

### Session 7 — Weekly report & Settings
- [ ] Report page with all sections and review form; Settings page for areas.
- **Done when:** review saves and reloads; changing a target updates the dashboard.

### Session 8 — Polish
- [ ] Empty states, skeletons, toasts everywhere, dark mode check, 375px layout check, Lighthouse pass, remove dead code.
- **Done when:** developer uses it on his phone for a full day without friction.

---

## 13. Out of scope for v1 (do NOT build yet)
CSV export, monthly reports, PWA/offline, recurring tasks, timers, notifications, multi-user, client field for Rinoviy.
