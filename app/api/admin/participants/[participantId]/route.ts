import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { logAuditEvent } from '@/lib/audit';
import { isPoolLocked } from '@/lib/pool-lock';
import { deleteParticipant, updateParticipant } from '@/lib/participants';

export async function PATCH(request: Request, { params }: { params: { participantId: string } }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const poolLookup = await db.query('select pool_id from participants where id = $1', [params.participantId]);
  if (poolLookup.rows.length === 0) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }
  const poolId = String(poolLookup.rows[0].pool_id);
  if (await isPoolLocked(db, poolId)) {
    return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
  }

  const body = await request.json();
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const contactInfo = typeof body.contact_info === 'string' ? body.contact_info.trim() : null;

  if (!displayName) {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
  }

  try {
    const participant = await updateParticipant(db, params.participantId, displayName, contactInfo);
    await logAuditEvent(db, {
      pool_id: poolId,
      actor: 'admin',
      action: 'participant_update',
      entity_type: 'participant',
      entity_id: participant.id,
      metadata: { display_name: participant.display_name }
    });
    return NextResponse.json({ participant });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: { participantId: string } }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const db = getDb();
  const poolLookup = await db.query('select pool_id from participants where id = $1', [params.participantId]);
  if (poolLookup.rows.length === 0) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }
  const poolId = String(poolLookup.rows[0].pool_id);
  if (await isPoolLocked(db, poolId)) {
    return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
  }

  const result = await deleteParticipant(db, params.participantId, force);
  if (!result.deleted) {
    return NextResponse.json({ error: 'participant_has_squares', ownedSquares: result.ownedSquares }, { status: 409 });
  }

  await logAuditEvent(db, {
    pool_id: poolId,
    actor: 'admin',
    action: 'participant_delete',
    entity_type: 'participant',
    entity_id: params.participantId,
    metadata: { force, owned_squares: result.ownedSquares }
  });

  return NextResponse.json({ deleted: true, ownedSquares: result.ownedSquares });
}
