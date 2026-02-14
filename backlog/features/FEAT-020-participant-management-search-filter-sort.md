# FEAT-020 — Participant Management Search, Filter, and Sort

## Summary
Improve admin participant management by adding search/filter/sort controls and a focused "unassigned squares" view to reduce operational friction.

## Problem
- Participant list becomes hard to manage as pool size grows.
- Assigning remaining squares is inefficient without focused views.

## Goal
- Make participant discovery fast and assignment workflow more targeted.

## Non-Goals
- No changes to participant schema.
- No changes to assignment write API contracts.

## Functional Requirements
- On `/admin` participants panel:
  - Add text search input filtering by participant display name (case-insensitive).
  - Add sort control options:
    - Name A→Z
    - Name Z→A
    - Squares descending
    - Squares ascending
  - Add filter toggle:
    - `Show only participants with 0 squares` (optional but useful)
- On assignment panel / grid workflow:
  - Add toggle `Show only unassigned squares`.
  - When enabled, grid visually de-emphasizes assigned squares or hides them from selectable set.
  - Selected-square behavior must remain coherent when filter toggles on/off.
- Display result counts:
  - `X of Y participants shown`
  - `N unassigned squares remaining`

## UX Requirements
- Search/filter/sort controls should be compact and placed above participant table.
- Controls must not block existing create/edit/delete actions.
- Filter states should update instantly client-side for current loaded data.

## Acceptance Criteria
- Admin can find a participant quickly via search.
- Admin can reorder participant list by selected sort.
- Admin can isolate unassigned squares during assignment workflow.
- Existing participant CRUD and assignment flows continue to work.

## Test Plan
- UI tests:
  - Search filters participant table as user types.
  - Sort options produce expected ordering deterministically.
  - `0 squares` filter only shows participants with no ownership.
  - Unassigned-squares toggle affects grid display/selectability as specified.
- Regression tests:
  - Participant create/edit/delete still update list correctly under active filters.
  - Assignment save still updates square owner and participant square counts.

## Implementation Notes for AI Agent
- Compute filtered/sorted arrays via `useMemo` to avoid unnecessary rerenders.
- Keep authoritative data in existing state; derive views without mutating source arrays.
- Reuse existing `square_count` data from participants API response.

## Documentation Updates Required
- README admin section: mention participant search/filter/sort and unassigned-squares mode.
