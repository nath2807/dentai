import { describe, it, expect, beforeEach } from "vitest";
import {
  CloudRepository,
  ConcurrencyError,
  NotFoundError,
} from "./cloud-repository";
import type { StoredCase } from "./case-storage";
import { BENCHMARK_CASE_PULPITIS } from "./benchmark-cases";

function createValidSyntheticCase(id: string, chiefComplaint = "Routine examination"): StoredCase {
  return {
    ...BENCHMARK_CASE_PULPITIS,
    id,
    caseData: {
      ...BENCHMARK_CASE_PULPITIS.caseData,
      caseInformation: {
        ...BENCHMARK_CASE_PULPITIS.caseData.caseInformation,
        caseId: `SYNTH-${id}`,
      },
      chiefComplaint,
    },
    status: "draft",
    analysisStatus: "current",
    reviewStatus: "pending",
    analysis: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("Sprint 4 Cloud Repository & Multi-Tenant Data Isolation", () => {
  let repo: CloudRepository;
  const userA = "usr_clinician_alpha";
  const userB = "usr_clinician_beta";

  beforeEach(() => {
    repo = new CloudRepository();
    repo.clear();
  });

  describe("Cross-User Isolation & Ownership Enforcement", () => {
    it("strictly isolates cases: User A cannot see or retrieve User B's cases", async () => {
      const caseA = await repo.createCase(userA, createValidSyntheticCase("case_a_100", "Alpha patient"));
      const caseB = await repo.createCase(userB, createValidSyntheticCase("case_b_200", "Beta patient"));

      // User A lists cases -> only sees their own
      const listA = await repo.listCases(userA);
      expect(listA.some((c) => c.id === caseA.id)).toBe(true);
      expect(listA.some((c) => c.id === caseB.id)).toBe(false);

      // User B lists cases -> only sees their own
      const listB = await repo.listCases(userB);
      expect(listB.some((c) => c.id === caseB.id)).toBe(true);
      expect(listB.some((c) => c.id === caseA.id)).toBe(false);

      // User A attempting to access User B's case returns null (no enumeration leakage)
      const leakedCase = await repo.getCase(userA, caseB.id);
      expect(leakedCase).toBeNull();
    });

    it("prevents User A from modifying or deleting User B's case", async () => {
      const caseB = await repo.createCase(userB, createValidSyntheticCase("case_b_300"));

      // User A attempts update on User B's case -> throws NotFoundError
      await expect(
        repo.updateCase(userA, caseB.id, {
          caseData: {
            ...caseB.caseData,
            chiefComplaint: "Unauthorized modification attempt",
          },
        })
      ).rejects.toThrow(NotFoundError);

      // User A attempts delete on User B's case -> throws NotFoundError
      await expect(repo.deleteCase(userA, caseB.id)).rejects.toThrow(NotFoundError);

      // Verify User B's case remains intact and unchanged
      const intactCase = await repo.getCase(userB, caseB.id);
      expect(intactCase?.caseData.chiefComplaint).toBe(caseB.caseData.chiefComplaint);
      expect(intactCase?.deletedAt).toBeNull();
    });
  });

  describe("Optimistic Concurrency & Integer Versioning", () => {
    it("increments version monotonically on successful updates", async () => {
      const created = await repo.createCase(userA, createValidSyntheticCase("case_concurrency_1"));
      expect(created.version).toBe(1);

      const updated = await repo.updateCase(
        userA,
        created.id,
        { status: "analyzed" },
        1 // expected version
      );
      expect(updated.version).toBe(2);
      expect(updated.status).toBe("analyzed");
    });

    it("rejects concurrent edits with ConcurrencyError when expected version is stale", async () => {
      const created = await repo.createCase(userA, createValidSyntheticCase("case_concurrency_2"));
      expect(created.version).toBe(1);

      // Clinician 1 on Device 1 updates first
      await repo.updateCase(userA, created.id, { status: "analyzed" }, 1);

      // Clinician 1 on Device 2 attempts update still thinking version is 1
      await expect(
        repo.updateCase(userA, created.id, { status: "reviewed" }, 1)
      ).rejects.toThrow(ConcurrencyError);
    });
  });

  describe("Batch Synchronization & Conflict Handling", () => {
    it("creates new cases from client and detects conflicts when server has newer revision", async () => {
      const case1 = createValidSyntheticCase("sync_case_1", "Initial complaint");

      // Push 1: creates the case
      const res1 = await repo.syncBatch(userA, {
        pushes: [
          {
            id: case1.id,
            caseData: case1.caseData,
            status: "draft",
            analysisStatus: "current",
            reviewStatus: "pending",
            createdAt: case1.createdAt,
            updatedAt: case1.updatedAt,
            version: 0,
          },
        ],
      });

      expect(res1.results[0].status).toBe("created");
      expect(res1.results[0].serverVersion).toBe(1);

      // Update case on server to version 2
      await repo.updateCase(userA, case1.id, { status: "reviewed" }, 1);

      // Client with stale version 1 pushes edits -> receives conflict
      const res2 = await repo.syncBatch(userA, {
        pushes: [
          {
            id: case1.id,
            caseData: case1.caseData,
            status: "analyzed",
            analysisStatus: "current",
            reviewStatus: "pending",
            createdAt: case1.createdAt,
            updatedAt: new Date().toISOString(),
            version: 1, // stale!
          },
        ],
      });

      expect(res2.results[0].status).toBe("conflict");
      expect(res2.results[0].serverVersion).toBe(2);
      expect(res2.results[0].serverCase?.status).toBe("reviewed");
    });
  });

  describe("Safe Consent-Driven Local Migration", () => {
    it("rejects migration when explicit user consent is not given", async () => {
      const localCase = createValidSyntheticCase("local_1");
      await expect(
        repo.migrateBatch(userA, "alpha@dentarith.clinic", {
          cases: [localCase],
          strategy: "skip_existing",
          userConsentGiven: false,
        })
      ).rejects.toThrow("Explicit user consent is mandatory");
    });

    it("successfully migrates valid local cases and respects skip_existing duplicate strategy", async () => {
      const localCase1 = createValidSyntheticCase("local_mig_1");
      const localCase2 = createValidSyntheticCase("local_mig_2");

      // First migration: imports both
      const res1 = await repo.migrateBatch(userA, "alpha@dentarith.clinic", {
        cases: [localCase1, localCase2],
        strategy: "skip_existing",
        userConsentGiven: true,
      });

      expect(res1.importedCount).toBe(2);
      expect(res1.skippedCount).toBe(0);
      expect(res1.failedCount).toBe(0);

      // Second migration with duplicate cases: skips existing without error or overwrite
      const res2 = await repo.migrateBatch(userA, "alpha@dentarith.clinic", {
        cases: [localCase1],
        strategy: "skip_existing",
        userConsentGiven: true,
      });

      expect(res2.importedCount).toBe(0);
      expect(res2.skippedCount).toBe(1);
    });

    it("isolates malformed cases in batch without failing valid cases", async () => {
      const validCase = createValidSyntheticCase("valid_mig_1");
      const malformedCase = {
        id: "invalid_case",
        caseData: {
          caseInformation: { age: "not-a-number" }, // invalid schema
        },
      };

      const res = await repo.migrateBatch(userA, "alpha@dentarith.clinic", {
        cases: [validCase, malformedCase as unknown as StoredCase],
        strategy: "skip_existing",
        userConsentGiven: true,
      });

      expect(res.importedCount).toBe(1);
      expect(res.failedCount).toBe(1);
      expect(res.failures[0].caseId).toBe("invalid_case");
    });
  });

  describe("Immutable Append-Only Audit Trail", () => {
    it("logs audit events for clinical operations with tenant isolation", async () => {
      const newCase = await repo.createCase(
        userA,
        createValidSyntheticCase("audit_case_1"),
        "alpha@dentarith.clinic"
      );

      await repo.updateCase(
        userA,
        newCase.id,
        {
          review: {
            status: "reviewed",
            reviewedAt: new Date().toISOString(),
            reviewedBy: "Dr. Alpha",
            notes: "Clinical review completed",
          },
        },
        1,
        "alpha@dentarith.clinic"
      );

      const eventsA = await repo.listAuditEvents(userA, newCase.id);
      expect(eventsA.length).toBeGreaterThanOrEqual(2);
      expect(eventsA.some((e) => e.action === "create")).toBe(true);
      expect(eventsA.some((e) => e.action === "review_signed")).toBe(true);

      // User B cannot see User A's audit events
      const eventsB = await repo.listAuditEvents(userB, newCase.id);
      expect(eventsB).toHaveLength(0);
    });
  });
});
