# FEAT-004 — Payout Admin Editor

## Summary

Admin UI to edit payout tracking amounts per tournament round.

## Functional Requirements

- Display rounds list (`R64`, `R32`, `S16`, `E8`, `F4`, `Final`)
- Editable payout amount per round
- Store payout amounts in integer cents
- Save creates new version rows
- Show last updated time
- Allow editing payouts after games finalize; finalized games keep payout snapshots

## Acceptance Criteria

- Edits require admin
- Public view reflects latest config
- Historical versions preserved
- Finalization is blocked if the game's round has no configured payout

## Dependencies

- EPIC-003 payout configuration
