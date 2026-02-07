# EPIC-002 — Authentication and Admin Controls

## Summary

Add authentication and role-based access control so that only admins can modify pool data while the public can view grids, payouts, and results.

## Business Value

Prevents unauthorized edits and protects pool integrity while keeping public transparency.

## Scope

- User authentication
- Admin role model
- Route and API protection
- Admin UI shell

## In Scope

- Auth provider integration
- Admin role flag
- Protected admin routes
- API middleware for role checks

## Out of Scope

- Complex user profiles
- Social features
- Self-serve purchasing flows

## Stories

- User can sign in
- Admin role can be assigned
- Admin routes require admin role
- Public routes require no login

## Acceptance Criteria

- Non-admin users cannot access admin pages
- Non-admin users cannot call write endpoints
- Public pages remain accessible without login

## Dependencies

- Project setup
- Database user table or auth provider role mapping
