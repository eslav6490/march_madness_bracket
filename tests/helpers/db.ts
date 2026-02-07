import path from 'path';

import { newDb } from 'pg-mem';

import { runMigrations } from '@/lib/migrate';

export async function createTestDb() {
  const db = newDb();
  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();

  await runMigrations(pool, path.resolve(process.cwd(), 'migrations'));

  return pool;
}
