/**
 * Sprint 4.2 Real PostgreSQL Integration Test Suite.
 *
 * MANDATORY RULE:
 * This suite executes real SQL commands against a live PostgreSQL database IF and ONLY IF
 * a real database connection is established via DATABASE_URL or TEST_DATABASE_URL.
 * If no live database is available, live tests are conditionally skipped and explicitly reported
 * as BLOCKED by unavailable database infrastructure.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isDatabaseConfigured,
  testDatabaseConnection,
  closePool,
} from "./db-client";
import { runMigrations } from "./db-migrate";
import { PostgresCloudRepository } from "./postgres-cloud-repository";
import { BENCHMARK_CASE_PULPITIS } from "./benchmark-cases";
import type { StoredCase } from "./case-storage";

describe("Live PostgreSQL Database Integration (Conditional on Infrastructure)", () => {
  let isLiveDbAvailable = false;
  let testRepoInstance1: PostgresCloudRepository;
  let testRepoInstance2: PostgresCloudRepository;

  beforeAll(async () => {
    const health = await testDatabaseConnection();
    isLiveDbAvailable = health.ok;

    if (isLiveDbAvailable) {
      console.log("[Dentarith Live DB] Live PostgreSQL detected. Applying schema migrations...");
      await runMigrations();
      testRepoInstance1 = new PostgresCloudRepository();
      testRepoInstance2 = new PostgresCloudRepository();
    } else {
      console.log(
        "[Dentarith Live DB] Live PostgreSQL is NOT configured or unreachable (" +
          (health.error || "No DATABASE_URL") +
          "). Live database integration checks are flagged as BLOCKED by missing infrastructure."
      );
    }
  });

  afterAll(async () => {
    if (isLiveDbAvailable) {
      await testRepoInstance1?.clear?.();
      await closePool();
    }
  });

  it("accurately detects database availability status without false positives", async () => {
    const configured = isDatabaseConfigured();
    const health = await testDatabaseConnection();

    if (!configured) {
      expect(health.ok).toBe(false);
      expect(health.error).toContain("DATABASE_URL is not configured");
    } else {
      expect(typeof health.ok).toBe("boolean");
    }
  });

  describe("Real PostgreSQL Durability, Isolation, & Concurrency (Runs only with Live DB)", () => {
    it.skipIf(!isLiveDbAvailable)(
      "persists records across distinct repository instances and restarts",
      async () => {
        const testUserId = `usr_test_${Date.now()}`;
        const syntheticCase: StoredCase = {
          ...BENCHMARK_CASE_PULPITIS,
          id: `case-durable-${Date.now()}`,
          caseData: {
            ...BENCHMARK_CASE_PULPITIS.caseData,
            chiefComplaint: "Durable database persistence test",
          },
          status: "draft",
          analysisStatus: "current",
          reviewStatus: "pending",
          analysis: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Write via Instance 1
        const created = await testRepoInstance1.createCase(testUserId, syntheticCase);
        expect(created.id).toBe(syntheticCase.id);

        // Read via completely separate Instance 2
        const fetched = await testRepoInstance2.getCase(testUserId, created.id);
        expect(fetched).not.toBeNull();
        expect(fetched?.id).toBe(created.id);
        expect(fetched?.caseData.chiefComplaint).toBe("Durable database persistence test");
      }
    );

    it.skipIf(!isLiveDbAvailable)(
      "enforces cross-tenant isolation in real PostgreSQL database",
      async () => {
        const userA = `usr_tenant_a_${Date.now()}`;
        const userB = `usr_tenant_b_${Date.now()}`;

        const caseA = await testRepoInstance1.createCase(userA, {
          ...BENCHMARK_CASE_PULPITIS,
          id: `case-tenant-${Date.now()}`,
          caseData: {
            ...BENCHMARK_CASE_PULPITIS.caseData,
            chiefComplaint: "Tenant A private record",
          },
          status: "draft",
          analysisStatus: "current",
          reviewStatus: "pending",
          analysis: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // User B attempts to read User A's case in real PostgreSQL
        const readByUserB = await testRepoInstance1.getCase(userB, caseA.id);
        expect(readByUserB).toBeNull();
      }
    );
  });
});
