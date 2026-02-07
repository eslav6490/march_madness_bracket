# EPIC-003 — Payout Configuration

## Summary

Provide configurable per-round payout amounts that are admin-editable and publicly visible.

## Business Value

Supports variable payout structures across rounds while maintaining transparency.

## Scope

- Round definitions
- Payout per round
- Versioned payout config
- Public payouts page

## Stories

- Admin edits payout amounts
- Public views payout table
- System snapshots payout at game finalization

## Acceptance Criteria

- Only admins can edit payouts
- Public can view payouts
- Changes do not alter already-finalized payouts

## Dependencies

- Auth admin controls
- Pool entity
