import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { ensureDefaultPool, getPoolWithSquares } from '@/lib/pools';
import type { DbClient } from '@/lib/types';

export async function getPoolGrid(db: DbClient) {
  const poolId = await ensureDefaultPool(db);
  return getPoolWithSquares(db, poolId);
}

export async function GET() {
  const db = getDb();
  const data = await getPoolGrid(db);
  return NextResponse.json(data);
}
