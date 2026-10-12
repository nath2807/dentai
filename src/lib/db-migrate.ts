/**
 * Dentarith PostgreSQL Database Migration Runner.
 * Executes versioned database migrations idempotently against a PostgreSQL database.
 */
import { withTransaction, isDatabaseConfigured, DatabaseConfigurationError } from "./db-client";

export interface Migration {
  version: string;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: "001",
    name: "initial_schema",
    sql: `
      -- 1. USERS & CLINICIAN ACCOUNTS
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(64) NOT NULL DEFAULT 'clinician',
        license_number VARCHAR(128),
        organization VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        password_salt VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- 2. CLINICAL CASES
      CREATE TABLE IF NOT EXISTS clinical_cases (
        id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        analysis_status VARCHAR(32) NOT NULL DEFAULT 'current',
        review_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        case_data JSONB NOT NULL,
        form_values JSONB,
        analysis JSONB,
        review JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        PRIMARY KEY (id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_cases_user_synced ON clinical_cases(user_id, synced_at);
      CREATE INDEX IF NOT EXISTS idx_cases_user_deleted ON clinical_cases(user_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_cases_id ON clinical_cases(id);

      -- 3. AUDIT EVENTS
      CREATE TABLE IF NOT EXISTS audit_events (
        id VARCHAR(64) PRIMARY KEY,
        case_id VARCHAR(64),
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email VARCHAR(255),
        action VARCHAR(32) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        version INTEGER,
        ip_hash VARCHAR(64),
        details TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp ON audit_events(user_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id);
    `,
  },
];

export async function runMigrations(): Promise<{ applied: string[]; alreadyUpToDate: boolean }> {
  if (!isDatabaseConfigured()) {
    throw new DatabaseConfigurationError("Cannot run migrations: DATABASE_URL is not configured.");
  }

  return await withTransaction(async (client) => {
    // 0. Acquire exclusive transactional advisory lock to prevent concurrent migrations from colliding
    await client.query("SELECT pg_advisory_xact_lock(74218931);");

    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const res = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
    const appliedVersions = new Set(res.rows.map((r) => r.version));

    const newlyApplied: string[] = [];

    // 3. Apply missing migrations in sequence
    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW())",
          [migration.version, migration.name]
        );
        newlyApplied.push(migration.version);
      }
    }

    return {
      applied: newlyApplied,
      alreadyUpToDate: newlyApplied.length === 0,
    };
  });
}
