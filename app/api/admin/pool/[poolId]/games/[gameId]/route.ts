import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/lib/db';
import {
  isValidRoundKey,
  isValidStatus,
  parseScore,
  parseStartTime,
  updateGame,
  deleteGame,
  type GameRoundKey,
  type GameStatus
} from '@/lib/games';

export async function PATCH(
  request: Request,
  { params }: { params: { poolId: string; gameId: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();

  const updates: {
    round_key?: GameRoundKey;
    team_a?: string;
    team_b?: string;
    status?: GameStatus;
    score_a?: number | null;
    score_b?: number | null;
    start_time?: Date | null;
  } = {};

  if (body.round_key !== undefined) {
    if (!isValidRoundKey(String(body.round_key))) {
      return NextResponse.json({ error: 'invalid_round_key' }, { status: 400 });
    }
    updates.round_key = String(body.round_key) as GameRoundKey;
  }

  if (body.team_a !== undefined) {
    const teamA = String(body.team_a).trim();
    if (!teamA) {
      return NextResponse.json({ error: 'team_names_required' }, { status: 400 });
    }
    updates.team_a = teamA;
  }

  if (body.team_b !== undefined) {
    const teamB = String(body.team_b).trim();
    if (!teamB) {
      return NextResponse.json({ error: 'team_names_required' }, { status: 400 });
    }
    updates.team_b = teamB;
  }

  if (body.status !== undefined) {
    const status = String(body.status);
    if (!isValidStatus(status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
    updates.status = status as GameStatus;
  }

  try {
    if (body.score_a !== undefined) {
      updates.score_a = parseScore(body.score_a);
    }
    if (body.score_b !== undefined) {
      updates.score_b = parseScore(body.score_b);
    }
    if (body.start_time !== undefined) {
      updates.start_time = parseStartTime(body.start_time);
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const db = getDb();
  try {
    const game = await updateGame(db, params.poolId, params.gameId, updates);
    return NextResponse.json({ game });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { poolId: string; gameId: string } }
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  await deleteGame(db, params.poolId, params.gameId);
  return NextResponse.json({ deleted: true });
}
