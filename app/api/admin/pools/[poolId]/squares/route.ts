import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { assignSquare } from '@/lib/squares';

export async function PATCH(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const rowIndex = Number(body.row_index);
  const colIndex = Number(body.col_index);
  const participantId = body.participant_id ? String(body.participant_id) : null;

  if (!Number.isInteger(rowIndex) || !Number.isInteger(colIndex)) {
    return NextResponse.json({ error: 'row_index and col_index are required' }, { status: 400 });
  }

  if (rowIndex < 0 || rowIndex > 9 || colIndex < 0 || colIndex > 9) {
    return NextResponse.json({ error: 'row_index and col_index must be between 0 and 9' }, { status: 400 });
  }

  const db = getDb();
  try {
    const square = await assignSquare(db, params.poolId, rowIndex, colIndex, participantId);
    return NextResponse.json({ square });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
