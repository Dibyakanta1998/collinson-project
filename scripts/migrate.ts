import { Pool } from 'pg';

import { runMigrations } from '../src/server/db/migrate';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

const pool = new Pool({ connectionString });

try {
  await runMigrations(pool);
  console.log('Database migrations applied.');
} finally {
  await pool.end();
}
