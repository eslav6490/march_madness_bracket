import path from 'path';

import { Pool } from 'pg';

import { runMigrations } from '../src/lib/migrate';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const pool = new Pool({ connectionString });
  try {
    await runMigrations(pool, path.resolve(process.cwd(), 'migrations'));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
