# March Madness Squares

Next.js + Postgres app for running a March Madness squares pool (single 10x10 grid for the full tournament).

## Prereqs

- Node.js + npm
- Postgres (local or remote)

## Environment

Required:

- `DATABASE_URL` (Postgres connection string)
- `ADMIN_TOKEN` (simple header guard for admin write endpoints)

Example:

```bash
export DATABASE_URL='postgres://mmapp:mmapp_dev@127.0.0.1:5432/march_madness'
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
- Admin mutations require sending a request header `ADMIN_TOKEN: <value>`.
- This repo currently uses a lightweight admin guard token (Supabase auth is not implemented yet).

