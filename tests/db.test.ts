/// <reference types="vitest" />
import { randomUUID } from 'crypto';

import { describe, expect, it } from 'vitest';

import { createPoolWithSquares } from '@/lib/pools';
import { createTestDb } from './helpers/db';

describe('pool grid creation', () => {
  it('creates exactly 100 squares for a pool', async () => {
    const db = await createTestDb();
    const poolId = await createPoolWithSquares(db, 'Test Pool');

    const result = await db.query('select count(*) as count from squares where pool_id = $1', [poolId]);
    expect(Number(result.rows[0].count)).toBe(100);

    await db.end();
  });

  it('enforces unique squares per pool/row/col', async () => {
    const db = await createTestDb();
    const poolId = await createPoolWithSquares(db, 'Test Pool');

    const existing = await db.query(
      'select row_index, col_index from squares where pool_id = $1 limit 1',
      [poolId]
    );

    await expect(
      db.query(
        'insert into squares (id, pool_id, row_index, col_index) values ($1, $2, $3, $4)',
        [randomUUID(), poolId, existing.rows[0].row_index, existing.rows[0].col_index]
      )
    ).rejects.toThrow();

    await db.end();
  });
});
