# FEAT-013 — Score API Ingestion

## Summary

Fetch games and scores from external provider and update DB.

## Functional Requirements

- Poll endpoint on schedule
- Upsert by external_id
- Update scores/status
- Trigger finalize when final

## Acceptance Criteria

- Idempotent updates
- Admin override blocks further updates for that game
