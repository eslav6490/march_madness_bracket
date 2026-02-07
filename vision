# March Madness Squares Web App — Vision

## Problem

Running a March Madness squares competition manually is error-prone and time-consuming. Common pain points include:
- Manually building and sharing the 10×10 grid
- Randomizing digits fairly and transparently
- Tracking who owns which squares (especially when people buy multiple)
- Calculating winners across dozens of games and rounds
- Applying different payouts per round
- Summarizing results and total winnings per participant

Most pools today rely on spreadsheets and manual score checking, which does not scale well and reduces trust and transparency.

## Goals

Build a lightweight web app that manages a full-tournament squares pool using a single 10×10 grid.

Core goals:

- Provide a visible, always-available 10×10 squares grid for the entire tournament
- Allow admins to assign participants to specific squares
- Support multiple squares per participant, capped at 100 total squares
- Randomly assign and reveal digit headers (0–9) for winning and losing score digits
- Lock digit assignments once revealed
- Configure payouts per round (admin editable, publicly visible)
- Track tournament games and final scores
- Automatically determine square winners per game using score last digits
- Compute payouts and participant totals automatically
- Provide results views and analytics:
  - Per-game winners
  - Per-participant totals
  - Square “hit count” and payout heatmap

## Non-Goals (Initial Versions)

The following are explicitly out of scope for the first release:

- Payment processing or checkout flows
- Automated user self-service square purchasing
- Complex bracket prediction features
- Multi-grid-per-round models (one grid is used for the entire tournament)
- Real-time live score streaming (manual entry first; API ingestion later)
- Native mobile apps
- Advanced social features (chat, comments, reactions)
- Gambling compliance tooling

## Success Criteria

The app is successful if:

- An admin can fully configure and run a pool without spreadsheets
- Participants can clearly see the grid, payouts, and results
- Game winners and payouts are computed correctly and consistently
- The system prevents invalid states (duplicate squares, digit reshuffles after lock, double payouts)
- The full tournament can be managed end-to-end in the app
