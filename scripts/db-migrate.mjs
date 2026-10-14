#!/usr/bin/env node

/**
 * Dentarith PostgreSQL Schema Migration CLI
 *
 * Runs versioned DDL migrations from `src/lib/db-migrate.ts` against the configured
 * PostgreSQL database (`DATABASE_URL`).
 *
 * Usage:
 *   npm run db:migrate
 *   node scripts/db-migrate.mjs
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

async function main() {
  try {
    // Dynamic import via jiti (bundled with Next.js/Tailwind) allows zero-dependency TS execution
    const { createJiti } = await import("jiti");
    const jiti = createJiti(import.meta.url);
    const cliModule = await jiti.import(resolve(rootDir, "src/lib/db-migrate-cli.ts"));
    const { runMigrationCli } = cliModule;

    const result = await runMigrationCli();
    process.exit(result.success ? 0 : 1);
  } catch (err) {
    console.error("[Dentarith Migration] CLI Fatal Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
