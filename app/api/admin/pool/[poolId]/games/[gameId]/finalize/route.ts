import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { finalizeGame } from '@/lib/results';

export async function POST(
  request: Request,
  { params }: { params: { poolId: string; gameId: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  try {
    const gameResult = await finalizeGame(db, params.poolId, params.gameId);
    return NextResponse.json({ game_result: gameResult });
  } catch (error) {
    const message = (error as Error).message;
    const status = errorStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}

function errorStatus(code: string): number {
  switch (code) {
    case 'pool_not_found':
    case 'game_not_found':
      return 404;
    case 'scores_missing':
    case 'tie_score':
    case 'digit_map_missing':
      return 400;
    case 'pool_not_locked':
    case 'game_not_final':
    case 'digits_not_visible':
    case 'payouts_missing':
      return 409;
    default:
      return 500;
  }
}

