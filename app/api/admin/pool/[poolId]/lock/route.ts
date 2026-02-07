import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { getDigitMap, lockDigitMap } from '@/lib/digits';
import type { DbClient, DbPool } from '@/lib/types';

export async function POST(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const existing = await getDigitMap(db, params.poolId);
  if (!existing) {
    return NextResponse.json({ error: 'digit_map_missing' }, { status: 400 });
  }

  const digitMap = await lockPool(db, params.poolId);
  return NextResponse.json({ digit_map: digitMap });
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
