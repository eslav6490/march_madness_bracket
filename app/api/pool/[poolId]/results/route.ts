import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { listPoolResults } from '@/lib/results';

export async function GET(_request: Request, { params }: { params: { poolId: string } }) {
  const db = getDb();
  const results = await listPoolResults(db, params.poolId);
  return NextResponse.json({ results });
}

