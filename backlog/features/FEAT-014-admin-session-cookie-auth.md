# FEAT-014 — Admin Session via HttpOnly Cookie

## Summary

Replace admin token copy/paste and `localStorage` token storage with a server-managed admin session using secure cookies.

## Problem

- Current admin UX requires manual token handling in the UI (`Save Session`, token input field).
- Admin token is persisted in browser `localStorage`.
- This increases operator friction and creates avoidable token exposure risk.

## Goal

- Admin signs in once at `/admin/login`.
- App sets an HttpOnly session cookie.
- Admin pages and admin API routes work without manual token entry.
- Admin can explicitly log out and session is removed.

## Non-Goals

- No change to pool/game/payout domain logic.
- No change to role source of truth (Supabase remains the identity provider).
- No introduction of client-side Supabase SDK for admin auth state.

## Functional Requirements

- Add server-side login endpoint:
  - `POST /api/admin/auth/login`
  - Accepts `{ email, password }`.
  - Calls Supabase Auth password grant server-side.
  - Validates returned user has admin role metadata.
  - On success sets signed/encrypted session cookie and returns 200.
  - On failure returns 401/403 with safe error message.
- Add server-side logout endpoint:
  - `POST /api/admin/auth/logout`
  - Clears admin session cookie.
- Add optional session endpoint:
  - `GET /api/admin/auth/session`
  - Returns `{ authenticated: boolean, is_admin: boolean }` for UI bootstrapping.
- Update `requireAdmin` behavior:
  - Primary auth source should be session cookie.
  - Validate session authenticity + expiration.
  - If session contains only access token, re-check admin role against Supabase as needed.
  - Keep `ADMIN_TOKEN` fallback behind explicit compatibility path for local/testing only.
- Update admin UI pages:
  - Remove token input, `Save Session`, and manual token paste instructions.
  - `/admin/login` submits to internal login endpoint (not direct browser call to Supabase).
  - Add `Logout` action visible on admin pages.
  - If unauthenticated, redirect admin pages to `/admin/login`.

## Security Requirements

- Session cookie must be:
  - `HttpOnly`
  - `Secure` in production
  - `SameSite=Lax` (or stricter if no cross-site need)
  - Path-scoped minimally to admin routes if feasible
- Do not store raw admin token in `localStorage` or non-HttpOnly cookies.
- Do not expose Supabase service role key client-side.
- Ensure auth endpoints are uncached (`cache-control: no-store`).
- Validate and handle expired/invalid sessions by clearing cookie and redirecting to login.

## Data/Session Model

- Session payload should include only minimum fields required:
  - `sub` (Supabase user id)
  - `exp` (session expiration)
  - optional `role_snapshot` for fast checks
  - optional opaque reference if backing store is introduced
- Prefer signed/encrypted session value; do not trust unsigned client data.

## API and Routing Changes

- New:
  - `app/api/admin/auth/login/route.ts`
  - `app/api/admin/auth/logout/route.ts`
  - `app/api/admin/auth/session/route.ts` (optional but recommended)
- Update:
  - `src/lib/admin.ts` to read/validate cookie session first.
  - Admin pages under `app/admin/**` to remove token UI and rely on session flow.
- Optional middleware:
  - Redirect unauthenticated requests from `/admin/*` to `/admin/login`.
  - Return 401/403 for `/api/admin/*` when session invalid.

## Compatibility

- Keep `ADMIN_TOKEN` fallback for local scripts/tests initially.
- Mark fallback as deprecated in docs and in code comments.
- Add environment toggle if needed:
  - `ENABLE_LEGACY_ADMIN_TOKEN=true` for temporary support.

## Acceptance Criteria

- Admin can log in at `/admin/login` without seeing/pasting a raw token.
- Admin can refresh `/admin` and remain authenticated via cookie session.
- Admin API calls succeed without `Authorization` header from client JS.
- Logging out invalidates session and blocks subsequent admin actions.
- Non-admin Supabase users cannot access admin routes or mutations.
- No admin token is written to `localStorage`.
- Existing domain tests still pass; auth tests cover session flow.

## Test Plan

- Unit tests:
  - Session creation/verification helpers.
  - `requireAdmin` cookie path (valid, expired, tampered, missing).
  - Non-admin role blocked even with valid Supabase auth.
- Route tests:
  - Login route sets cookie on success.
  - Login route rejects invalid credentials and non-admin users.
  - Logout route clears cookie.
  - Admin API route accepts valid session cookie.
- UI tests:
  - `/admin` no longer renders token input/save-session controls.
  - `/admin/login` success redirects to `/admin`.
  - Unauthenticated access redirects to `/admin/login`.
- Regression tests:
  - Legacy `ADMIN_TOKEN` mode behavior remains test-covered until removed.

## Implementation Notes for AI Agent

- Keep changes scoped to auth/session and admin UI shell only.
- Do not refactor unrelated APIs or database modules.
- Preserve existing admin role check semantics (`role` and `roles[]` across `app_metadata`/`user_metadata`).
- Prefer small, reviewable commits:
  - 1) session primitives + auth routes
  - 2) `requireAdmin` migration
  - 3) admin UI cleanup + redirects
  - 4) tests + docs

## Documentation Updates Required

- `README.md`:
  - Replace bearer-token/localStorage admin instructions with cookie-session flow.
- `docs/server-runbook.md`:
  - Update admin login/logout verification steps.
- Add migration note:
  - Existing admins must sign in again after deployment.
