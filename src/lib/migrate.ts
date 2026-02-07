import fs from 'fs';
import path from 'path';

import type { DbClient, DbPool } from './types';

export async function runMigrations(db: DbClient, migrationsDir: string): Promise<void> {
  const pool = db as DbPool;
  if (typeof pool.connect === 'function') {
    const client = await pool.connect();
    try {
      await runMigrationsWithClient(client, migrationsDir);
    } finally {
      client.release?.();
    }
    return;
  }

  await runMigrationsWithClient(db, migrationsDir);
}

async function runMigrationsWithClient(db: DbClient, migrationsDir: string): Promise<void> {
  await db.query(
    'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())'
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const { rows } = await db.query('select name from schema_migrations');
  const applied = new Set(rows.map((row) => row.name as string));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    await db.query('begin');
    try {
      if (sql.trim().length > 0) {
        await db.query(sql);
      }
      await db.query('insert into schema_migrations (name) values ($1)', [file]);
      await db.query('commit');
    } catch (error) {
      await db.query('rollback');
      throw error;
    }
  }
}
