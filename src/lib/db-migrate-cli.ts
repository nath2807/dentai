/**
 * Dentarith PostgreSQL Schema Migration CLI Runner
 *
 * Provides a clean CLI execution interface for `runMigrations()` and `closePool()`.
 * Validates database configuration, applies pending schema migrations under an
 * exclusive transactional advisory lock, logs applied migration versions, and
 * exits with code 0 on success or code 1 with a sanitized error message on failure.
 */

import { runMigrations } from "./db-migrate";
import { closePool, isDatabaseConfigured } from "./db-client";

export interface MigrationCliResult {
  success: boolean;
  applied: string[];
  alreadyUpToDate: boolean;
  message: string;
}

export interface Logger {
  log: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Execute schema migrations and gracefully close the pool.
 */
export async function runMigrationCli(logger: Logger = console): Promise<MigrationCliResult> {
  if (!isDatabaseConfigured()) {
    const errorMsg = "Cannot run migrations: DATABASE_URL environment variable is not configured.";
    logger.error(`[Dentarith Migration] Error: ${errorMsg}`);
    return {
      success: false,
      applied: [],
      alreadyUpToDate: false,
      message: errorMsg,
    };
  }

  logger.log("[Dentarith Migration] Connecting to PostgreSQL database...");

  try {
    const result = await runMigrations();
    if (result.alreadyUpToDate) {
      const msg = "Database schema is already up to date. No pending migrations.";
      logger.log(`[Dentarith Migration] ${msg}`);
      return {
        success: true,
        applied: [],
        alreadyUpToDate: true,
        message: msg,
      };
    }

    const msg = `Successfully applied ${result.applied.length} migration(s): ${result.applied.join(", ")}`;
    logger.log(`[Dentarith Migration] ${msg}`);
    return {
      success: true,
      applied: result.applied,
      alreadyUpToDate: false,
      message: msg,
    };
  } catch (err: unknown) {
    // Sanitize error message to prevent leaking database credentials or internal connection details
    const rawMsg = err instanceof Error ? err.message : "Unknown database error occurred";
    const safeMsg =
      rawMsg.includes("password") || rawMsg.includes("postgres://") || rawMsg.includes("postgresql://")
        ? "Database migration failed due to connection/authentication error."
        : rawMsg;

    logger.error(`[Dentarith Migration] Execution failed: ${safeMsg}`);
    return {
      success: false,
      applied: [],
      alreadyUpToDate: false,
      message: safeMsg,
    };
  } finally {
    try {
      await closePool();
    } catch {
      // Ignore pool close error during CLI exit
    }
  }
}
