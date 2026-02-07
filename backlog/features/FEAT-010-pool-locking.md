# FEAT-010 — Pool Locking

## Summary

Allow admin to lock pool to freeze digits and square assignments.

## Rules

- Single lock action at pool level (`locked_at`)
- No digit changes after lock
- No square reassignment after lock (unless override mode added later)
- Locking immediately makes digits visible to the public
- Lock is allowed only when:
  - all 100 squares are assigned
  - at least one participant exists
  - digits have been randomized
  - payouts are configured for all rounds

## Acceptance Criteria

- Lock timestamp stored
- Write endpoints blocked after lock
- Lock prerequisites are enforced
