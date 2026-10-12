/**
 * Unit Tests: PostgresCloudRepository Interface Conformance, Transactional Logic,
 * Concurrency Conflicts, Radiograph Stripping, and Isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostgresCloudRepository } from "./postgres-cloud-repository";
import { ConcurrencyError, NotFoundError } from "./cloud-repository";
import * as dbClient from "./db-client";
import { BENCHMARK_CASE_PULPITIS } from "./benchmark-cases";
import type { StoredCase } from "./case-storage";

vi.mock("./db-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db-client")>();
  return {
    ...actual,
    isDatabaseConfigured: vi.fn(() => true),
    query: vi.fn(),
    withTransaction: vi.fn(),
  };
});

function createSyntheticCase(id: string, chiefComplaint = "Routine examination"): StoredCase {
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
      radiograph: {
        fileName: "test_xray.png",
        mimeType: "image/png",
        size: 102400,
        dataUrl: "data:image/png;base64,RAW_MALICIOUS_OR_LARGE_BINARY_CONTENT",
      },
    },
    status: "draft",
    analysisStatus: "current",
    reviewStatus: "pending",
    analysis: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("PostgresCloudRepository Unit & Conformance Tests (Mocked DB Client)", () => {
  let repo: PostgresCloudRepository;
  const userA = "usr_clinician_alpha";

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PostgresCloudRepository();
  });

  describe("Radiograph Binary Content Stripping", () => {
    it("strips radiograph.dataUrl before persisting caseData to PostgreSQL", async () => {
      const syntheticCase = createSyntheticCase("strip_case_001");

      const mockClient = {
        query: vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
          if (sql.includes("SELECT user_id FROM clinical_cases")) {
            return Promise.resolve({ rows: [] });
          }
          if (sql.includes("INSERT INTO clinical_cases")) {
            const caseDataJson = JSON.parse(params![5] as string);
            // Verify radiograph dataUrl was stripped
            expect(caseDataJson.radiograph?.dataUrl).toBeUndefined();

            return Promise.resolve({
              rows: [
                {
                  id: "strip_case_001",
                  user_id: userA,
                  version: 1,
                  status: "draft",
                  analysis_status: "current",
                  review_status: "pending",
                  case_data: caseDataJson,
                  form_values: null,
                  analysis: null,
                  review: null,
                  created_at: new Date(),
                  updated_at: new Date(),
                  synced_at: new Date(),
                  deleted_at: null,
                },
              ],
            });
          }
          if (sql.includes("INSERT INTO audit_events")) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      vi.mocked(dbClient.withTransaction).mockImplementation(async (callback) => {
        return await callback(mockClient as unknown as import("pg").PoolClient);
      });

      const created = await repo.createCase(userA, syntheticCase);
      expect(created.id).toBe("strip_case_001");
      expect(created.caseData.radiograph?.dataUrl).toBeUndefined();
    });
  });

  describe("Cross-User Isolation & Ownership Enforcement", () => {
    it("returns null when User A attempts to read User B's case", async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [], // No case found with id AND user_id = userA
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const res = await repo.getCase(userA, "case_belonging_to_user_b");
      expect(res).toBeNull();
      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1 AND user_id = $2"),
        ["case_belonging_to_user_b", userA]
      );
    });

    it("throws NotFoundError when User A attempts to update User B's case", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }), // row lock select returns empty
      };
      vi.mocked(dbClient.withTransaction).mockImplementation(async (callback) => {
        return await callback(mockClient as unknown as import("pg").PoolClient);
      });

      await expect(
        repo.updateCase(userA, "case_belonging_to_user_b", { status: "reviewed" })
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when User A attempts to delete User B's case", async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      vi.mocked(dbClient.withTransaction).mockImplementation(async (callback) => {
        return await callback(mockClient as unknown as import("pg").PoolClient);
      });

      await expect(repo.deleteCase(userA, "case_belonging_to_user_b")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("Optimistic Concurrency Control", () => {
    it("throws ConcurrencyError when expectedVersion does not match current database version", async () => {
      const mockClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes("SELECT * FROM clinical_cases WHERE id = $1 AND user_id = $2 FOR UPDATE")) {
            return Promise.resolve({
              rows: [
                {
                  id: "concurrent_case_01",
                  user_id: userA,
                  version: 3, // Database is already at version 3
                  deleted_at: null,
                  case_data: JSON.stringify(createSyntheticCase("concurrent_case_01").caseData),
                },
              ],
            });
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      vi.mocked(dbClient.withTransaction).mockImplementation(async (callback) => {
        return await callback(mockClient as unknown as import("pg").PoolClient);
      });

      await expect(
        repo.updateCase(
          userA,
          "concurrent_case_01",
          { status: "analyzed" },
          1 // Stale expected version!
        )
      ).rejects.toThrow(ConcurrencyError);
    });
  });

  describe("Transactional Rollback on Failure", () => {
    it("bubbles up error and initiates rollback when case insertion fails", async () => {
      const mockClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes("INSERT INTO clinical_cases")) {
            throw new Error("PostgreSQL foreign key violation: user does not exist");
          }
          return Promise.resolve({ rows: [] });
        }),
      };

      vi.mocked(dbClient.withTransaction).mockImplementation(async (callback) => {
        // withTransaction naturally rolls back when callback rejects
        return await callback(mockClient as unknown as import("pg").PoolClient);
      });

      await expect(repo.createCase(userA, createSyntheticCase("fail_case_01"))).rejects.toThrow(
        "PostgreSQL foreign key violation"
      );
    });
  });

  describe("Cursor-Based Delta Synchronization & Pagination", () => {
    it("includes since cursor in query filtering by synced_at timestamp", async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      const sinceTimestamp = "2026-03-01T12:00:00.000Z";
      await repo.listCases(userA, { since: sinceTimestamp });

      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringContaining("synced_at >= $2"),
        [userA, expect.any(String)]
      );
    });

    it("applies parameterized limit and offset constraints in listCases query", async () => {
      vi.mocked(dbClient.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

      await repo.listCases(userA, { limit: 25, offset: 50 });

      expect(dbClient.query).toHaveBeenCalledWith(
        expect.stringMatching(/LIMIT \$2 OFFSET \$3/),
        [userA, 25, 50]
      );
    });
  });
});
