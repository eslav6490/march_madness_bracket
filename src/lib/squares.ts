import type { DbClient, SquareRow } from './types';

export async function assignSquare(
  db: DbClient,
  poolId: string,
  rowIndex: number,
  colIndex: number,
  participantId: string | null
): Promise<SquareRow> {
  if (participantId) {
    const check = await db.query('select 1 from participants where id = $1 and pool_id = $2', [
      participantId,
      poolId
    ]);
    if (check.rows.length === 0) {
      throw new Error('Participant not found in pool');
    }
  }

  const result = await db.query(
    `update squares
        set participant_id = $4
      where pool_id = $1
        and row_index = $2
        and col_index = $3
      returning id, pool_id, row_index, col_index, participant_id, created_at`,
    [poolId, rowIndex, colIndex, participantId]
  );

  if (result.rows.length === 0) {
    throw new Error('Square not found');
  }

  const square = result.rows[0] as SquareRow;
  if (square.participant_id) {
    const participant = await db.query('select display_name from participants where id = $1', [
      square.participant_id
    ]);
    square.participant_name = participant.rows[0]?.display_name ?? null;
  } else {
    square.participant_name = null;
  }

  return square;
}
