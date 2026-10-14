import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runMigrationCli } from "./db-migrate-cli";
import * as dbMigrate from "./db-migrate";
import * as dbClient from "./db-client";
import packageJson from "../../package.json";

describe("db-migrate-cli", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails with safe error message when DATABASE_URL is not configured", async () => {
    const errorLogs: string[] = [];
    const infoLogs: string[] = [];
    const mockLogger = {
      log: (msg: string) => infoLogs.push(msg),
      error: (msg: string) => errorLogs.push(msg),
    };

    const result = await runMigrationCli(mockLogger);

    expect(result.success).toBe(false);
    expect(result.applied).toEqual([]);
    expect(result.message).toContain("DATABASE_URL environment variable is not configured");
    expect(errorLogs.length).toBeGreaterThan(0);
    expect(errorLogs[0]).toContain("DATABASE_URL environment variable is not configured");
  });

  it("successfully applies pending migrations and closes pool", async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb";

    const runMigrationsSpy = vi.spyOn(dbMigrate, "runMigrations").mockResolvedValue({
      applied: ["001"],
      alreadyUpToDate: false,
    });
    const closePoolSpy = vi.spyOn(dbClient, "closePool").mockResolvedValue(undefined);

    const infoLogs: string[] = [];
    const errorLogs: string[] = [];
    const mockLogger = {
      log: (msg: string) => infoLogs.push(msg),
      error: (msg: string) => errorLogs.push(msg),
    };

    const result = await runMigrationCli(mockLogger);

    expect(result.success).toBe(true);
    expect(result.applied).toEqual(["001"]);
    expect(result.alreadyUpToDate).toBe(false);
    expect(result.message).toContain("Successfully applied 1 migration(s): 001");
    expect(runMigrationsSpy).toHaveBeenCalledOnce();
    expect(closePoolSpy).toHaveBeenCalledOnce();
    expect(errorLogs).toHaveLength(0);
  });

  it("reports database already up to date when no migrations pending", async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb";

    vi.spyOn(dbMigrate, "runMigrations").mockResolvedValue({
      applied: [],
      alreadyUpToDate: true,
    });
    const closePoolSpy = vi.spyOn(dbClient, "closePool").mockResolvedValue(undefined);

    const infoLogs: string[] = [];
    const mockLogger = {
      log: (msg: string) => infoLogs.push(msg),
      error: () => {},
    };

    const result = await runMigrationCli(mockLogger);

    expect(result.success).toBe(true);
    expect(result.applied).toEqual([]);
    expect(result.alreadyUpToDate).toBe(true);
    expect(result.message).toContain("already up to date");
    expect(closePoolSpy).toHaveBeenCalledOnce();
  });

  it("sanitizes database error messages containing credentials on failure", async () => {
    process.env.DATABASE_URL = "postgres://user:secretpassword@localhost:5432/testdb";

    vi.spyOn(dbMigrate, "runMigrations").mockRejectedValue(
      new Error("connection to server at postgres://user:secretpassword@localhost failed")
    );
    const closePoolSpy = vi.spyOn(dbClient, "closePool").mockResolvedValue(undefined);

    const errorLogs: string[] = [];
    const mockLogger = {
      log: () => {},
      error: (msg: string) => errorLogs.push(msg),
    };

    const result = await runMigrationCli(mockLogger);

    expect(result.success).toBe(false);
    expect(result.message).not.toContain("secretpassword");
    expect(result.message).not.toContain("postgres://");
    expect(result.message).toBe("Database migration failed due to connection/authentication error.");
    expect(errorLogs[0]).not.toContain("secretpassword");
    expect(closePoolSpy).toHaveBeenCalledOnce();
  });

  it("has package.json configured with db:migrate command", () => {
    expect(packageJson.scripts).toHaveProperty("db:migrate");
    expect(packageJson.scripts["db:migrate"]).toBe("node scripts/db-migrate.mjs");
  });
});
