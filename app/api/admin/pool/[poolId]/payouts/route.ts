import { NextResponse } from 'next/server';

import { randomUUID } from 'crypto';

import { requireAdmin } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { getLatestPayouts, ROUND_KEYS, validatePayoutPayload } from '@/lib/payouts';

export async function GET(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  try {
    const data = await getLatestPayouts(db, params.poolId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const body = await request.json();

  let payouts: Record<(typeof ROUND_KEYS)[number], number>;
  try {
    payouts = validatePayoutPayload(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const values: string[] = [];
  const paramsList: Array<string | number> = [];
  let paramIndex = 1;

  for (const roundKey of ROUND_KEYS) {
    values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
    paramsList.push(randomUUID(), params.poolId, roundKey, payouts[roundKey]);
    paramIndex += 4;
  }

  await db.query(
    `insert into payout_configs (id, pool_id, round_key, amount_cents)
     values ${values.join(', ')}`,
    paramsList
  );

  const data = await getLatestPayouts(db, params.poolId);
  return NextResponse.json(data);
}
