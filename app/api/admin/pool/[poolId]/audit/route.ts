import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { listAuditEvents } from '@/lib/audit';
import { getDb } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);

  const limitRaw = searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : 50;

  const beforeRaw = searchParams.get('before');
  const before = beforeRaw ? new Date(beforeRaw) : null;
  const beforeIdRaw = searchParams.get('before_id');
  const beforeId = beforeIdRaw ? String(beforeIdRaw) : null;

  const db = getDb();

  const events = await listAuditEvents(db, params.poolId, {
    limit,
    before: before && !Number.isNaN(before.getTime()) ? before : null,
    before_id: beforeId
  });

  const last = events[events.length - 1] ?? null;
  const next_cursor = last
    ? { before: last.created_at.toISOString(), before_id: last.id }
    : null;

  return NextResponse.json({ events, next_cursor });
}

