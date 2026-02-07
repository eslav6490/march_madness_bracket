# Project Status

Last updated: 2026-02-07

## Summary
- Current working branch: `feat-008-009-analytics`
- Stack: Next.js + Postgres
- Admin access: `ADMIN_TOKEN` header guard only (no Supabase auth yet)

## Epics
- EPIC-001 Core Pool and Grid: Done
- EPIC-002 Auth and Admin Controls: Not started
- EPIC-003 Payout Configuration: Done (versioned payouts + admin editor + public view)
- EPIC-004 Games and Results: Partial (games CRUD + finalization + results API + public results UI done)
- EPIC-005 Analytics and Heatmap: Done (square heatmap + participant leaderboard + public analytics page)
- EPIC-006 Pool Locking and Audit Trail: Not started (basic lock exists for digit map, but no full prerequisites/enforcement)
- EPIC-007 Exports and Sharing: Not started
- EPIC-008 Score Ingestion (Phase 2): Not started

## Features
- FEAT-001 Digit Randomization and Locking: Done
- FEAT-002 Participant Management: Done
- FEAT-003 Admin Square Assignment: Done
- FEAT-004 Payout Admin Editor: Done
- FEAT-005 Game Management (Admin): Done
- FEAT-006 Game Finalization Logic: Done (game_results + finalize endpoint + results API)
- FEAT-007 Public Results View: Done (read-only page consuming results API)
- FEAT-008 Square Heatmap: Done (public `/pool/[poolId]/analytics` + API aggregation)
- FEAT-009 Participant Leaderboard: Done (public `/pool/[poolId]/analytics` + API aggregation)
- FEAT-010 Pool Locking: Done (write endpoints blocked after lock; prerequisites not enforced yet)
- FEAT-011 Audit Log: Not started
- FEAT-012 Export Grid and Results: Not started
- FEAT-013 Score API Ingestion: Not started

## Notes
- Game finalization, public results page, and public analytics are implemented.
- Pool locking prerequisites and enforcement are not implemented.
- Public payouts page is at `/payouts`. Admin payouts editor is at `/admin/pool/[poolId]/payouts`.
- Admin games UI is at `/admin/pool/[poolId]/games`.
- Results:
  - Admin finalize endpoint: `POST /api/admin/pool/[poolId]/games/[gameId]/finalize`
  - Public results endpoint: `GET /api/pool/[poolId]/results`
  - Public results page: `/pool/[poolId]/results`
- Analytics:
  - Public square stats: `GET /api/pool/[poolId]/analytics/squares`
  - Public participant leaderboard: `GET /api/pool/[poolId]/analytics/participants`
  - Public analytics page: `/pool/[poolId]/analytics`
