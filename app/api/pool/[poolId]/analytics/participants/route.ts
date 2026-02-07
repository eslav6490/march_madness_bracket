import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { getParticipantLeaderboard } from '@/lib/analytics';

export async function GET(_request: Request, { params }: { params: { poolId: string } }) {
  const db = getDb();
  try {
    const data = await getParticipantLeaderboard(db, params.poolId);
    return NextResponse.json(data);
  } catch (error) {
    const message = (error as Error).message;
    const status = message === 'pool_not_found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

