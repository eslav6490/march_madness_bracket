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

- Block unless digits are revealed and pool is locked
- Block if scores missing
- Throw an error if a tie score is detected
- Idempotent via unique constraint

## Acceptance Criteria

- No duplicate payouts
- Correct square resolution
- Stores payout snapshot
- Tie score cannot be finalized

## Dependencies

- Digit randomization
- Payout config
- Squares
