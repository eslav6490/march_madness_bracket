import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
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

  const body = await request.json();
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const contactInfo = typeof body.contact_info === 'string' ? body.contact_info.trim() : null;

  if (!displayName) {
    return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
  }

  const db = getDb();
  const participant = await createParticipant(db, params.poolId, displayName, contactInfo);
  return NextResponse.json({ participant });
}
