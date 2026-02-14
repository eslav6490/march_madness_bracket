# FEAT-016 — Admin Subnav and Breadcrumbs

## Summary
Add a consistent admin pool sub-navigation and breadcrumbs on admin subpages (Games, Payouts, Audit) with active-state highlighting.

## Problem
- Admin subpages are reachable but discoverability is weak.
- Users can navigate from `/admin` to tools, but once inside a tool page there is no strong local information architecture.

## Goal
- Add a shared admin subnav and breadcrumb trail across tool pages.
- Keep pool context visible and navigation one-click.

## Non-Goals
- No changes to admin auth/session flow.
- No feature-level domain changes to games/payouts/audit behavior.

## Functional Requirements
- Add shared admin pool navigation component used by:
  - `app/admin/pool/[poolId]/games/page.tsx`
  - `app/admin/pool/[poolId]/payouts/page.tsx`
  - `app/admin/pool/[poolId]/audit/page.tsx`
- Add breadcrumb row on each of these pages:
  - `Admin` → `/admin`
  - `Pool {poolId}` (non-clickable text acceptable)
  - Current page label (`Games`/`Payouts`/`Audit`)
- Add subnav links (same order on each page):
  - `Games`
  - `Payouts`
  - `Audit`
  - optional `Back to Admin`
- Active page link must be visually distinct and include `aria-current="page"`.
- Existing logout UX must remain visible and functional.

## UX Requirements
- Breadcrumb should be compact, above page title or directly below title.
- Subnav should be visibly grouped from page action buttons.
- Mobile layout must wrap cleanly with no overlap.

## Acceptance Criteria
- All three admin tool pages show identical subnav set and breadcrumbs.
- Active page is clearly highlighted and correctly announced to assistive tech.
- Navigating between Games/Payouts/Audit requires one click and preserves pool id.
- Logout button still works from each subpage.

## Test Plan
- UI tests:
  - Each page renders breadcrumb with expected segments.
  - Each page renders subnav links with correct hrefs containing `poolId`.
  - Active link on each page has `aria-current="page"`.
- Regression tests:
  - Existing API interactions on Games/Payouts/Audit continue to function.
  - No session guard regressions.

## Implementation Notes for AI Agent
- Implement one reusable component for admin pool nav and breadcrumb to avoid drift.
- Keep existing page content and forms unchanged outside header/nav area.
- Reuse existing button/link classes where possible.

## Documentation Updates Required
- Update README admin section to mention Games/Payouts/Audit in-page navigation.
