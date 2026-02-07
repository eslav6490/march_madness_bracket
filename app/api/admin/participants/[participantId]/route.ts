import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { deleteParticipant, updateParticipant } from '@/lib/participants';

export async function PATCH(request: Request, { params }: { params: { participantId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const contactInfo = typeof body.contact_info === 'string' ? body.contact_info.trim() : null;

  if (!displayName) {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
  }

  const db = getDb();
  try {
    const participant = await updateParticipant(db, params.participantId, displayName, contactInfo);
    return NextResponse.json({ participant });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: { params: { participantId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const db = getDb();
  const result = await deleteParticipant(db, params.participantId, force);
  if (!result.deleted) {
    return NextResponse.json({ error: 'participant_has_squares', ownedSquares: result.ownedSquares }, { status: 409 });
  }

  return NextResponse.json({ deleted: true, ownedSquares: result.ownedSquares });
}
