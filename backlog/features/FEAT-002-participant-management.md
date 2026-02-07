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
- Delete requires explicit unassign confirmation if participant owns squares

## UI Requirements

- Admin participants table
- Create/edit modal
- Show square count per participant
- Confirm + unassign flow before delete when owned squares exist

## Acceptance Criteria

- Participant can be created and edited
- Participant can own multiple squares
- Delete is allowed only after explicit unassign confirmation if squares exist

## Dependencies

- EPIC-002 auth
- EPIC-001 grid
