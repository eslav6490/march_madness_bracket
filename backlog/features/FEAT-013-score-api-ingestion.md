# FEAT-013 — Score API Ingestion

## Summary

Fetch games and scores from external provider and update DB.

## Functional Requirements

- Poll endpoint on schedule
- Upsert by external_id
- Update scores/status from API source
- Support game-level override flag
- Persist both API values and admin override values when override exists
- If override exists, admin can select which source is authoritative
- Trigger finalize when final if override is not active and the game round is eligible for payout (`R64`–`Final`)
- Hard-filter play-in / First Four games before any finalize call; they can still be ingested for schedule/score visibility but must never enter the finalization path

## Acceptance Criteria

- Idempotent updates
- Override behavior works at game level
- Admin can switch authoritative source when override exists
- Auto-finalization only runs for payout-eligible rounds and never for play-in games
- Scheduled ingestion jobs do not invoke finalization for excluded rounds, preventing repeated no-payout finalization failures
