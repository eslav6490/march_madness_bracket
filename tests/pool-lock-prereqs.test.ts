/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPoolWithSquares } from '@/lib/pools';
import { createParticipant } from '@/lib/participants';
import { upsertDigitMap } from '@/lib/digits';
import { createTestDb } from './helpers/db';

const ADMIN_TOKEN = 'test-admin';

async function postLock(db: Awaited<ReturnType<typeof createTestDb>>, poolId: string) {
  vi.doMock('@/lib/db', () => ({ getDb: () => db }));
  const { POST } = await import('../app/api/admin/pool/[poolId]/lock/route');
  const response = await POST(
    new Request('http://localhost', { method: 'POST', headers: { 'x-admin-token': ADMIN_TOKEN } }),
    { params: { poolId } }
  );
  const body = await response.json();
  return { response, body };
}

describe('FEAT-010 pool lock prerequisites', () => {
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

  it('fails when squares are not fully assigned', async () => {
    const poolId = await createPoolWithSquares(db, 'Prereqs: squares');
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await createParticipant(db, poolId, 'Participant');

    const { response, body } = await postLock(db, poolId);
    expect(response.status).toBe(409);
    expect(body.error).toBe('lock_prerequisites_failed');
    expect(body.failed).toContain('squares_unassigned');
    expect(body.failed).not.toContain('participants_missing');
    expect(body.failed).not.toContain('digits_not_randomized');
    expect(body.failed).not.toContain('payouts_missing');

    const poolRow = await db.query('select status from pools where id = $1', [poolId]);
    expect(String(poolRow.rows[0]?.status)).toBe('open');
    const digitRow = await db.query('select locked_at from digit_maps where pool_id = $1', [poolId]);
    expect(digitRow.rows[0]?.locked_at ?? null).toBeNull();
  });

  it('fails when no participants exist', async () => {
    const poolId = await createPoolWithSquares(db, 'Prereqs: participants');
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const { response, body } = await postLock(db, poolId);
    expect(response.status).toBe(409);
    expect(body.error).toBe('lock_prerequisites_failed');
    expect(body.failed).toContain('participants_missing');
  });

  it('fails when digits have not been randomized (digit map missing)', async () => {
    const poolId = await createPoolWithSquares(db, 'Prereqs: digits');
    const participant = await createParticipant(db, poolId, 'Assignee');
    await db.query('update squares set participant_id = $1 where pool_id = $2', [participant.id, poolId]);

    const { response, body } = await postLock(db, poolId);
    expect(response.status).toBe(409);
    expect(body.error).toBe('lock_prerequisites_failed');
    expect(body.failed).toContain('digits_not_randomized');
    expect(body.failed).not.toContain('participants_missing');
    expect(body.failed).not.toContain('squares_unassigned');
    expect(body.failed).not.toContain('payouts_missing');
  });

  it('fails when payouts are missing for any round', async () => {
    const poolId = await createPoolWithSquares(db, 'Prereqs: payouts');
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const participant = await createParticipant(db, poolId, 'Assignee');
    await db.query('update squares set participant_id = $1 where pool_id = $2', [participant.id, poolId]);

    await db.query("delete from payout_configs where pool_id = $1 and round_key = 'championship'", [poolId]);

    const { response, body } = await postLock(db, poolId);
    expect(response.status).toBe(409);
    expect(body.error).toBe('lock_prerequisites_failed');
    expect(body.failed).toContain('payouts_missing');
    expect(body.details.payout_rounds_missing).toContain('championship');
  });

  it('locks successfully when all prerequisites are satisfied', async () => {
    const poolId = await createPoolWithSquares(db, 'Prereqs: ok');
    await upsertDigitMap(db, poolId, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const participant = await createParticipant(db, poolId, 'Assignee');
    await db.query('update squares set participant_id = $1 where pool_id = $2', [participant.id, poolId]);

    const { response, body } = await postLock(db, poolId);
    expect(response.status).toBe(200);
    expect(body.digit_map.locked_at).toBeTruthy();

    const poolRow = await db.query('select status from pools where id = $1', [poolId]);
    expect(String(poolRow.rows[0]?.status)).toBe('locked');
  });
});

