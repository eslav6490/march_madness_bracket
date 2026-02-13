/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPoolWithSquares } from '@/lib/pools';
import { DEFAULT_PAYOUTS_CENTS, ROUND_KEYS } from '@/lib/payouts';
import { createTestDb } from './helpers/db';

const ADMIN_TOKEN = 'test-admin';

describe('payout configs', () => {
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

  it('seeds default payouts for a new pool', async () => {
    const poolId = await createPoolWithSquares(db, 'Payout Pool');

    const result = await db.query(
      'select round_key, amount_cents from payout_configs where pool_id = $1',
      [poolId]
    );

    expect(result.rows).toHaveLength(ROUND_KEYS.length);
    for (const roundKey of ROUND_KEYS) {
      const row = result.rows.find(
        (item: { round_key: string; amount_cents: number }) => item.round_key === roundKey
      );
      expect(row?.amount_cents).toBe(DEFAULT_PAYOUTS_CENTS[roundKey]);
    }
  });

  it('public payouts endpoint returns latest values', async () => {
    const poolId = await createPoolWithSquares(db, 'Public Payouts');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { GET } = await import('../app/api/pool/[poolId]/payouts/route');

    const response = await GET(new Request('http://localhost'), { params: { poolId } });
    const data = await response.json();

    expect(data.payouts).toBeDefined();
    for (const roundKey of ROUND_KEYS) {
      expect(data.payouts[roundKey]).toBe(DEFAULT_PAYOUTS_CENTS[roundKey]);
    }
  });

  it('admin POST appends new version rows and updates latest', async () => {
    const poolId = await createPoolWithSquares(db, 'Admin Payouts');

    const before = await db.query('select count(*)::int as count from payout_configs where pool_id = $1', [poolId]);

    const updated = ROUND_KEYS.reduce((acc, key, index) => {
      acc[key] = DEFAULT_PAYOUTS_CENTS[key] + (index + 1) * 100;
      return acc;
    }, {} as Record<(typeof ROUND_KEYS)[number], number>);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/payouts/route');

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ payouts: updated })
      }),
      { params: { poolId } }
    );

    expect(response.status).toBe(200);
    const after = await db.query('select count(*)::int as count from payout_configs where pool_id = $1', [poolId]);
    expect(after.rows[0].count).toBe(before.rows[0].count + ROUND_KEYS.length);

    const data = await response.json();
    for (const roundKey of ROUND_KEYS) {
      expect(data.payouts[roundKey]).toBe(updated[roundKey]);
    }
  });

  it('rejects non-admin calls to admin endpoints', async () => {
    const poolId = await createPoolWithSquares(db, 'Auth Payouts');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { GET } = await import('../app/api/admin/pool/[poolId]/payouts/route');

    const response = await GET(new Request('http://localhost'), { params: { poolId } });
    expect(response.status).toBe(403);
  });

  it('validates round keys for admin POST', async () => {
    const poolId = await createPoolWithSquares(db, 'Validation Payouts');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/payouts/route');

    const missingResponse = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ payouts: { round_of_64: 1000 } })
      }),
      { params: { poolId } }
    );

    expect(missingResponse.status).toBe(400);

    const extraResponse = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ payouts: { round_of_64: 1000, round_of_32: 1000, sweet_16: 1000, elite_8: 1000, final_4: 1000, championship: 1000, bonus: 1000 } })
      }),
      { params: { poolId } }
    );

    expect(extraResponse.status).toBe(400);
  });
  it('returns 409 when pool locks between guard and payout write', async () => {
    const poolId = await createPoolWithSquares(db, 'Payout Race Pool');

    const updated = ROUND_KEYS.reduce((acc, key, index) => {
      acc[key] = DEFAULT_PAYOUTS_CENTS[key] + (index + 1) * 10;
      return acc;
    }, {} as Record<(typeof ROUND_KEYS)[number], number>);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    vi.doMock('@/lib/pool-lock', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/pool-lock')>();
      return { ...actual, isPoolLocked: vi.fn().mockResolvedValue(false) };
    });
    const { POST } = await import('../app/api/admin/pool/[poolId]/payouts/route');

    await db.query("update pools set status = 'locked' where id = $1", [poolId]);

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ payouts: updated })
      }),
      { params: { poolId } }
    );

    expect(response.status).toBe(409);
  });

});
