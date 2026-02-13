import type { DbClient, DbPool } from './types';

export async function isPoolLocked(db: DbClient, poolId: string): Promise<boolean> {
  const result = await db.query('select status from pools where id = $1', [poolId]);
  if (result.rows.length === 0) return false;
  return String(result.rows[0]?.status ?? '') === 'locked';
}

export async function withPoolUnlockedWrite<T>(
  db: DbClient,
  poolId: string,
  write: (client: DbClient) => Promise<T>
): Promise<T> {
  const pool = db as DbPool;

  if (typeof pool.connect === 'function') {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const lockResult = await client.query('select status from pools where id = $1 for update', [poolId]);
      if (lockResult.rows[0]?.status === 'locked') {
        throw new Error('pool_locked');
      }

      const result = await write(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release?.();
    }
  }

  await db.query('begin');
  try {
    const lockResult = await db.query('select status from pools where id = $1 for update', [poolId]);
    if (lockResult.rows[0]?.status === 'locked') {
      throw new Error('pool_locked');
    }

    const result = await write(db);
    await db.query('commit');
    return result;
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
}
