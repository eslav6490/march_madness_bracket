# EPIC-004 — Games and Results Processing

## Summary

Manage tournament games, record final scores, and compute square winners and payouts using the digit grid.

## Business Value

Automates the core scoring logic and removes manual winner calculation.

## Scope

- Games table
- Manual score entry
- Finalization logic
- Game results storage
- Results UI

## Stories

- Admin creates game
- Admin enters scores
- System finalizes game
- System computes winning square and payout
- Public results page shows winners

## Acceptance Criteria

- Finalization is idempotent
- Winner always higher score
- Uses single grid digit map
- Unowned square handled

## Dependencies

- Digit map feature
- Payout config
- Squares grid
