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

Admins can randomize these permutations and reveal them publicly.
A single pool lock action freezes digit changes and square assignment changes.

## Functional Requirements

- Generate two random permutations of digits 0–9
- Store permutations in digit_map record per pool
- Admin can trigger randomization
- Admin can reveal digits
- Admin can lock the pool
- Locking the pool makes digits publicly visible immediately

## Rules

- Digits must be a valid permutation of 0–9 with no duplicates
- Randomization is blocked after lock
- Reveal timestamp is stored
- Pool lock timestamp is stored
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
- Hide digits until revealed or locked
- Show digits as row/column headers after reveal or lock

## Acceptance Criteria

- Randomization produces two valid digit permutations
- Digits are hidden before reveal
- After lock, randomize endpoint fails
- Public grid updates immediately after reveal or lock
- Digit map is used by game finalization logic

## Dependencies

- Pool and grid feature
- Admin RBAC
