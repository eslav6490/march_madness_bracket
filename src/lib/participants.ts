import { randomUUID } from 'crypto';

import type { DbClient, ParticipantRow } from './types';

export async function listParticipants(db: DbClient, poolId: string): Promise<ParticipantRow[]> {
  const result = await db.query(
    `select p.id, p.pool_id, p.display_name, p.contact_info, p.created_at,
            count(s.id)::int as square_count
       from participants p
       left join squares s on s.participant_id = p.id
      where p.pool_id = $1
      group by p.id
      order by p.created_at asc`,
    [poolId]
  );
  return result.rows as ParticipantRow[];
}

export async function createParticipant(
  db: DbClient,
  poolId: string,
  displayName: string,
  contactInfo?: string | null
): Promise<ParticipantRow> {
  const id = randomUUID();
  const result = await db.query(
    `insert into participants (id, pool_id, display_name, contact_info)
     values ($1, $2, $3, $4)
     returning id, pool_id, display_name, contact_info, created_at`,
    [id, poolId, displayName, contactInfo ?? null]
  );
  return result.rows[0] as ParticipantRow;
}

export async function updateParticipant(
  db: DbClient,
  participantId: string,
  displayName: string,
  contactInfo?: string | null
): Promise<ParticipantRow> {
  const result = await db.query(
    `update participants
        set display_name = $1,
            contact_info = $2
      where id = $3
      returning id, pool_id, display_name, contact_info, created_at`,
    [displayName, contactInfo ?? null, participantId]
  );
  if (result.rows.length === 0) {
    throw new Error('Participant not found');
  }
  return result.rows[0] as ParticipantRow;
}

export async function deleteParticipant(
  db: DbClient,
  participantId: string,
  force: boolean
): Promise<{ deleted: boolean; ownedSquares: number }>{
  const countResult = await db.query(
    'select count(*)::int as count from squares where participant_id = $1',
    [participantId]
  );
  const ownedSquares = Number(countResult.rows[0]?.count ?? 0);

  if (ownedSquares > 0 && !force) {
    return { deleted: false, ownedSquares };
  }

  await db.query('update squares set participant_id = null where participant_id = $1', [participantId]);
  await db.query('delete from participants where id = $1', [participantId]);

  return { deleted: true, ownedSquares };
}
