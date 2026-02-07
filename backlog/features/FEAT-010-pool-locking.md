# FEAT-010 — Pool Locking

## Summary

Allow admin to lock pool to freeze digits and square assignments.

## Rules

- No digit changes after lock
- No square reassignment after lock (unless override mode added later)

## Acceptance Criteria

- Lock timestamp stored
- Write endpoints blocked after lock
