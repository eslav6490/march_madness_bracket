# FEAT-015 — Public Global Navigation Bar

## Summary
Add a consistent top navigation bar across public pages so users can move between Grid, Payouts, Results, and Analytics without manually editing URLs or using browser back.

## Problem
- Public pages currently expose links inconsistently.
- `/payouts`, `/pool/[poolId]/results`, and `/pool/[poolId]/analytics` do not share a unified navigation model.
- Users can lose context when trying to switch between views for the same pool.

## Goal
- Provide one shared public navigation pattern visible on all public pages.
- Keep links pool-aware where applicable.
- Clearly indicate the active page.

## Non-Goals
- No authentication changes.
- No domain logic changes for pools/results/payout calculations.
- No redesign of core page content beyond navigation shell.

## Functional Requirements
- Introduce a shared public navigation component (server-safe) used by:
  - `app/page.tsx`
  - `app/payouts/page.tsx`
  - `app/pool/[poolId]/results/page.tsx`
  - `app/pool/[poolId]/analytics/page.tsx`
- Navigation must include links:
  - `Grid`
  - `Payouts`
  - `Results`
  - `Analytics`
- Route mapping:
  - Grid: `/`
  - Payouts: `/payouts`
  - Results: `/pool/[poolId]/results`
  - Analytics: `/pool/[poolId]/analytics`
- Active route state must be visually distinct (via class or `aria-current="page"`).
- On pages with `poolId`, links for Results/Analytics must target the same `poolId`.
- On `/payouts`, use default pool id (same source as page data) to generate Results/Analytics links.

## UX Requirements
- Navigation should appear near top-level header and remain consistent in order and styling.
- Navigation must be keyboard accessible and screen-reader accessible.
- Active state must have sufficient contrast and not rely only on color.

## Acceptance Criteria
- Every public page listed above displays the same nav links in same order.
- Clicking nav links preserves pool context for Results/Analytics pages.
- Active page is clearly marked and exposed with `aria-current="page"`.
- No broken links for default pool scenarios.

## Test Plan
- Unit/UI tests:
  - Render nav on each target page and assert all four links exist.
  - Assert active state present on the current page link.
  - Assert Results/Analytics href includes expected `poolId` on dynamic pages.
  - Assert `/payouts` nav links resolve using default pool id.
- Accessibility checks:
  - Ensure active link includes `aria-current="page"`.
  - Tab order reaches all nav links.
- Regression checks:
  - Existing page content still renders.
  - Existing results/analytics route behavior unchanged.

## Implementation Notes for AI Agent
- Prefer a reusable component under `src/components/`.
- Pass `poolId` and `activeKey` props from each page.
- Keep styling changes in `app/globals.css` scoped to navigation classes.
- Do not refactor unrelated page content.

## Documentation Updates Required
- Update README public routes section to mention unified top navigation.
