import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import type { Pool } from 'pg';

const migrationsDirectory = path.join(process.cwd(), 'db', 'migrations');

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationNames = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const name of migrationNames) {
    const applied = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      [name],
    );

    if (applied.rowCount) continue;

    const sql = await readFile(path.join(migrationsDirectory, name), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
