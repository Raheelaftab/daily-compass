# Daily Compass

Private, single-user, mobile-first planner for logging work across seven life areas.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- Neon Postgres + Drizzle ORM
- Auth: bcryptjs + JWT cookie (`jose`)

## Local setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a **new** Neon project named `daily-compass` (separate from other apps). Copy the **pooled** connection string.

3. Copy env example and fill values:

```bash
cp .env.example .env.local
```

```
DATABASE_URL=            # Neon pooled connection string
ADMIN_EMAIL=             # the only login email
ADMIN_PASSWORD_HASH=     # bcrypt hash, cost 12 (wrap in single quotes if it contains $)
AUTH_SECRET=             # 32+ random bytes, base64
MCP_API_TOKEN=           # optional; Bearer token for /api/mcp
TELEGRAM_BOT_TOKEN=      # optional; from @BotFather
TELEGRAM_WEBHOOK_SECRET= # optional; random secret for webhook header
TELEGRAM_PAIR_CODE=      # optional; code used in /start <PAIR_CODE>
CRON_SECRET=             # optional; Vercel Cron Authorization bearer
```

Generate a password hash and auth secret:

```bash
npx tsx scripts/hash-password.ts "your-password"
openssl rand -base64 32
```

> Tip: put `ADMIN_PASSWORD_HASH` in **single quotes** in `.env.local` so `$` characters are not expanded.

4. Migrate and seed:

```bash
npm run db:migrate
npm run db:seed
```

5. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, then use the app on phone or laptop.

## Deploy (Vercel + Neon)

1. Create the Neon project and note the pooled `DATABASE_URL`.
2. Locally fill `.env.local`, run `npm run db:migrate` then `npm run db:seed`.
3. Generate `ADMIN_PASSWORD_HASH` and `AUTH_SECRET` as above.
4. Push to a **private** GitHub repo.
5. In Vercel → Import project → add env vars (`DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET`, plus optional MCP/Telegram/cron vars) → Deploy.
6. Open on phone → log in → “Add to Home Screen”.

## Telegram bot setup

1. Talk to [@BotFather](https://t.me/BotFather) → `/newbot` → copy the bot token into `TELEGRAM_BOT_TOKEN` (local `.env.local` and Vercel).
2. Generate a random webhook secret and a pair code (do not commit them):

```bash
openssl rand -hex 24
openssl rand -hex 8
```

Put them in `TELEGRAM_WEBHOOK_SECRET` and `TELEGRAM_PAIR_CODE`. Also set `CRON_SECRET` (Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`).

3. Deploy so `https://<your-domain>/api/telegram` is live, then register the webhook **once** (replace placeholders; never commit real values):

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<your-domain>/api/telegram\",\"secret_token\":\"<TELEGRAM_WEBHOOK_SECRET>\"}"
```

4. In Telegram, open your bot and send:

```text
/start <TELEGRAM_PAIR_CODE>
```

Only that chat is accepted afterward. Use `/help` for commands. Toggle morning/evening digests in **Settings**.

Cron schedules (UTC, Vercel Hobby): morning `0 13 * * *` → `/api/cron/morning`; evening `0 2 * * *` → `/api/cron/evening`.

## Prayer reminders (cron-job.org)

Prayer times are fetched once per day from [AlAdhan](https://aladhan.com/prayer-times-api) **by coordinates** (`/v1/timings/{DD-MM-YYYY}` with `timezonestring=America/New_York`; default lat/long **39.437 / -76.62** Timonium MD; method **ISNA** `2`; Asr **Standard/Shafi** `0`). City geocoding is not used. A minute cron sends Telegram reminders with ✅ Prayed / ⏰ snooze buttons. Configure coords and per-prayer toggles in **Settings**.

1. Deploy so `https://<your-domain>/api/cron/prayer` is live and `CRON_SECRET` is set in Vercel.
2. Pair the Telegram bot (see above) so reminders have a chat to send to.
3. Create a job at [cron-job.org](https://cron-job.org):
   - **URL:** `https://<your-domain>/api/cron/prayer`
   - **Schedule:** every 1 minute
   - **Request method:** GET (POST also works)
   - **Header:** `Authorization` = `Bearer <CRON_SECRET>` (same value as the Vercel env var; never commit it)
4. Optional: open the URL once with the header to confirm `{ "ok": true, ... }`. Wrong/missing auth returns **401**.

Use `/prayers` in Telegram for today's times and status.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Idempotent seed (7 areas, 4 habits) |
| `npm run db:studio` | Drizzle Studio |
