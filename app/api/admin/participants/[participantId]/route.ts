import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { withPoolUnlockedWrite } from '@/lib/pool-lock';
import { deleteParticipant, updateParticipant } from '@/lib/participants';

export async function PATCH(request: Request, { params }: { params: { participantId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const poolLookup = await db.query('select pool_id from participants where id = $1', [params.participantId]);
  if (poolLookup.rows.length === 0) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }
  const poolId = String(poolLookup.rows[0].pool_id);

  const body = await request.json();
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const contactInfo = typeof body.contact_info === 'string' ? body.contact_info.trim() : null;

  if (!displayName) {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
  }

  try {
    const participant = await withPoolUnlockedWrite(db, poolId, (client) =>
      updateParticipant(client, params.participantId, displayName, contactInfo)
    );
    return NextResponse.json({ participant });
  } catch (error) {
    if ((error as Error).message === 'pool_locked') {
      return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: { participantId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const db = getDb();
  const poolLookup = await db.query('select pool_id from participants where id = $1', [params.participantId]);
  if (poolLookup.rows.length === 0) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }
  const poolId = String(poolLookup.rows[0].pool_id);

  try {
    const result = await withPoolUnlockedWrite(db, poolId, (client) =>
      deleteParticipant(client, params.participantId, force)
    );
    if (!result.deleted) {
      return NextResponse.json({ error: 'participant_has_squares', ownedSquares: result.ownedSquares }, { status: 409 });
    }

    return NextResponse.json({ deleted: true, ownedSquares: result.ownedSquares });
  } catch (error) {
    if ((error as Error).message === 'pool_locked') {
      return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
