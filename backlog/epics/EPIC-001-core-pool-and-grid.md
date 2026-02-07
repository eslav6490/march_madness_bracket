# EPIC-001 — Core Pool and Grid Management

## Summary

Implement the foundational pool and 10×10 squares grid system, including pool creation, square storage, public grid display, and admin square assignment.

## Business Value

This epic delivers the core value of the product: a visible, authoritative squares grid that replaces spreadsheets and manual tracking.

## Scope

- Pool entity and lifecycle status
- Automatic creation of 100 squares per pool
- Public grid view
- Admin participant management
- Admin square assignment and reassignment
- Support multiple squares per participant
- Enforce max 100 assigned squares

## In Scope

- DB schema for pools, participants, squares
- Public grid page
- Admin grid editor
- Assign / move / clear square ownership
- Filled-square counter

## Out of Scope

- Digit randomization
- Payout configuration
- Game results
- Analytics
- Self-serve purchasing

## Stories

- Create pool with 100 generated squares
- View public grid for a pool
- Create and edit participants
- Assign participant to a square
- Move participant between squares
- Remove participant from square

## Acceptance Criteria

- Exactly 100 squares exist per pool
- No square can have more than one owner
- A participant can own multiple squares
- Public users can view grid without login
- Only admins can modify assignments

## Dependencies

- Project setup
- Auth with admin role support
