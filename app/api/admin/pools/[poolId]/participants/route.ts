import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { withPoolUnlockedWrite } from '@/lib/pool-lock';
import { createParticipant, listParticipants } from '@/lib/participants';

export async function GET(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const participants = await listParticipants(db, params.poolId);
  return NextResponse.json({ participants });
}

export async function POST(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();

  const body = await request.json();
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const contactInfo = typeof body.contact_info === 'string' ? body.contact_info.trim() : null;

  if (!displayName) {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
  }

  try {
    const participant = await withPoolUnlockedWrite(db, params.poolId, (client) =>
      createParticipant(client, params.poolId, displayName, contactInfo)
    );
    return NextResponse.json({ participant });
  } catch (error) {
    if ((error as Error).message === 'pool_locked') {
      return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
    }
    throw error;
  }
}
