import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { getDigitMap, revealDigitMap } from '@/lib/digits';

export async function POST(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const existing = await getDigitMap(db, params.poolId);
  if (!existing) {
    return NextResponse.json({ error: 'digit_map_missing' }, { status: 400 });
  }

  const digitMap = await revealDigitMap(db, params.poolId);
  return NextResponse.json({ digit_map: digitMap });
}
