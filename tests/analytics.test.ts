/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPoolWithSquares } from '@/lib/pools';
import { createParticipant } from '@/lib/participants';
import { assignSquare } from '@/lib/squares';
import { createGame } from '@/lib/games';
import { revealDigitMap, upsertDigitMap } from '@/lib/digits';
import { finalizeGame } from '@/lib/results';
import { DEFAULT_PAYOUTS_CENTS } from '@/lib/payouts';

import { createTestDb } from './helpers/db';

describe('EPIC-005 analytics endpoints', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(async () => {
    await db.end();
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function lockPool(poolId: string) {
    await db.query("update pools set status = 'locked' where id = $1", [poolId]);
  }

  it('computes square stats (hits + payout) and participant leaderboard (excluding unowned wins)', async () => {
    const poolId = await createPoolWithSquares(db, 'Analytics Pool');

    // Identity permutations: digit N => row/col N.
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(poolId);

    const bob = await createParticipant(db, poolId, 'Bob');
    const alice = await createParticipant(db, poolId, 'Alice');
    const aaron = await createParticipant(db, poolId, 'Aaron'); // no wins
    const zoe = await createParticipant(db, poolId, 'Zoe'); // no wins

    await assignSquare(db, poolId, 1, 1, alice.id);
    await assignSquare(db, poolId, 2, 2, bob.id);

    const game1 = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 11,
      score_b: 1,
      start_time: null
    });
    const game2 = await createGame(db, poolId, {
      round_key: 'round_of_32',
      team_a: 'C',
      team_b: 'D',
      status: 'final',
      score_a: 22,
      score_b: 2,
      start_time: null
    });
    const game3 = await createGame(db, poolId, {
      round_key: 'sweet_16',
      team_a: 'E',
      team_b: 'F',
      status: 'final',
      score_a: 33,
      score_b: 3,
      start_time: null
    });

    await finalizeGame(db, poolId, game1.id);
    await finalizeGame(db, poolId, game2.id);
    await finalizeGame(db, poolId, game3.id); // winning square (3,3) is unowned

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));

    const squaresRoute = await import('../app/api/pool/[poolId]/analytics/squares/route');
    const participantsRoute = await import('../app/api/pool/[poolId]/analytics/participants/route');

    const squaresResponse = await squaresRoute.GET(new Request('http://localhost'), { params: { poolId } });
    expect(squaresResponse.status).toBe(200);
    const squaresBody = await squaresResponse.json();

    expect(squaresBody.totals.total_games_finalized).toBe(3);
    const expectedTotalPayout =
      DEFAULT_PAYOUTS_CENTS.round_of_64 + DEFAULT_PAYOUTS_CENTS.round_of_32 + DEFAULT_PAYOUTS_CENTS.sweet_16;
    expect(squaresBody.totals.total_payout_cents).toBe(expectedTotalPayout);

    expect(squaresBody.squares).toHaveLength(100);

    const cell11 = squaresBody.squares.find((s: any) => s.row_index === 1 && s.col_index === 1);
    expect(cell11.hit_count).toBe(1);
    expect(cell11.total_payout_cents).toBe(DEFAULT_PAYOUTS_CENTS.round_of_64);
    expect(cell11.owner_display_name).toBe('Alice');

    const cell22 = squaresBody.squares.find((s: any) => s.row_index === 2 && s.col_index === 2);
    expect(cell22.hit_count).toBe(1);
    expect(cell22.total_payout_cents).toBe(DEFAULT_PAYOUTS_CENTS.round_of_32);
    expect(cell22.owner_display_name).toBe('Bob');

    const cell33 = squaresBody.squares.find((s: any) => s.row_index === 3 && s.col_index === 3);
    expect(cell33.hit_count).toBe(1);
    expect(cell33.total_payout_cents).toBe(DEFAULT_PAYOUTS_CENTS.sweet_16);
    expect(cell33.owner_display_name).toBeNull();

    const cell00 = squaresBody.squares.find((s: any) => s.row_index === 0 && s.col_index === 0);
    expect(cell00.hit_count).toBe(0);
    expect(cell00.total_payout_cents).toBe(0);

    const participantsResponse = await participantsRoute.GET(new Request('http://localhost'), { params: { poolId } });
    expect(participantsResponse.status).toBe(200);
    const participantsBody = await participantsResponse.json();

    expect(participantsBody.totals.total_games_finalized).toBe(3);
    expect(participantsBody.totals.total_payout_cents).toBe(expectedTotalPayout);
    expect(participantsBody.totals.total_participants).toBe(4);

    expect(participantsBody.leaderboard).toHaveLength(4);

    // Sorted by payout desc, then wins desc, then name asc.
    expect(participantsBody.leaderboard[0].display_name).toBe('Bob');
    expect(participantsBody.leaderboard[0].wins_count).toBe(1);
    expect(participantsBody.leaderboard[0].total_payout_cents).toBe(DEFAULT_PAYOUTS_CENTS.round_of_32);

    expect(participantsBody.leaderboard[1].display_name).toBe('Alice');
    expect(participantsBody.leaderboard[1].wins_count).toBe(1);
    expect(participantsBody.leaderboard[1].total_payout_cents).toBe(DEFAULT_PAYOUTS_CENTS.round_of_64);

    // Participants with no wins are included and sorted by name (asc) within the 0/0 group.
    expect(participantsBody.leaderboard[2].display_name).toBe('Aaron');
    expect(participantsBody.leaderboard[2].wins_count).toBe(0);
    expect(participantsBody.leaderboard[2].total_payout_cents).toBe(0);

    expect(participantsBody.leaderboard[3].display_name).toBe('Zoe');
    expect(participantsBody.leaderboard[3].wins_count).toBe(0);
    expect(participantsBody.leaderboard[3].total_payout_cents).toBe(0);

    // Unowned-square win is excluded from leaderboard totals per participant (no one has sweet_16 payout).
    const sweet16Winner = participantsBody.leaderboard.find((p: any) => p.total_payout_cents === DEFAULT_PAYOUTS_CENTS.sweet_16);
    expect(sweet16Winner).toBeUndefined();

    // Make sure we didn't accidentally use the unused variables (helps keep scenario readable).
    expect(aaron.display_name).toBe('Aaron');
    expect(zoe.display_name).toBe('Zoe');
  });
});

