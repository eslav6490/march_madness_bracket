import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { getLatestPayouts } from '@/lib/payouts';

export async function GET(_request: Request, { params }: { params: { poolId: string } }) {
  const db = getDb();
  try {
    const data = await getLatestPayouts(db, params.poolId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
