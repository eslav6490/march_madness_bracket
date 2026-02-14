# FEAT-018 — Admin Loading States and Skeleton UX

## Summary
Improve perceived performance and clarity in admin by adding explicit loading states and skeleton placeholders for key sections.

## Problem
- Admin pages currently show abrupt content jumps and sparse loading feedback.
- Users may interpret empty sections as missing data vs still-loading data.

## Goal
- Provide deterministic loading indicators for major admin data regions.
- Distinguish loading, empty, and error states.

## Non-Goals
- No backend performance optimization work.
- No data model changes.

## Functional Requirements
- `/admin` page:
  - Add loading state for pool/squares fetch.
  - Add independent loading states for participants and digit map.
  - Show skeleton/placeholder cards for grid and tables while loading.
- `/admin/pool/[poolId]/games`:
  - Loading state for initial games fetch and refresh reload.
- `/admin/pool/[poolId]/payouts`:
  - Loading state for initial payouts fetch.
- `/admin/pool/[poolId]/audit`:
  - Loading indicator for initial load and load-more.
- Loading state must be separate from empty state:
  - Example: `No participants yet` appears only after loading complete.

## UX Requirements
- Skeletons should match approximate shape of final UI to reduce layout shift.
- Loading indicators should not block already-rendered sections unnecessarily.
- Buttons that trigger async actions should show disabled + busy text while request pending.

## Acceptance Criteria
- Each major admin panel has explicit loading UI before data arrives.
- Empty-state hints render only after loading completes.
- Error message rendering remains intact and not masked by perpetual loading.

## Test Plan
- UI tests:
  - Assert loading indicator/skeleton appears before mocked fetch resolves.
  - Assert loading indicator disappears after resolve.
  - Assert empty-state text appears only with loaded empty payload.
- Interaction tests:
  - Buttons show busy label/disabled during submit.
- Regression tests:
  - Existing CRUD workflows still complete successfully.

## Implementation Notes for AI Agent
- Use targeted booleans (`isLoadingPool`, `isLoadingParticipants`, etc.) instead of one global flag.
- Keep components client-only where existing pages are client pages.
- Reuse CSS utility classes for loading states.

## Documentation Updates Required
- None required beyond changelog entry.
