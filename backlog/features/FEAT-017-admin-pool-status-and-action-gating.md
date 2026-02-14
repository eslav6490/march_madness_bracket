# FEAT-017 — Admin Pool Status Visibility and Action Gating

## Summary
Show pool status prominently in admin UI and proactively disable blocked actions (with clear reason text) instead of relying on failed API calls.

## Problem
- Admin users currently discover lock constraints only after attempting actions and receiving errors.
- Pool lifecycle state (`draft/open/locked/completed`) is not surfaced clearly in admin UI.

## Goal
- Display pool lifecycle status in admin.
- Disable/annotate controls that are invalid in current state.
- Preserve backend enforcement as source of truth.

## Non-Goals
- No lifecycle rule changes.
- No change to lock prerequisite evaluation logic.

## Functional Requirements
- On `/admin`, add a status panel showing:
  - `pool.status`
  - `locked_at` (from digit map if available)
  - simple explanatory text for current state
- Disable controls in UI when pool is locked:
  - participant create/edit/delete
  - square assignment save
  - game create/update/delete actions (on Games page)
  - payout save action (on Payouts page)
  - digit randomize/reveal controls where invalid
- Keep controls enabled only for valid state transitions:
  - `Lock` disabled when already locked.
- Add inline reason copy near disabled controls (e.g., `Pool is locked; assignments cannot be changed.`).
- Maintain server-side checks as final gate; UI gating is additive.

## Optional API Support
- If needed for richer status detail, add non-mutating endpoint:
  - `GET /api/admin/pool/[poolId]/lock/prerequisites`
  - response includes prerequisite checklist and current pass/fail status
- Endpoint must remain admin-protected.

## UX Requirements
- Status pill/badge color should communicate state but include text labels.
- Disabled buttons should keep readable labels and show reason text in nearby hint.
- Do not use modal errors for expected locked-state behavior.

## Acceptance Criteria
- Admin can always see current pool status without performing actions.
- Locked-state invalid actions are visually disabled before click.
- Disabled actions include clear reason text.
- Backend still rejects invalid calls if manually invoked.

## Test Plan
- UI tests:
  - When `pool.status = locked`, participant/square/game/payout mutation controls are disabled.
  - Lock button disabled when pool already locked.
  - Disabled reason text is visible.
- Route tests:
  - Existing mutation endpoints still return `pool_locked` for direct API calls.
- Regression tests:
  - In non-locked states, actions remain enabled and functional.

## Implementation Notes for AI Agent
- Reuse existing data load paths; avoid heavy API expansion unless required.
- Add lightweight helper booleans per page (`isLocked`, etc.).
- Do not alter DB schema.

## Documentation Updates Required
- README/admin usage notes: explain visual lock-state behavior in UI.
