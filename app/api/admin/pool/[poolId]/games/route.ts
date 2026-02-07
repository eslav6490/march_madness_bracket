import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { logAuditEvent } from '@/lib/audit';
import { getDb } from '@/lib/db';
import { isPoolLocked } from '@/lib/pool-lock';
import { createGame, isValidRoundKey, isValidStatus, listGames, parseScore, parseStartTime } from '@/lib/games';

export async function GET(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const games = await listGames(db, params.poolId);
  return NextResponse.json({ games });
}

export async function POST(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  if (await isPoolLocked(db, params.poolId)) {
    return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
  }

  const body = await request.json();
  const roundKey = typeof body.round_key === 'string' ? body.round_key : '';
  const teamA = typeof body.team_a === 'string' ? body.team_a.trim() : '';
  const teamB = typeof body.team_b === 'string' ? body.team_b.trim() : '';
  const status = typeof body.status === 'string' ? body.status : 'scheduled';

  if (!isValidRoundKey(roundKey)) {
    return NextResponse.json({ error: 'invalid_round_key' }, { status: 400 });
  }
  if (!teamA || !teamB) {
    return NextResponse.json({ error: 'team_names_required' }, { status: 400 });
  }
  if (!isValidStatus(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  let scoreA: number | null;
  let scoreB: number | null;
  let startTime: Date | null;

  try {
    scoreA = parseScore(body.score_a);
    scoreB = parseScore(body.score_b);
    startTime = parseStartTime(body.start_time);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const game = await createGame(db, params.poolId, {
    round_key: roundKey,
    team_a: teamA,
    team_b: teamB,
    status,
    score_a: scoreA,
    score_b: scoreB,
    start_time: startTime,
    external_id: body.external_id ?? null
  });

  await logAuditEvent(db, {
    pool_id: params.poolId,
    actor: 'admin',
    action: 'game_create',
    entity_type: 'game',
    entity_id: game.id,
    metadata: {
      round_key: game.round_key,
      team_a: game.team_a,
      team_b: game.team_b,
      status: game.status
    }
  });

  return NextResponse.json({ game });
}
