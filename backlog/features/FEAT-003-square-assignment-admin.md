# FEAT-003 — Admin Square Assignment

## Summary

Enable admins to assign, move, and clear square ownership in the 10×10 grid.

## User Story

As an admin,
I want to assign participants to specific squares,
So that the grid reflects paid entries.

## Functional Requirements

- Click square → assign participant
- Change square owner
- Clear square owner
- Prevent double assignment
- Allow same participant on multiple squares

## UI Requirements

- Clickable admin grid
- Assign dialog with participant picker
- Visual indicator for filled vs empty

## Acceptance Criteria

- Each square has at most one owner
- Assignment updates public grid instantly
- Admin-only action

## Dependencies

- Participant management
- Grid rendering
