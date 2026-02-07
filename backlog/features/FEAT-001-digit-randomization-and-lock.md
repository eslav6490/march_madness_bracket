# FEAT-001 — Digit Randomization and Locking

## Summary

Add the ability to randomly assign and reveal the winning and losing score digits (0–9) across the grid axes, then lock them for the remainder of the tournament.

## User Story

As an admin,
I want to randomize and reveal the digit headers after squares are assigned,
So that the pool is fair and cannot be manipulated.

## Description

Each pool has exactly two digit permutations:
- Winning score final digit (rows)
- Losing score final digit (columns)

Admins can randomize these permutations, reveal them publicly, and lock them to prevent further changes.

## Functional Requirements

- Generate two random permutations of digits 0–9
- Store permutations in digit_map record per pool
- Admin can trigger randomization
- Admin can reveal digits
- Admin can lock digits (or lock entire pool)
- Public grid shows digits only after reveal or lock

## Rules

- Digits must be a valid permutation of 0–9 with no duplicates
- Randomization is blocked after lock
- Reveal timestamp is stored
- Lock timestamp is stored
- Only admins can randomize/reveal/lock

## API Endpoints

- POST /api/admin/pools/:id/digits/randomize
- POST /api/admin/pools/:id/digits/reveal
- POST /api/admin/pools/:id/lock

## UI Requirements

Admin:
- Randomize button with confirmation
- Reveal button with confirmation
- Lock button with confirmation
- Show current permutations after randomize

Public:
- Hide digits until revealed
- Show digits as row/column headers after reveal

## Acceptance Criteria

- Randomization produces two valid digit permutations
- Digits are hidden before reveal
- After lock, randomize endpoint fails
- Public grid updates immediately after reveal
- Digit map is used by game finalization logic

## Dependencies

- Pool and grid feature
- Admin RBAC
