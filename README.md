# March Madness Squares

Next.js + Postgres app for running a March Madness squares pool (single 10x10 grid for the full tournament).

## Prereqs

- Node.js + npm
- Postgres (local or remote)

## Environment

Required:

- `DATABASE_URL` (Postgres connection string)
- `SUPABASE_URL` (Supabase project URL for server-side token verification)
- `SUPABASE_ANON_KEY` (Supabase anon key for server-side auth lookup)
- `NEXT_PUBLIC_SUPABASE_URL` (browser Supabase URL used by `/admin/login`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser Supabase anon key used by `/admin/login`)

Example:

```bash
export DATABASE_URL='postgres://mmapp:mmapp_dev@127.0.0.1:5432/march_madness'
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_ANON_KEY='your-anon-key'
export NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key'
```

Optional compatibility fallback:

```bash
export ADMIN_TOKEN='dev-admin'
```

## Install

```bash
npm ci
```

## Database Migrations

Run migrations before starting the app:

```bash
npm run db:migrate
```

## Run (Dev)

```bash
npm run dev
```

To listen on all interfaces (so you can hit it from another machine):

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

## Commands

```bash
npm test
npm run lint
npm run typecheck
```

## Notes

- Public pages are readable without auth.
- Admin mutations require `Authorization: Bearer <supabase-access-token>`.
- The bearer token must resolve to a Supabase user with admin role metadata.
- `/admin/login` provides an email/password sign-in flow against Supabase Auth.
- `ADMIN_TOKEN` remains supported as a legacy fallback for local testing.
