import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { logAuditEvent } from '@/lib/audit';
import { getDb } from '@/lib/db';
import { generatePermutation, getDigitMap, upsertDigitMap } from '@/lib/digits';

export async function POST(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const existing = await getDigitMap(db, params.poolId);
  if (existing?.locked_at) {
    return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
  }

  const winningDigits = generatePermutation();
  const losingDigits = generatePermutation();

  const digitMap = await upsertDigitMap(db, params.poolId, winningDigits, losingDigits);
  await logAuditEvent(db, {
    pool_id: params.poolId,
    actor: 'admin',
    action: 'digits_randomize',
    entity_type: 'digit_map',
    entity_id: params.poolId,
    metadata: {}
  });
  return NextResponse.json({ digit_map: digitMap });
}
