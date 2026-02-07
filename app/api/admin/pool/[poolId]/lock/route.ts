import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { lockDigitMap } from '@/lib/digits';
import { checkPoolLockPrerequisites } from '@/lib/pool-lock';
import type { DbClient, DbPool } from '@/lib/types';

export async function POST(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const poolResult = await db.query('select status from pools where id = $1', [params.poolId]);
  if (poolResult.rows.length === 0) {
    return NextResponse.json({ error: 'pool_not_found' }, { status: 404 });
  }
  const status = String(poolResult.rows[0]?.status ?? '');

  // Preserve idempotency: if already locked, return 200 and ensure digit map is locked.
  if (status !== 'locked') {
    const prereqs = await checkPoolLockPrerequisites(db, params.poolId);
    if (!prereqs.ok) {
      return NextResponse.json(
        {
          error: 'lock_prerequisites_failed',
          failed: prereqs.failed,
          prerequisites: prereqs.prerequisites,
          details: prereqs.details
        },
        { status: 409 }
      );
    }
  }

  try {
    const digitMap = await lockPool(db, params.poolId);
    return NextResponse.json({ digit_map: digitMap });
  } catch (error) {
    const message = (error as Error).message;
    const responseStatus = message === 'digit_map_missing' ? 400 : 500;
    return NextResponse.json({ error: message }, { status: responseStatus });
  }
}

async function lockPool(db: DbClient, poolId: string) {
  const pool = db as DbPool;
  if (typeof pool.connect === 'function') {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query("update pools set status = 'locked' where id = $1", [poolId]);
      const digitMap = await lockDigitMap(client, poolId);
      await client.query('commit');
      return digitMap;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release?.();
    }
  }

  await db.query("update pools set status = 'locked' where id = $1", [poolId]);
  return lockDigitMap(db, poolId);
}
