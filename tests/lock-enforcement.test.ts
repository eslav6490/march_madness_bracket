/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPoolWithSquares } from '@/lib/pools';
import { createParticipant } from '@/lib/participants';
import { createGame } from '@/lib/games';
import { upsertDigitMap } from '@/lib/digits';
import { ROUND_KEYS } from '@/lib/payouts';
import { createTestDb } from './helpers/db';

const ADMIN_TOKEN = 'test-admin';

async function lockPoolViaApi(db: Awaited<ReturnType<typeof createTestDb>>, poolId: string) {
  vi.doMock('@/lib/db', () => ({ getDb: () => db }));
  const { POST } = await import('../app/api/admin/pool/[poolId]/lock/route');
  const response = await POST(
    new Request('http://localhost', { method: 'POST', headers: { 'x-admin-token': ADMIN_TOKEN } }),
    { params: { poolId } }
  );
  expect(response.status).toBe(200);
}

describe('FEAT-010 pool lock enforcement', () => {
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

  it('blocks admin write endpoints after lock', async () => {
    const poolId = await createPoolWithSquares(db, 'Lock Enforcement Pool');

    // Lock endpoint requires digit map to exist.
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const participant = await createParticipant(db, poolId, 'Existing Participant');
    // FEAT-010 prerequisites: all 100 squares assigned before locking.
    await db.query('update squares set participant_id = $1 where pool_id = $2', [participant.id, poolId]);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'Team A',
      team_b: 'Team B',
      status: 'scheduled',
      score_a: null,
      score_b: null,
      start_time: null
    });

    await lockPoolViaApi(db, poolId);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));

    const participantsRoute = await import('../app/api/admin/pools/[poolId]/participants/route');
    const participantDetailRoute = await import('../app/api/admin/participants/[participantId]/route');
    const squaresRoute = await import('../app/api/admin/pools/[poolId]/squares/route');
    const payoutsRoute = await import('../app/api/admin/pool/[poolId]/payouts/route');
    const gamesRoute = await import('../app/api/admin/pool/[poolId]/games/route');
    const gameDetailRoute = await import('../app/api/admin/pool/[poolId]/games/[gameId]/route');

    const createParticipantResponse = await participantsRoute.POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ display_name: 'Blocked' })
      }),
      { params: { poolId } }
    );
    expect(createParticipantResponse.status).toBe(409);

    const updateParticipantResponse = await participantDetailRoute.PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ display_name: 'Updated' })
      }),
      { params: { participantId: participant.id } }
    );
    expect(updateParticipantResponse.status).toBe(409);

    const deleteParticipantResponse = await participantDetailRoute.DELETE(
      new Request('http://localhost', {
        method: 'DELETE',
        headers: { 'x-admin-token': ADMIN_TOKEN }
      }),
      { params: { participantId: participant.id } }
    );
    expect(deleteParticipantResponse.status).toBe(409);

    const assignSquareResponse = await squaresRoute.PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ row_index: 0, col_index: 0, participant_id: participant.id })
      }),
      { params: { poolId } }
    );
    expect(assignSquareResponse.status).toBe(409);

    const payoutsPayload = ROUND_KEYS.reduce((acc, key) => {
      acc[key] = 12345;
      return acc;
    }, {} as Record<(typeof ROUND_KEYS)[number], number>);

    const postPayoutsResponse = await payoutsRoute.POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN, 'content-type': 'application/json' },
        body: JSON.stringify({ payouts: payoutsPayload })
      }),
      { params: { poolId } }
    );
    expect(postPayoutsResponse.status).toBe(409);

    const createGameResponse = await gamesRoute.POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({
          round_key: 'round_of_64',
          team_a: 'X',
          team_b: 'Y',
          status: 'scheduled'
        })
      }),
      { params: { poolId } }
    );
    expect(createGameResponse.status).toBe(409);

    const patchGameResponse = await gameDetailRoute.PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ status: 'final' })
      }),
      { params: { poolId, gameId: game.id } }
    );
    expect(patchGameResponse.status).toBe(409);

    const deleteGameResponse = await gameDetailRoute.DELETE(
      new Request('http://localhost', { method: 'DELETE', headers: { 'x-admin-token': ADMIN_TOKEN } }),
      { params: { poolId, gameId: game.id } }
    );
    expect(deleteGameResponse.status).toBe(409);
  });

  it('allows finalize and read endpoints after lock', async () => {
    const poolId = await createPoolWithSquares(db, 'Finalize Still Works Pool');

    // Identity permutations: digit 1 => row/col 1.
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const participant = await createParticipant(db, poolId, 'Winner');
    // FEAT-010 prerequisites: all 100 squares assigned before locking.
    await db.query('update squares set participant_id = $1 where pool_id = $2', [participant.id, poolId]);

    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 11,
      score_b: 1,
      start_time: null
    });

    await lockPoolViaApi(db, poolId);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));

    const finalizeRoute = await import('../app/api/admin/pool/[poolId]/games/[gameId]/finalize/route');
    const adminGamesRoute = await import('../app/api/admin/pool/[poolId]/games/route');
    const publicResultsRoute = await import('../app/api/pool/[poolId]/results/route');

    const finalizeResponse = await finalizeRoute.POST(
      new Request('http://localhost', { method: 'POST', headers: { 'x-admin-token': ADMIN_TOKEN } }),
      { params: { poolId, gameId: game.id } }
    );
    expect(finalizeResponse.status).toBe(200);

    const adminReadResponse = await adminGamesRoute.GET(
      new Request('http://localhost', { headers: { 'x-admin-token': ADMIN_TOKEN } }),
      { params: { poolId } }
    );
    expect(adminReadResponse.status).toBe(200);

    const publicReadResponse = await publicResultsRoute.GET(new Request('http://localhost'), { params: { poolId } });
    expect(publicReadResponse.status).toBe(200);
    const publicBody = await publicReadResponse.json();
    expect(publicBody.results).toHaveLength(1);
  });
});
