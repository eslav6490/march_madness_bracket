# March Madness Squares

Next.js + Postgres app for running a March Madness squares pool (single 10x10 grid for the full tournament).

## Prereqs

- Node.js + npm
- Postgres (local or remote)

## Environment

Required:

- `DATABASE_URL` (Postgres connection string)
- `SUPABASE_URL` (Supabase project URL for server-side auth calls)
- `SUPABASE_ANON_KEY` (Supabase anon key for server-side auth calls)
- `ADMIN_SESSION_SECRET` (server-only secret used to encrypt/sign admin session cookies)

Example:

```bash
export DATABASE_URL='postgres://mmapp:mmapp_dev@127.0.0.1:5432/march_madness'
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_ANON_KEY='your-anon-key'
export ADMIN_SESSION_SECRET='replace-with-a-long-random-secret'
```

Optional compatibility fallback:

```bash
# Deprecated compatibility path for local scripts/tests only:
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
- Admin browser sessions use a server-managed `HttpOnly` cookie set by `/api/admin/auth/login`.
- `/admin/login` accepts email/password and establishes the cookie-backed session.
- `/api/admin/auth/logout` clears the admin session cookie.
- Admin API routes are cookie-session-first and still accept `Authorization: Bearer ...` when provided.
- `ADMIN_TOKEN` + `x-admin-token` remains supported as a deprecated legacy fallback for local scripts/tests.
- After deploying this change, existing admins must sign in again to establish the new cookie session.
