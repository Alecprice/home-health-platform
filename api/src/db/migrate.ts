import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../../../database/migrations');
const client = new pg.Client({ connectionString: env.MIGRATION_DATABASE_URL, connectionTimeoutMillis: 5_000 });

function sha256(content: string) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function main() {
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(93472831)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        checksum_sha256 text,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum_sha256 text');

    const files = (await fs.readdir(migrationsDir))
      .filter(name => /^\d+_[a-z0-9_]+\.sql$/i.test(name))
      .sort();

    if (!files.length) throw new Error(`No migration files found in ${migrationsDir}`);

    for (const filename of files) {
      const sql = await fs.readFile(path.join(migrationsDir, filename), 'utf8');
      const checksum = sha256(sql);
      const applied = await client.query<{ checksum_sha256: string | null }>(
        'SELECT checksum_sha256 FROM schema_migrations WHERE filename = $1',
        [filename]
      );
      if (applied.rowCount) {
        const prior = applied.rows[0]?.checksum_sha256;
        if (prior && prior !== checksum) {
          throw new Error(`Migration drift detected for ${filename}. Applied checksum ${prior} does not match current file ${checksum}. Create a new migration instead of editing an applied one.`);
        }
        // Backfill checksum for databases created by the pre-v0.4 runner.
        if (!prior) await client.query('UPDATE schema_migrations SET checksum_sha256 = $2 WHERE filename = $1', [filename, checksum]);
        continue;
      }

      console.log(`Applying ${filename}`);
      await client.query('BEGIN');
      try {
        await client.query("SET LOCAL lock_timeout = '10s'");
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename, checksum_sha256) VALUES ($1, $2)', [filename, checksum]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock(93472831)'); } catch { /* connection may already be closed */ }
    await client.end();
  }
}

main().catch(error => {
  console.error('Database migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
