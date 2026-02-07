import type { DbClient } from './types';

export async function isPoolLocked(db: DbClient, poolId: string): Promise<boolean> {
  const result = await db.query('select status from pools where id = $1', [poolId]);
  if (result.rows.length === 0) return false;
  return String(result.rows[0]?.status ?? '') === 'locked';
}

