import { randomUUID } from 'crypto';

import type { DbClient, DbPool, PoolWithSquares } from './types';

const GRID_SIZE = 10;

export async function createPoolWithSquares(
  db: DbClient,
  name: string = 'Main Pool'
): Promise<string> {
  const poolId = randomUUID();

  const pool = db as DbPool;
  if (typeof pool.connect === 'function') {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await insertPoolAndSquares(client, poolId, name);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release?.();
    }
  } else {
    await db.query('begin');
    try {
      await insertPoolAndSquares(db, poolId, name);
      await db.query('commit');
    } catch (error) {
      await db.query('rollback');
      throw error;
    }
  }

  return poolId;
}

export async function ensureDefaultPool(db: DbClient): Promise<string> {
  const { rows } = await db.query('select id from pools order by created_at asc limit 1');
  if (rows.length > 0) {
    return rows[0].id as string;
  }
  return createPoolWithSquares(db);
}

export async function getPoolWithSquares(db: DbClient, poolId: string): Promise<PoolWithSquares> {
  const poolResult = await db.query(
    'select id, name, status, created_at from pools where id = $1',
    [poolId]
  );
  if (poolResult.rows.length === 0) {
    throw new Error(`Pool ${poolId} not found`);
  }

  const squaresResult = await db.query(
    `select s.id, s.pool_id, s.row_index, s.col_index, s.participant_id,
            p.display_name as participant_name, s.created_at
       from squares s
       left join participants p on p.id = s.participant_id
      where s.pool_id = $1
      order by s.row_index asc, s.col_index asc`,
    [poolId]
  );

  return {
    pool: poolResult.rows[0],
    squares: squaresResult.rows
  } as PoolWithSquares;
}

export { GRID_SIZE };

async function insertPoolAndSquares(db: DbClient, poolId: string, name: string) {
  await db.query('insert into pools (id, name) values ($1, $2)', [poolId, name]);

  const values: string[] = [];
  const params: Array<string | number> = [];
  let paramIndex = 1;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
      params.push(randomUUID(), poolId, row, col);
      paramIndex += 4;
    }
  }

  await db.query(
    `insert into squares (id, pool_id, row_index, col_index) values ${values.join(', ')}`,
    params
  );
}
