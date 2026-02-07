/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { randomUUID } from 'crypto';

import { createPoolWithSquares } from '@/lib/pools';
import { assignSquare } from '@/lib/squares';
import { createParticipant } from '@/lib/participants';
import { createGame } from '@/lib/games';
import { revealDigitMap, upsertDigitMap } from '@/lib/digits';
import { finalizeGame } from '@/lib/results';
import { createTestDb } from './helpers/db';

const ADMIN_TOKEN = 'test-admin';

async function lockPool(db: Awaited<ReturnType<typeof createTestDb>>, poolId: string) {
  await db.query("update pools set status = 'locked' where id = $1", [poolId]);
}

describe('FEAT-006 game finalization', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
    process.env.ADMIN_TOKEN = ADMIN_TOKEN;
  });

  afterEach(async () => {
    await db.end();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('finalize creates exactly one game_result and is idempotent', async () => {
    const poolId = await createPoolWithSquares(db, 'Finalize Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 81,
      score_b: 72,
      start_time: null
    });

    const first = await finalizeGame(db, poolId, game.id);
    const second = await finalizeGame(db, poolId, game.id);

    expect(second.id).toBe(first.id);

    const rows = await db.query('select * from game_results where pool_id = $1 and game_id = $2', [poolId, game.id]);
    expect(rows.rows).toHaveLength(1);
  });

  it('uses digit_maps permutations to resolve the correct square', async () => {
    const poolId = await createPoolWithSquares(db, 'Digit Mapping Pool');

    const winningDigits = [7, 0, 1, 2, 3, 4, 5, 6, 8, 9];
    const losingDigits = [0, 2, 1, 3, 4, 5, 6, 7, 8, 9];
    await upsertDigitMap(db, poolId, winningDigits, losingDigits);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    // win_digit=7 -> row_index=0; lose_digit=2 -> col_index=1
    const square = await db.query(
      'select id from squares where pool_id = $1 and row_index = 0 and col_index = 1',
      [poolId]
    );
    const winningSquareId = String(square.rows[0].id);

    const participant = await createParticipant(db, poolId, 'Winner');
    await assignSquare(db, poolId, 0, 1, participant.id);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 17,
      score_b: 12,
      start_time: null
    });

    const result = await finalizeGame(db, poolId, game.id);
    expect(result.winning_square_id).toBe(winningSquareId);
    expect(result.winning_participant_id).toBe(participant.id);
    expect(result.win_digit).toBe(7);
    expect(result.lose_digit).toBe(2);
  });

  it('unowned square yields winning_participant_id null', async () => {
    const poolId = await createPoolWithSquares(db, 'Unowned Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_32',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 30,
      score_b: 19,
      start_time: null
    });

    const result = await finalizeGame(db, poolId, game.id);
    expect(result.winning_participant_id).toBeNull();
  });

  it('uses the latest payout version at time of finalization', async () => {
    const poolId = await createPoolWithSquares(db, 'Latest Payout Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    const newerAmount = 9999;
    await db.query(
      'insert into payout_configs (id, pool_id, round_key, amount_cents, effective_at) values ($1, $2, $3, $4, $5)',
      [randomUUID(), poolId, 'round_of_64', newerAmount, new Date('2099-01-01T00:00:00.000Z')]
    );

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 44,
      score_b: 31,
      start_time: null
    });

    const result = await finalizeGame(db, poolId, game.id);
    expect(result.payout_amount_cents).toBe(newerAmount);
  });

  it('blocks finalization when game is not final', async () => {
    const poolId = await createPoolWithSquares(db, 'Not Final Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    const game = await createGame(db, poolId, {
      round_key: 'elite_8',
      team_a: 'A',
      team_b: 'B',
      status: 'scheduled',
      score_a: 10,
      score_b: 9,
      start_time: null
    });

    await expect(finalizeGame(db, poolId, game.id)).rejects.toThrow('game_not_final');
  });

  it('blocks finalization when scores are missing', async () => {
    const poolId = await createPoolWithSquares(db, 'Missing Scores Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    const game = await createGame(db, poolId, {
      round_key: 'elite_8',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: null,
      score_b: 9,
      start_time: null
    });

    await expect(finalizeGame(db, poolId, game.id)).rejects.toThrow('scores_missing');
  });

  it('blocks finalization when digits are not visible (not revealed or locked)', async () => {
    const poolId = await createPoolWithSquares(db, 'Hidden Digits Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await lockPool(db, poolId);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 10,
      score_b: 9,
      start_time: null
    });

    await expect(finalizeGame(db, poolId, game.id)).rejects.toThrow('digits_not_visible');
  });

  it('blocks finalization when pool is not locked (even if digits are revealed)', async () => {
    const poolId = await createPoolWithSquares(db, 'Unlocked Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 10,
      score_b: 9,
      start_time: null
    });

    await expect(finalizeGame(db, poolId, game.id)).rejects.toThrow('pool_not_locked');
  });

  it('requires admin token for the finalize API route', async () => {
    const poolId = await createPoolWithSquares(db, 'Finalize API Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 81,
      score_b: 72,
      start_time: null
    });

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/games/[gameId]/finalize/route');

    const unauthorized = await POST(new Request('http://localhost', { method: 'POST' }), { params: { poolId, gameId: game.id } });
    expect(unauthorized.status).toBe(403);

    const authorized = await POST(
      new Request('http://localhost', { method: 'POST', headers: { 'x-admin-token': ADMIN_TOKEN } }),
      { params: { poolId, gameId: game.id } }
    );
    expect(authorized.status).toBe(200);
  });

  it('public results endpoint returns joined game fields and winner display name', async () => {
    const poolId = await createPoolWithSquares(db, 'Public Results Pool');

    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await revealDigitMap(db, poolId);
    await lockPool(db, poolId);

    // Make sure the winning square is owned so we can assert winner display name.
    const participant = await createParticipant(db, poolId, 'Winner Name');
    await assignSquare(db, poolId, 1, 1, participant.id);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 11,
      score_b: 1,
      start_time: null
    });

    await finalizeGame(db, poolId, game.id);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { GET } = await import('../app/api/pool/[poolId]/results/route');

    const response = await GET(new Request('http://localhost'), { params: { poolId } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].team_a).toBe('A');
    expect(body.results[0].winning_participant_name).toBe('Winner Name');
  });
});
