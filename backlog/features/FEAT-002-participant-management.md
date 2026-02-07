# FEAT-002 — Participant Management

## Summary

Allow admins to create and manage participants who can own one or more squares.

## User Story

As an admin,
I want to manage the list of participants,
So that I can assign squares accurately and track winnings.

## Functional Requirements

- Create participant
- Edit display name
- Optional contact info (admin-only)
- List participants per pool
- Prevent delete if participant owns squares (or require confirmation with unassign)

## UI Requirements

- Admin participants table
- Create/edit modal
- Show square count per participant

## Acceptance Criteria

- Participant can be created and edited
- Participant can own multiple squares
- Delete is blocked or confirmed if squares exist

## Dependencies

- EPIC-002 auth
- EPIC-001 grid
