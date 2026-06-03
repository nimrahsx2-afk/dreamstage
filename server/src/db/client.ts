/**
 * PostgreSQL database client with connection pooling and transaction support.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';

/** Supabase / managed Postgres require TLS; local Postgres typically does not. */
function useSslForDatabaseUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes('supabase.com') ||
    u.includes('supabase.co') ||
    u.includes('neon.tech') ||
    u.includes('amazonaws.com')
  );
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: useSslForDatabaseUrl(env.DATABASE_URL) ? 15000 : 2000,
  ...(useSslForDatabaseUrl(env.DATABASE_URL)
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

/**
 * Execute a parameterized query.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  
  if (env.isDevelopment && duration > 100) {
    console.log('Slow query:', { text, duration, rows: result.rowCount });
  }
  
  return result;
}

/**
 * Get a single row or null.
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

/**
 * Get all rows.
 */
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

/**
 * Execute a function within a database transaction.
 * Automatically commits on success, rolls back on error.
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection.
 */
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Close all connections (for graceful shutdown).
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

/**
 * Get the pool instance for manual transaction management.
 */
export function getPool(): Pool {
  return pool;
}

export { pool };
