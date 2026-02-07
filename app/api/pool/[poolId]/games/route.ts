import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { listGames } from '@/lib/games';

export async function GET(_request: Request, { params }: { params: { poolId: string } }) {
  const db = getDb();
  const games = await listGames(db, params.poolId);
  return NextResponse.json({ games });
}
