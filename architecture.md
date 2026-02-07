# March Madness Squares Web App — Architecture

This document describes the system using a lightweight C4-style model: Context, Containers, and Key Decisions.

---

## System Context (Level 1)

### Primary Actors

- Admin
  - Creates and configures a pool
  - Manages participants and square assignments
  - Randomizes and reveals digits
  - Edits payouts per round
  - Enters or validates game scores

- Public User / Participant
  - Views grid and square ownership
  - Views payout table
  - Views game results and analytics

### External Systems (Optional / Phase 2)

- Sports Score API Provider
  - Provides schedule and final scores
  - Polled by scheduled jobs
  - Treated as unreliable unless paid-tier SLA

---

## Containers (Level 2)

### 1. Web App (Next.js)

Responsibilities:
- Renders public pages:
  - Grid
  - Payouts
  - Results
  - Analytics heatmap
- Renders admin UI:
  - Participant management
  - Square assignment
  - Digit randomization and locking
  - Payout editing
  - Game entry and finalization
- Hosts API routes and server actions for:
  - Admin mutations
  - Game finalization logic
  - Aggregation queries

Key properties:
- Server-side rendering for core pages
- Role-aware UI (admin vs public)
- Shares code between frontend and backend logic

---

### 2. Database (Postgres)

Responsibilities:
- Source of truth for all state
- Stores:
  - Pools
  - Participants
  - Squares (100 per pool)
  - Digit maps (two permutations of 0–9)
  - Payout configurations (versioned)
  - Games and scores
  - Game results with payout snapshots

Key constraints:
- Unique square per (pool_id, row_index, col_index)
- Max 100 squares per pool
- Unique game_result per (pool_id, game_id)
- Immutable payout snapshot stored at finalization

---

### 3. Auth Provider (Supabase Auth or Clerk)

Responsibilities:
- User authentication
- Session management
- Role mapping (admin vs non-admin)

Key properties:
- Only admins can call write endpoints
- Public read endpoints require no login

---

### 4. Scheduled Job Runner (Phase 2)

Responsibilities:
- Periodically fetch game schedules and scores
- Upsert games
- Mark games final
- Trigger finalize logic

Options:
- Vercel cron jobs
- Supabase scheduled functions

---

## Core Domain Model

Key entities:

- Pool
  - One grid per tournament
  - Status: draft → open → locked → completed

- Square
  - One of 100 cells (10×10)
  - Optional participant owner

- DigitMap
  - Two permutations of digits 0–9:
    - Winning score axis
    - Losing score axis
  - Reveal + lock timestamps

- Game
  - Round
  - Teams
  - Scores
  - Status

- GameResult
  - Computed once per final game
  - Winning digit, losing digit
  - Winning square
  - Winning participant (nullable)
  - Payout snapshot

---

## Key Decisions

### One Grid for Entire Tournament

Decision:
- Use a single 10×10 grid and digit map for all games across all rounds.

Reason:
- Matches common squares pool rules
- Simplifies data model and UX
- Makes analytics meaningful across the full tournament

---

### Immutable Finalization

Decision:
- When a game is finalized:
  - Compute digits
  - Resolve square
  - Snapshot payout
  - Write game_result once

Reason:
- Prevents double payouts
- Protects against later payout config edits
- Ensures auditability

Implementation:
- Unique DB constraint on (pool_id, game_id)
- Finalize endpoint is idempotent

---

### Admin-Driven Assignment First

Decision:
- Admin assigns squares directly in v1.

Reason:
- Faster build
- Avoids payment and race-condition complexity
- Matches small private pool workflows

Future:
- Can add self-serve claiming with reservation + payment flags.

---

### Manual Score Entry First

Decision:
- Manual game score entry in v1.
- API ingestion in v2.

Reason:
- External sports APIs are unstable or paid
- Manual entry is simple and reliable
- Data model already supports later automation

---

### Public Read, Restricted Write

Decision:
- Grid, payouts, results, analytics are public-readable.
- All mutations require admin role.

Reason:
- Encourages transparency
- Minimizes auth friction for viewers
