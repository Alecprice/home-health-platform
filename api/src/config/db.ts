import pg from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 15_000
});

pool.on('error', error => {
  // Never include query parameters/PHI in infrastructure logs.
  console.error('Unexpected idle PostgreSQL connection error type:', error.name || 'database_error');
});

export async function withTenantClient<T>(agencyId: string, work: (client: pg.PoolClient) => Promise<T>, userId?: string): Promise<T> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(agencyId)) {
    throw new Error('Invalid agency id.');
  }

  if (userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) throw new Error('Invalid user id.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SELECT set_config('app.current_agency_id', $1, true)", [agencyId]);
    if (userId) await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* connection may already be broken */ }
    throw error;
  } finally {
    client.release();
  }
}
