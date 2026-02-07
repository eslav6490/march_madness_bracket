# FEAT-006 — Game Finalization Logic

## Summary

Compute winning digits, resolve square owner, and snapshot payout when a game becomes final.

## Algorithm

- Winner = higher score
- win_digit = winner_score % 10
- lose_digit = loser_score % 10
- Map digits to row/col via digit map
- Resolve square owner
- Snapshot payout by round
- Insert game_result once

## Rules

- Block if digits not revealed or pool not locked
- Block if scores missing
- Idempotent via unique constraint

## Acceptance Criteria

- No duplicate payouts
- Correct square resolution
- Stores payout snapshot

## Dependencies

- Digit randomization
- Payout config
- Squares
