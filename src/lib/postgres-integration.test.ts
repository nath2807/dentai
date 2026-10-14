/**
 * Explicit disposable-local PostgreSQL checks; never part of the default suite.
 * Synthetic fixture rows are retained. Teardown only closes connections.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, query, testDatabaseConnection } from "./db-client";
import { runMigrations } from "./db-migrate";
import { PostgresCloudRepository } from "./postgres-cloud-repository";
import { PostgresUserStore } from "./postgres-user-store";
import { ConcurrencyError, NotFoundError } from "./cloud-repository";
import { BENCHMARK_CASE_PULPITIS } from "./benchmark-cases";
import type { StoredCase } from "./case-storage";
import type { UserProfile } from "./auth-types";
import { getPostgresTestUrl } from "../../tests/postgres-safety";

const approvedUrl = getPostgresTestUrl(process.env);
if (process.env.DATABASE_URL !== approvedUrl) {
  throw new Error("PostgreSQL integration must use the dedicated test configuration.");
}

function syntheticCase(chiefComplaint = "Synthetic database persistence check"): StoredCase {
  const id = `test-${randomUUID()}`;
  return {
    ...BENCHMARK_CASE_PULPITIS,
    id,
    caseData: {
      ...BENCHMARK_CASE_PULPITIS.caseData,
      caseInformation: { ...BENCHMARK_CASE_PULPITIS.caseData.caseInformation, caseId: id },
      chiefComplaint,
    },
    status: "draft",
    analysisStatus: "current",
    reviewStatus: "pending",
    review: null,
    analysis: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("Disposable PostgreSQL persistence, isolation, and transactions", () => {
  let userA: UserProfile;
  let userB: UserProfile;
  let repo: PostgresCloudRepository;

  beforeAll(async () => {
    // Failed connectivity is a failure, not a suite that silently skips assertions.
    const health = await testDatabaseConnection();
    if (!health.ok) {
      throw new Error("Disposable PostgreSQL is unavailable. No migrations or fixtures were applied.");
    }
    const database = await query<{ name: string }>("SELECT current_database() AS name");
    expect(database.rows[0].name).toBe(decodeURIComponent(new URL(approvedUrl).pathname.slice(1)));
    await runMigrations();

    // Required foreign-key users exist before cases are written. Do not seed demos.
    const users = new PostgresUserStore({ seedDemo: false });
    const suffix = randomUUID();
    userA = await users.create({
      email: `integration-a-${suffix}@example.test`,
      password: "SyntheticIntegration123!",
      name: "Synthetic Clinician A",
    });
    userB = await users.create({
      email: `integration-b-${suffix}@example.test`,
      password: "SyntheticIntegration123!",
      name: "Synthetic Clinician B",
    });
    repo = new PostgresCloudRepository({ seedDemo: false });
  });

  afterAll(async () => {
    // Never clear, delete, truncate, or drop. The disposable database's owner
    // controls its lifetime; repeated runs use distinct synthetic IDs.
    await closePool();
  });

  it("applies migrations idempotently", async () => {
    expect(await runMigrations()).toEqual({ applied: [], alreadyUpToDate: true });
  });

  it("persists a case and audit event after reopening the connection pool", async () => {
    const input = syntheticCase();
    const created = await repo.createCase(userA.id, input, userA.email);
    await closePool();
    const secondRepo = new PostgresCloudRepository({ seedDemo: false });
    expect(await secondRepo.getCase(userA.id, created.id)).toMatchObject({
      id: input.id,
      version: 1,
      caseData: { chiefComplaint: input.caseData.chiefComplaint },
    });
    expect(await secondRepo.listAuditEvents(userA.id, created.id)).toEqual([
      expect.objectContaining({ action: "create", version: 1, userId: userA.id }),
    ]);
  });

  it("isolates case reads, updates, lists, and audit events by user", async () => {
    const created = await repo.createCase(userA.id, syntheticCase(), userA.email);
    expect(await repo.getCase(userB.id, created.id)).toBeNull();
    expect(await repo.listCases(userB.id)).toEqual([]);
    expect(await repo.listAuditEvents(userB.id, created.id)).toEqual([]);
    await expect(repo.updateCase(userB.id, created.id, { status: "analyzed" }, 1))
      .rejects.toThrow(NotFoundError);
    expect((await repo.getCase(userA.id, created.id))?.version).toBe(1);
  });

  it("allows only one concurrent update from the same expected version", async () => {
    const created = await repo.createCase(userA.id, syntheticCase(), userA.email);
    const results = await Promise.allSettled([
      repo.updateCase(userA.id, created.id, {
        caseData: { ...created.caseData, chiefComplaint: "Synthetic concurrent edit A" },
      }, 1, userA.email),
      repo.updateCase(userA.id, created.id, {
        caseData: { ...created.caseData, chiefComplaint: "Synthetic concurrent edit B" },
      }, 1, userA.email),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(ConcurrencyError);
    const stored = await repo.getCase(userA.id, created.id);
    expect(stored?.version).toBe(2);
    expect(["Synthetic concurrent edit A", "Synthetic concurrent edit B"])
      .toContain(stored?.caseData.chiefComplaint);
    const events = await repo.listAuditEvents(userA.id, created.id);
    expect(events).toHaveLength(2);
    expect(events.filter((event) => event.action === "update")).toHaveLength(1);
  });

  it("rolls back a case insertion when its audit insert fails", async () => {
    const input = syntheticCase();
    // The case insert is valid; user_email exceeds the audit column's varchar(255).
    await expect(repo.createCase(userA.id, input, "x".repeat(256))).rejects.toThrow();
    expect(await repo.getCase(userA.id, input.id)).toBeNull();
    expect(await repo.listAuditEvents(userA.id, input.id)).toEqual([]);
  });

  it("rolls back an updated case/version when its audit insert fails", async () => {
    const input = syntheticCase();
    const created = await repo.createCase(userA.id, input, userA.email);
    await expect(repo.updateCase(userA.id, created.id, {
      caseData: { ...created.caseData, chiefComplaint: "Synthetic edit that must roll back" },
    }, 1, "x".repeat(256))).rejects.toThrow();
    expect(await repo.getCase(userA.id, created.id)).toMatchObject({
      version: 1,
      caseData: { chiefComplaint: input.caseData.chiefComplaint },
    });
    expect(await repo.listAuditEvents(userA.id, created.id)).toHaveLength(1);
  });
});
