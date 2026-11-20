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
5. In Vercel → Import project → add the four env vars (`DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET`) → Deploy.
6. Open on phone → log in → “Add to Home Screen”.

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
