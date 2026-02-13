import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { logAuditEvent } from '@/lib/audit';
import { isPoolLocked } from '@/lib/pool-lock';
import { createParticipant, listParticipants } from '@/lib/participants';

export async function GET(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const participants = await listParticipants(db, params.poolId);
  return NextResponse.json({ participants });
}

export async function POST(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  if (await isPoolLocked(db, params.poolId)) {
    return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
  }

  const body = await request.json();
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const contactInfo = typeof body.contact_info === 'string' ? body.contact_info.trim() : null;

  if (!displayName) {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
  }

  const participant = await createParticipant(db, params.poolId, displayName, contactInfo);
  await logAuditEvent(db, {
    pool_id: params.poolId,
    actor: 'admin',
    action: 'participant_create',
    entity_type: 'participant',
    entity_id: participant.id,
    metadata: { display_name: participant.display_name }
  });
  return NextResponse.json({ participant });
}
