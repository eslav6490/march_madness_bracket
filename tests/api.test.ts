/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';

import { dynamic, getPoolGrid } from '../app/api/pool/route';
import { createTestDb } from './helpers/db';

describe('public pool API', () => {
  it('disables static caching for the route handler', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('returns 100 squares', async () => {
    const db = await createTestDb();
    const data = await getPoolGrid(db);

    expect(data.squares).toHaveLength(100);

    await db.end();
  });
});
