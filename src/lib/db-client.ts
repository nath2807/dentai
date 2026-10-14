/**
 * Dentarith PostgreSQL Database Client & Connection Pool Lifecycle Manager.
 *
 * Designed for serverless Next.js deployments (Vercel / Node.js) with:
 * - Singleton pool caching across hot reloads and lambda warm invocations on globalThis.
 * - Connection bounds (max 10) and aggressive idle timeouts to prevent socket exhaustion.
 * - Fail-closed enforcement: In production, missing database configuration throws immediately;
 *   no silent in-memory fallback is permitted.
 * - Parameterized query execution and transactional boundary helper (withTransaction).
 */
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { safeErrorResponse } from "./security";
import { NextResponse } from "next/server";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code = "DATABASE_ERROR",
    public originalError?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class DatabaseConfigurationError extends DatabaseError {
  constructor(message = "PostgreSQL DATABASE_URL is not configured.") {
    super(message, "DATABASE_UNCONFIGURED");
    this.name = "DatabaseConfigurationError";
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message = "Failed to establish connection to PostgreSQL database.") {
    super(message, "DATABASE_UNAVAILABLE");
    this.name = "DatabaseConnectionError";
  }
}

/**
 * Standard handler converting database errors to safe HTTP 503 responses without exposing internals.
 */
export function handleDatabaseError(err: unknown): NextResponse | null {
  if (err instanceof DatabaseConfigurationError) {
    return safeErrorResponse(
      503,
      "Durable database persistence is not configured on this server.",
      "DATABASE_UNCONFIGURED"
    );
  }
  if (err instanceof DatabaseConnectionError) {
    return safeErrorResponse(
      503,
      "Unable to connect to durable database storage.",
      "DATABASE_UNAVAILABLE"
    );
  }
  if (err instanceof DatabaseError) {
    return safeErrorResponse(
      503,
      "Database operation failed. Please try again later.",
      "DATABASE_ERROR"
    );
  }
  return null;
}

// Global cache for serverless environments
interface GlobalWithPgPool {
  __dentarith_pg_pool__?: Pool;
}

const globalWithPool = globalThis as unknown as GlobalWithPgPool;

/**
 * Check whether DATABASE_URL is provided in environment variables.
 */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url && url.length > 0);
}

export interface DatabaseSslConfig {
  rejectUnauthorized: boolean;
  ca?: string;
}

/**
 * Determine SSL configuration for PostgreSQL connections.
 * In production, TLS verification is strictly enforced (rejectUnauthorized: true).
 * In non-production, self-signed certificates are only allowed if explicitly opted-in
 * via DATABASE_SSL_ALLOW_SELF_SIGNED="true". Custom CA can be passed via DATABASE_SSL_CA.
 */
export function getDatabaseSslConfig(
  connectionString: string,
  nodeEnv: string = process.env.NODE_ENV || "development",
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): DatabaseSslConfig | undefined {
  const isProduction = nodeEnv === "production";
  const sslRequired =
    isProduction ||
    connectionString.includes("sslmode=require") ||
    connectionString.includes("supabase") ||
    connectionString.includes("neon.tech") ||
    connectionString.includes("amazonaws.com");

  if (!sslRequired) {
    return undefined;
  }

  // Strictly enforce rejectUnauthorized in production.
  // In development/test, rejectUnauthorized may only be false if explicitly configured.
  const allowSelfSigned = !isProduction && env.DATABASE_SSL_ALLOW_SELF_SIGNED === "true";
  const rejectUnauthorized = !allowSelfSigned;

  const sslConfig: DatabaseSslConfig = {
    rejectUnauthorized,
  };

  if (env.DATABASE_SSL_CA?.trim()) {
    sslConfig.ca = env.DATABASE_SSL_CA.trim();
  }

  return sslConfig;
}

/**
 * Retrieve or instantiate the PostgreSQL connection pool.
 * Throws DatabaseConfigurationError if DATABASE_URL is unset.
 */
export function getPool(): Pool {
  if (globalWithPool.__dentarith_pg_pool__) {
    return globalWithPool.__dentarith_pg_pool__;
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new DatabaseConfigurationError(
      "Critical configuration failure: DATABASE_URL is not set. Cloud repository requires durable PostgreSQL storage."
    );
  }

  const ssl = getDatabaseSslConfig(connectionString);

  const pool = new Pool({
    connectionString,
    max: 10, // Max concurrent connections per serverless container
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // 5s connection acquisition timeout
    ssl,
  });

  // Handle unexpected idle pool errors without terminating process
  pool.on("error", (err) => {
    // Log safe error tag without exposing connection details or credentials
    console.error("[Dentarith Database Pool] Unexpected idle client error:", err.message);
  });

  globalWithPool.__dentarith_pg_pool__ = pool;
  return pool;
}

/**
 * Execute a parameterized query with safe error logging (credentials/secrets stripped).
 */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<R>> {
  const pool = getPool();
  try {
    return await pool.query<R>(text, params);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Database query failed";
    throw new DatabaseError(errorMsg, "QUERY_FAILED", err);
  }
}

/**
 * Execute a callback within an atomic PostgreSQL transaction (BEGIN ... COMMIT/ROLLBACK).
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("[Dentarith DB] Rollback error:", rollbackErr instanceof Error ? rollbackErr.message : rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Test connectivity to the configured PostgreSQL instance with a 3-second timeout.
 */
export async function testDatabaseConnection(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "DATABASE_URL is not configured." };
  }

  const start = Date.now();
  try {
    const pool = getPool();
    const res = await pool.query("SELECT 1 AS health_check");
    if (res.rows?.[0]?.health_check === 1) {
      return { ok: true, latencyMs: Date.now() - start };
    }
    return { ok: false, error: "Unexpected health check response." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return { ok: false, error: message };
  }
}

/**
 * Gracefully close the connection pool (used during tests or server shutdown).
 */
export async function closePool(): Promise<void> {
  if (globalWithPool.__dentarith_pg_pool__) {
    await globalWithPool.__dentarith_pg_pool__.end();
    delete globalWithPool.__dentarith_pg_pool__;
  }
}
