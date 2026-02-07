import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { logAuditEvent } from '@/lib/audit';
import { isPoolLocked } from '@/lib/pool-lock';
import { assignSquare } from '@/lib/squares';

export async function PATCH(request: Request, { params }: { params: { poolId: string } }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const db = getDb();
  if (await isPoolLocked(db, params.poolId)) {
    return NextResponse.json({ error: 'pool_locked' }, { status: 409 });
  }

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

  try {
    const before = await db.query(
      'select participant_id from squares where pool_id = $1 and row_index = $2 and col_index = $3',
      [params.poolId, rowIndex, colIndex]
    );
    const beforeParticipantId = before.rows[0]?.participant_id ? String(before.rows[0].participant_id) : null;

    const square = await assignSquare(db, params.poolId, rowIndex, colIndex, participantId);
    await logAuditEvent(db, {
      pool_id: params.poolId,
      actor: 'admin',
      action: 'square_assign',
      entity_type: 'square',
      entity_id: square.id,
      metadata: {
        row_index: rowIndex,
        col_index: colIndex,
        participant_id_before: beforeParticipantId,
        participant_id_after: square.participant_id
      }
    });
    return NextResponse.json({ square });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}
