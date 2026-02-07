/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPoolWithSquares } from '@/lib/pools';
import { createParticipant } from '@/lib/participants';
import { createGame } from '@/lib/games';
import { upsertDigitMap } from '@/lib/digits';
import { ROUND_KEYS, DEFAULT_PAYOUTS_CENTS } from '@/lib/payouts';
import { createTestDb } from './helpers/db';

const ADMIN_TOKEN = 'test-admin';

describe('FEAT-011 audit log', () => {
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

  it('writes audit events for lock, payout update, and game finalize', async () => {
    const poolId = await createPoolWithSquares(db, 'Audit Pool');

    // Lock requires digit map.
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));

    const payoutsRoute = await import('../app/api/admin/pool/[poolId]/payouts/route');
    const updated = ROUND_KEYS.reduce((acc, key, index) => {
      acc[key] = DEFAULT_PAYOUTS_CENTS[key] + (index + 1) * 123;
      return acc;
    }, {} as Record<(typeof ROUND_KEYS)[number], number>);

    const payoutsResponse = await payoutsRoute.POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN, 'content-type': 'application/json' },
        body: JSON.stringify({ payouts: updated })
      }),
      { params: { poolId } }
    );
    expect(payoutsResponse.status).toBe(200);

    const lockRoute = await import('../app/api/admin/pool/[poolId]/lock/route');
    const lockResponse = await lockRoute.POST(
      new Request('http://localhost', { method: 'POST', headers: { 'x-admin-token': ADMIN_TOKEN } }),
      { params: { poolId } }
    );
    expect(lockResponse.status).toBe(200);

    // Finalize requires pool locked and digits visible. Locking sets digit_map.locked_at.
    const participant = await createParticipant(db, poolId, 'Winner');
    await db.query('update squares set participant_id = $1 where pool_id = $2 and row_index = 1 and col_index = 1', [
      participant.id,
      poolId
    ]);
    const game = await createGame(db, poolId, {
      round_key: 'round_of_64',
      team_a: 'A',
      team_b: 'B',
      status: 'final',
      score_a: 11,
      score_b: 1,
      start_time: null
    });

    const finalizeRoute = await import('../app/api/admin/pool/[poolId]/games/[gameId]/finalize/route');
    const finalizeResponse = await finalizeRoute.POST(
      new Request('http://localhost', { method: 'POST', headers: { 'x-admin-token': ADMIN_TOKEN } }),
      { params: { poolId, gameId: game.id } }
    );
    expect(finalizeResponse.status).toBe(200);

    const audit = await db.query(
      'select action from audit_events where pool_id = $1 order by created_at asc',
      [poolId]
    );
    const actions = audit.rows.map((row: any) => String(row.action));
    expect(actions).toContain('pool_lock');
    expect(actions).toContain('payouts_update');
    expect(actions).toContain('game_finalize');
  });

  it('audit fetch endpoint returns events newest-first and paginates', async () => {
    const poolId = await createPoolWithSquares(db, 'Audit Paging Pool');

    // Insert deterministic events with timestamps.
    await db.query(
      `insert into audit_events (id, pool_id, actor, action, entity_type, entity_id, metadata, created_at)
       values
         ($1, $2, $3, $4, $5, $6, $7::jsonb, $8),
         ($9, $2, $3, $10, $5, $6, $7::jsonb, $11),
         ($12, $2, $3, $13, $5, $6, $7::jsonb, $14)`,
      [
        '00000000-0000-0000-0000-000000000001',
        poolId,
        'admin',
        'participant_create',
        'participant',
        poolId,
        JSON.stringify({}),
        '2026-01-01T00:00:00.000Z',
        '00000000-0000-0000-0000-000000000002',
        'square_assign',
        '2026-01-02T00:00:00.000Z',
        '00000000-0000-0000-0000-000000000003',
        'pool_lock',
        '2026-01-03T00:00:00.000Z'
      ]
    );

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const auditRoute = await import('../app/api/admin/pool/[poolId]/audit/route');

    const firstPage = await auditRoute.GET(
      new Request('http://localhost/api/admin/pool/x/audit?limit=2', { headers: { 'x-admin-token': ADMIN_TOKEN } }),
      { params: { poolId } }
    );
    expect(firstPage.status).toBe(200);
    const firstBody = await firstPage.json();
    expect(firstBody.events).toHaveLength(2);
    expect(firstBody.events[0].action).toBe('pool_lock');
    expect(firstBody.events[1].action).toBe('square_assign');
    expect(firstBody.next_cursor).toBeTruthy();

    const cursor = firstBody.next_cursor;
    const secondPage = await auditRoute.GET(
      new Request(
        `http://localhost/api/admin/pool/x/audit?limit=2&before=${encodeURIComponent(cursor.before)}&before_id=${cursor.before_id}`,
        { headers: { 'x-admin-token': ADMIN_TOKEN } }
      ),
      { params: { poolId } }
    );
    const secondBody = await secondPage.json();
    expect(secondBody.events).toHaveLength(1);
    expect(secondBody.events[0].action).toBe('participant_create');
  });
});
