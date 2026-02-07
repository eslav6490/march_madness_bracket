import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { getDigitMap } from '@/lib/digits';

export async function GET(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const digitMap = await getDigitMap(db, params.poolId);
  return NextResponse.json({ digit_map: digitMap });
}
