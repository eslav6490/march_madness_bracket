/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPoolWithSquares } from '@/lib/pools';
import { createTestDb } from './helpers/db';
import { generatePermutation, isValidPermutation, lockDigitMap, revealDigitMap, upsertDigitMap } from '@/lib/digits';

const ADMIN_TOKEN = 'test-admin';

describe('digit admin API', () => {
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

  it('randomize creates valid permutations', async () => {
    const poolId = await createPoolWithSquares(db, 'Digits Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/digits/randomize/route');

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'x-admin-token': ADMIN_TOKEN }
    }), { params: { poolId } });

    expect(response.status).toBe(200);
    const body = await response.json();
    const winning = body.digit_map.winning_digits;
    const losing = body.digit_map.losing_digits;

    expect(isValidPermutation(winning)).toBe(true);
    expect(isValidPermutation(losing)).toBe(true);
  });

  it('randomize is blocked after lock', async () => {
    const poolId = await createPoolWithSquares(db, 'Locked Pool');
    const winning = generatePermutation();
    const losing = generatePermutation();

    await upsertDigitMap(db, poolId, winning, losing);
    await lockDigitMap(db, poolId);

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/digits/randomize/route');

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'x-admin-token': ADMIN_TOKEN }
    }), { params: { poolId } });

    expect(response.status).toBe(409);
  });

  it('reveal before randomize returns 400', async () => {
    const poolId = await createPoolWithSquares(db, 'Reveal Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/digits/reveal/route');

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'x-admin-token': ADMIN_TOKEN }
    }), { params: { poolId } });

    expect(response.status).toBe(400);
  });

  it('lock is idempotent', async () => {
    const poolId = await createPoolWithSquares(db, 'Lock Pool');
    await upsertDigitMap(db, poolId, generatePermutation(), generatePermutation());

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/lock/route');

    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'x-admin-token': ADMIN_TOKEN }
    }), { params: { poolId } });

    const first = await response.json();
    const response2 = await POST(new Request('http://localhost', {
      method: 'POST',
      headers: { 'x-admin-token': ADMIN_TOKEN }
    }), { params: { poolId } });

    const second = await response2.json();
    expect(response2.status).toBe(200);
    expect(second.digit_map.locked_at).toBe(first.digit_map.locked_at);
  });

  it('public API hides digits until reveal', async () => {
    const poolId = await createPoolWithSquares(db, 'Public Pool');
    await upsertDigitMap(db, poolId, generatePermutation(), generatePermutation());

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { GET } = await import('../app/api/pool/route');

    const response = await GET();
    const before = await response.json();
    expect(before.digit_map.winning_digits).toBeNull();
    expect(before.digit_map.losing_digits).toBeNull();

    await revealDigitMap(db, poolId);

    const responseAfter = await GET();
    const after = await responseAfter.json();
    expect(after.digit_map.winning_digits).toHaveLength(10);
    expect(after.digit_map.losing_digits).toHaveLength(10);
  });
});
