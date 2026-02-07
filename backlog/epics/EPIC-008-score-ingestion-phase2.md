# EPIC-008 — Automated Score Ingestion (Phase 2)

## Summary

Automatically ingest schedules and scores from an external sports API.

## Business Value

Reduces manual admin work during tournament play.

## Scope

- External API integration
- Scheduled polling
- Upsert games
- Auto-finalize

## Risks

- Unofficial APIs unstable
- Paid APIs cost

## Dependencies

- Games + finalize logic complete
