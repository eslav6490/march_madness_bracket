/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPoolWithSquares } from '@/lib/pools';
import { createTestDb } from './helpers/db';

const ADMIN_TOKEN = 'test-admin';

describe('games admin and public API', () => {
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

  it('creates a game and persists it', async () => {
    const poolId = await createPoolWithSquares(db, 'Games Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/games/route');

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({
          round_key: 'round_of_64',
          team_a: 'Team A',
          team_b: 'Team B',
          status: 'scheduled'
        })
      }),
      { params: { poolId } }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.game.team_a).toBe('Team A');

    const rows = await db.query('select * from games where pool_id = $1', [poolId]);
    expect(rows.rows).toHaveLength(1);
  });

  it('rejects unknown round keys', async () => {
    const poolId = await createPoolWithSquares(db, 'Games Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { POST } = await import('../app/api/admin/pool/[poolId]/games/route');

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({
          round_key: 'unknown',
          team_a: 'Team A',
          team_b: 'Team B'
        })
      }),
      { params: { poolId } }
    );

    expect(response.status).toBe(400);
  });

  it('enforces admin auth on admin endpoints', async () => {
    const poolId = await createPoolWithSquares(db, 'Auth Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const { GET } = await import('../app/api/admin/pool/[poolId]/games/route');

    const response = await GET(new Request('http://localhost'), { params: { poolId } });
    expect(response.status).toBe(403);
  });

  it('patch updates scores and status', async () => {
    const poolId = await createPoolWithSquares(db, 'Patch Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const adminRoute = await import('../app/api/admin/pool/[poolId]/games/route');
    const detailRoute = await import('../app/api/admin/pool/[poolId]/games/[gameId]/route');

    const createResponse = await adminRoute.POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({
          round_key: 'round_of_32',
          team_a: 'Team A',
          team_b: 'Team B',
          status: 'scheduled'
        })
      }),
      { params: { poolId } }
    );

    const created = await createResponse.json();

    const patchResponse = await detailRoute.PATCH(
      new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({
          score_a: 12,
          score_b: 8,
          status: 'final'
        })
      }),
      { params: { poolId, gameId: created.game.id } }
    );

    expect(patchResponse.status).toBe(200);
    const patched = await patchResponse.json();
    expect(patched.game.score_a).toBe(12);
    expect(patched.game.status).toBe('final');
  });

  it('public games endpoint returns games without auth', async () => {
    const poolId = await createPoolWithSquares(db, 'Public Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    const adminRoute = await import('../app/api/admin/pool/[poolId]/games/route');
    const publicRoute = await import('../app/api/pool/[poolId]/games/route');

    await adminRoute.POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({
          round_key: 'sweet_16',
          team_a: 'Team A',
          team_b: 'Team B',
          status: 'scheduled'
        })
      }),
      { params: { poolId } }
    );

    const response = await publicRoute.GET(new Request('http://localhost'), { params: { poolId } });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.games).toHaveLength(1);
  });
  it('returns 409 when pool locks between guard and write', async () => {
    const poolId = await createPoolWithSquares(db, 'Race Lock Pool');

    vi.doMock('@/lib/db', () => ({ getDb: () => db }));
    vi.doMock('@/lib/pool-lock', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/lib/pool-lock')>();
      return { ...actual, isPoolLocked: vi.fn().mockResolvedValue(false) };
    });
    const { POST } = await import('../app/api/admin/pool/[poolId]/games/route');

    await db.query("update pools set status = 'locked' where id = $1", [poolId]);

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({
          round_key: 'round_of_64',
          team_a: 'Team A',
          team_b: 'Team B',
          status: 'scheduled'
        })
      }),
      { params: { poolId } }
    );

    expect(response.status).toBe(409);
  });

});
