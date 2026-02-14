# FEAT-019 — Mobile Horizontal Grid/Heatmap Scroll + Analytics Digit Headers

## Summary
Preserve full 10x10 mental model on small screens by using horizontal scrolling for the public grid and analytics heatmap. Also show revealed digit assignments on analytics headers once digits are visible.

## Problem
- Current mobile CSS collapses 10-column grid layouts into fewer columns, which breaks row/column comprehension.
- Analytics heatmap currently lacks explicit row/column digit assignment context.

## Goal
- Keep 10-column structures intact on mobile via horizontal scroll containers.
- Add digit header context to analytics heatmap once digits are revealed.

## Non-Goals
- No changes to payout math or result calculations.
- No changes to lock/reveal business rules.

## Functional Requirements
- Public grid (`/`) on small viewports:
  - Keep `11` columns (header + 10 data columns) structurally intact.
  - Wrap in horizontal scroll container instead of reducing to 5/6 columns.
- Analytics heatmap (`/pool/[poolId]/analytics`) on small viewports:
  - Keep 10 columns intact; enable horizontal scrolling.
- Analytics digit headers:
  - Add row and column digit headers to heatmap view.
  - Digits must follow existing visibility rules:
    - hidden (`?`) until visible/revealed per pool state.
    - shown when revealed/locked (same logic as public grid).
  - Header digits must correspond to pool digit map assignment used for scoring.
- If no digit map exists, show neutral placeholder headers (`?`) with hint message.

## Data Requirements
- Analytics page must have access to pool digit map + visibility state.
- Reuse existing digit visibility logic from `src/lib/digits` (single source of truth).

## UX Requirements
- Horizontal scroll container should show subtle overflow affordance.
- Header cells should remain visually distinct from metric cells.
- Tooltip/title content for each heatmap square remains available.

## Acceptance Criteria
- On mobile widths, public grid and analytics heatmap remain 10-column layouts with horizontal scrolling.
- Analytics displays row/column digit headers.
- Hidden/revealed behavior for analytics digit headers matches public grid behavior exactly.

## Test Plan
- Responsive UI tests:
  - At mobile viewport, assert container has horizontal overflow and 10-column layout still rendered.
- Analytics behavior tests:
  - With unrevealed digits, headers display `?`.
  - With revealed digits, headers display actual assigned digits.
  - Header digits match digit map values for row/column indices.
- Regression tests:
  - Existing heatmap metrics and leaderboard rendering unchanged.

## Implementation Notes for AI Agent
- Prefer CSS changes in `app/globals.css` (avoid per-page hacks).
- Add a shared scroll wrapper class for reusable behavior.
- For analytics headers, extend server page props passed into `analytics-client.tsx` with digit header data.
- Do not duplicate digit visibility logic in client components.

## Documentation Updates Required
- README analytics section: note mobile horizontal scroll + digit headers behavior.
