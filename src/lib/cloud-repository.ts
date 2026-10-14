import crypto from "crypto";
import { clinicalCaseSchema } from "./clinical-case";
import { sanitizeCaseForStorage, type StoredCase } from "./case-storage";
import { BENCHMARK_CASE_PULPITIS } from "./benchmark-cases";
import type {
  CloudCaseRecord,
  AuditEvent,
  SyncBatchRequest,
  SyncBatchResponse,
  SyncPushResult,
  MigrationRequest,
  MigrationResult,
  AuditAction,
} from "./cloud-types";

import { PostgresCloudRepository } from "./postgres-cloud-repository";
import { isDatabaseConfigured, DatabaseConfigurationError } from "./db-client";

export class ConcurrencyError extends Error {
  constructor(
    public caseId: string,
    public currentVersion: number,
    public attemptedVersion?: number
  ) {
    super(
      `Concurrency conflict on case ${caseId}. Server is at version ${currentVersion}, but update requested version ${attemptedVersion ?? "unspecified"}.`
    );
    this.name = "ConcurrencyError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized access to clinical record.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export interface ICloudRepository {
  listCases(
    userId: string,
    options?: { since?: string; includeDeleted?: boolean; limit?: number; offset?: number }
  ): Promise<CloudCaseRecord[]>;
  getCase(userId: string, caseId: string): Promise<CloudCaseRecord | null>;
  createCase(
    userId: string,
    storedCase: StoredCase,
    userEmail?: string
  ): Promise<CloudCaseRecord>;
  updateCase(
    userId: string,
    caseId: string,
    updates: Partial<StoredCase>,
    expectedVersion?: number,
    userEmail?: string
  ): Promise<CloudCaseRecord>;
  deleteCase(
    userId: string,
    caseId: string,
    userEmail?: string,
    expectedVersion?: number
  ): Promise<{ success: boolean; version: number }>;
  syncBatch(
    userId: string,
    request: SyncBatchRequest,
    userEmail?: string
  ): Promise<SyncBatchResponse>;
  migrateBatch(
    userId: string,
    userEmail: string,
    request: MigrationRequest
  ): Promise<MigrationResult>;
  listAuditEvents(userId: string, caseId?: string): Promise<AuditEvent[]>;
  clear(): Promise<void> | void;
}

/**
 * Server-side Multi-Tenant Cloud Repository for Clinical Cases and Audit Events (In-Memory Test Adapter).
 * Strictly isolated for unit testing and local offline development.
 */
export class CloudRepository implements ICloudRepository {
  private cases = new Map<string, CloudCaseRecord>(); // key: caseId
  private auditEvents: AuditEvent[] = [];

  constructor() {
    this.seedDemoCloudData();
  }

  private seedDemoCloudData() {
    // Only seed demo case in non-production or if explicitly enabled
    const isProduction = process.env.NODE_ENV === "production";
    const enableDemo = process.env.ENABLE_DEMO_ACCOUNTS === "true";
    if (isProduction && !enableDemo) {
      return;
    }

    // Seed an initial cloud case for the demo clinician (dr.chen@dentarith.clinic)
    const demoUserId = "usr_clinical_demo_01";
    const demoCaseId = "case-cloud-demo-001";
    const now = new Date("2026-03-01T10:00:00Z").toISOString();

    const demoCase: CloudCaseRecord = {
      id: demoCaseId,
      userId: demoUserId,
      version: 1,
      caseData: {
        ...BENCHMARK_CASE_PULPITIS.caseData,
        caseInformation: {
          ...BENCHMARK_CASE_PULPITIS.caseData.caseInformation,
          caseId: "DEMO-PERIO-CLOUD-1",
        },
        chiefComplaint: "Bleeding gums while brushing and dull ache around upper right molars.",
      },
      status: "reviewed",
      analysisStatus: "current",
      reviewStatus: "reviewed",
      analysis: null,
      review: {
        status: "reviewed",
        reviewedAt: now,
        reviewedBy: "Dr. Sarah Chen, DDS",
        notes: "Cloud baseline verified for demonstration.",
      },
      createdAt: now,
      updatedAt: now,
      syncedAt: now,
      deletedAt: null,
    };

    this.cases.set(demoCaseId, demoCase);
    this.auditEvents.push({
      id: "aud_demo_init_01",
      caseId: demoCaseId,
      userId: demoUserId,
      userEmail: "dr.chen@dentarith.clinic",
      action: "create",
      timestamp: now,
      version: 1,
      details: "Initial seeded cloud case",
    });
  }

  /**
   * Helper: Record an append-only audit event.
   */
  private recordAudit(
    action: AuditAction,
    userId: string,
    caseId?: string,
    version?: number,
    details?: string,
    userEmail?: string
  ): void {
    const event: AuditEvent = {
      id: `aud_${crypto.randomBytes(8).toString("hex")}`,
      caseId,
      userId,
      userEmail,
      action,
      timestamp: new Date().toISOString(),
      version,
      details,
    };
    this.auditEvents.push(event);
  }

  /**
   * List all non-deleted cases belonging to a specific user.
   */
  async listCases(
    userId: string,
    options?: { since?: string; includeDeleted?: boolean; limit?: number; offset?: number }
  ): Promise<CloudCaseRecord[]> {
    let results: CloudCaseRecord[] = [];
    const sinceTime = options?.since ? new Date(options.since).getTime() : 0;

    for (const record of this.cases.values()) {
      if (record.userId !== userId) continue;

      if (!options?.includeDeleted && record.deletedAt) continue;

      if (sinceTime > 0) {
        const recordTime = new Date(record.syncedAt || record.updatedAt).getTime();
        if (recordTime < sinceTime) continue;
      }

      results.push({ ...record });
    }

    // Sort descending by syncedAt / updatedAt
    results.sort(
      (a, b) =>
        new Date(b.syncedAt || b.updatedAt).getTime() -
        new Date(a.syncedAt || a.updatedAt).getTime()
    );

    if (typeof options?.offset === "number" && options.offset > 0) {
      results = results.slice(options.offset);
    }
    if (typeof options?.limit === "number" && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get a single case by ID with strict ownership verification.
   * Returns null if case doesn't exist or belongs to another user.
   */
  async getCase(userId: string, caseId: string): Promise<CloudCaseRecord | null> {
    const record = this.cases.get(caseId);
    if (!record) return null;
    if (record.userId !== userId) return null; // Prevent enumeration
    if (record.deletedAt) return null;
    return { ...record };
  }

  /**
   * Create a new case in cloud storage for the authenticated user.
   */
  async createCase(
    userId: string,
    storedCase: StoredCase,
    userEmail?: string
  ): Promise<CloudCaseRecord> {
    // Validate clinical case payload
    clinicalCaseSchema.parse(storedCase.caseData);
    const safeData = sanitizeCaseForStorage(storedCase.caseData);

    const now = new Date().toISOString();
    const id = storedCase.id || `case-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    const existing = this.cases.get(id);
    if (existing) {
      if (existing.userId !== userId) {
        // ID collision with another user's case - generate unique ID for this user
        return this.createCase(
          userId,
          { ...storedCase, id: `case-${Date.now()}-${crypto.randomBytes(4).toString("hex")}` },
          userEmail
        );
      }
      throw new Error(`A cloud case with ID ${id} already exists.`);
    }

    const cloudRecord: CloudCaseRecord = {
      id,
      userId,
      version: 1,
      caseData: safeData,
      formValues: storedCase.formValues,
      analysis: storedCase.analysis ?? null,
      status: storedCase.status || "draft",
      analysisStatus: storedCase.analysisStatus || "current",
      reviewStatus: storedCase.reviewStatus || "pending",
      review: storedCase.review ?? null,
      createdAt: storedCase.createdAt || now,
      updatedAt: storedCase.updatedAt || now,
      syncedAt: now,
      deletedAt: null,
    };

    this.cases.set(id, cloudRecord);
    this.recordAudit("create", userId, id, 1, "Case created in cloud storage", userEmail);

    return { ...cloudRecord };
  }

  /**
   * Update an existing case with ownership check and optimistic concurrency control.
   */
  async updateCase(
    userId: string,
    caseId: string,
    updates: Partial<StoredCase>,
    expectedVersion?: number,
    userEmail?: string
  ): Promise<CloudCaseRecord> {
    const existing = this.cases.get(caseId);
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw new NotFoundError(`Case ${caseId} not found.`);
    }

    // Optimistic concurrency check
    if (expectedVersion !== undefined && expectedVersion !== existing.version) {
      throw new ConcurrencyError(caseId, existing.version, expectedVersion);
    }

    // Sanitize caseData if provided
    let safeCaseData = existing.caseData;
    if (updates.caseData) {
      clinicalCaseSchema.parse(updates.caseData);
      safeCaseData = sanitizeCaseForStorage(updates.caseData);
    }

    const nextVersion = existing.version + 1;
    const now = new Date().toISOString();

    const updatedRecord: CloudCaseRecord = {
      ...existing,
      version: nextVersion,
      caseData: safeCaseData,
      formValues: updates.formValues !== undefined ? updates.formValues : existing.formValues,
      analysis: updates.analysis !== undefined ? updates.analysis : existing.analysis,
      status: updates.status || existing.status,
      analysisStatus: updates.analysisStatus || existing.analysisStatus,
      reviewStatus: updates.reviewStatus || existing.reviewStatus,
      review: updates.review !== undefined ? updates.review : existing.review,
      updatedAt: updates.updatedAt || now,
      syncedAt: now,
    };

    this.cases.set(caseId, updatedRecord);

    const isReview = updates.review && updates.review.status === "reviewed";
    this.recordAudit(
      isReview ? "review_signed" : "update",
      userId,
      caseId,
      nextVersion,
      isReview ? "Clinician review submitted and signed" : "Case updated in cloud storage",
      userEmail
    );

    return { ...updatedRecord };
  }

  /**
   * Soft-delete a case owned by the user.
   */
  async deleteCase(
    userId: string,
    caseId: string,
    userEmail?: string,
    expectedVersion?: number
  ): Promise<{ success: boolean; version: number }> {
    const existing = this.cases.get(caseId);
    if (!existing || existing.userId !== userId || existing.deletedAt) {
      throw new NotFoundError(`Case ${caseId} not found.`);
    }

    if (expectedVersion !== undefined && expectedVersion !== existing.version) {
      throw new ConcurrencyError(caseId, existing.version, expectedVersion);
    }

    const nextVersion = existing.version + 1;
    const now = new Date().toISOString();

    const updatedRecord: CloudCaseRecord = {
      ...existing,
      version: nextVersion,
      deletedAt: now,
      updatedAt: now,
      syncedAt: now,
    };

    this.cases.set(caseId, updatedRecord);
    this.recordAudit("delete", userId, caseId, nextVersion, "Case soft-deleted from cloud", userEmail);

    return { success: true, version: nextVersion };
  }

  /**
   * Process a batch synchronization request (push modifications and pull updates).
   */
  async syncBatch(
    userId: string,
    request: SyncBatchRequest,
    userEmail?: string
  ): Promise<SyncBatchResponse> {
    const results: SyncPushResult[] = [];

    for (const push of request.pushes) {
      try {
        const existing = this.cases.get(push.id);

        if (push.deleted) {
          if (existing && existing.userId === userId && !existing.deletedAt) {
            if (push.version !== existing.version) {
              results.push({ caseId: push.id, status: "conflict", serverVersion: existing.version, serverCase: existing });
              continue;
            }
            const delRes = await this.deleteCase(userId, push.id, userEmail, push.version);
            results.push({
              caseId: push.id,
              status: "updated",
              serverVersion: delRes.version,
            });
          } else {
            results.push({ caseId: push.id, status: "up_to_date" });
          }
          continue;
        }

        if (!existing) {
          // New case to create
          const created = await this.createCase(
            userId,
            {
              id: push.id,
              caseData: push.caseData,
              formValues: push.formValues,
              analysis: push.analysis ?? null,
              status: push.status,
              analysisStatus: push.analysisStatus,
              reviewStatus: push.reviewStatus,
              review: push.review,
              createdAt: push.createdAt,
              updatedAt: push.updatedAt,
            },
            userEmail
          );
          results.push({
            caseId: push.id,
            status: "created",
            serverVersion: created.version,
            serverCase: created,
          });
        } else if (existing.userId !== userId) {
          // Belongs to another user - forbid overwrite
          results.push({
            caseId: push.id,
            status: "error",
            error: "Ownership conflict: ID already assigned to another user.",
          });
        } else {
          // Existing case for this user
          const clientVersion = push.version || 0;
          if (existing.deletedAt || clientVersion !== existing.version) {
            // Server has newer updates -> conflict!
            results.push({
              caseId: push.id,
              status: "conflict",
              serverVersion: existing.version,
              serverCase: existing,
              error: `Server has newer version (${existing.version}) than client (${clientVersion}).`,
            });
          } else {
            // Client is up to date or has new edits -> apply update
            const updated = await this.updateCase(
              userId,
              push.id,
              {
                caseData: push.caseData,
                formValues: push.formValues,
                analysis: push.analysis,
                status: push.status,
                analysisStatus: push.analysisStatus,
                reviewStatus: push.reviewStatus,
                review: push.review,
                updatedAt: push.updatedAt,
              },
              push.version,
              userEmail
            );
            results.push({
              caseId: push.id,
              status: "updated",
              serverVersion: updated.version,
              serverCase: updated,
            });
          }
        }
      } catch (err: unknown) {
        results.push({
          caseId: push.id,
          status: "error",
          error: err instanceof ConcurrencyError ? "The case changed during synchronization. Please review both copies." : "The case could not be synchronized. Please retry.",
        });
      }
    }

    // Pull any changes for this user since last sync timestamp
    const pulledCases = await this.listCases(userId, {
      since: request.since,
      includeDeleted: true, // Need to include soft-deleted to propagate deletions to client
    });

    return {
      userId,
      results,
      pulledCases,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Execute migration of local cases with explicit strategy and consent.
   */
  async migrateBatch(
    userId: string,
    userEmail: string,
    request: MigrationRequest
  ): Promise<MigrationResult> {
    if (!request.userConsentGiven) {
      throw new Error("Explicit user consent is mandatory for cloud migration.");
    }

    const importedCaseIds: string[] = [];
    const failures: { caseId: string; reason: string }[] = [];
    let skippedCount = 0;

    for (const rawCase of request.cases) {
      const caseId = rawCase.id || "unknown";
      try {
        // Validate clinical structure
        clinicalCaseSchema.parse(rawCase.caseData);
        const safeData = sanitizeCaseForStorage(rawCase.caseData);

        const existing = this.cases.get(caseId);

        if (existing) {
          if (existing.userId !== userId) {
            // ID assigned to another account
            if (request.strategy === "clone_as_new") {
              const newId = `case-migrated-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
              const created = await this.createCase(
                userId,
                {
                  ...rawCase,
                  id: newId,
                  caseData: safeData,
                  analysis: rawCase.analysis ?? null,
                  status: rawCase.status ?? "draft",
                  analysisStatus: rawCase.analysisStatus ?? "current",
                  reviewStatus: rawCase.reviewStatus ?? "pending",
                  createdAt: rawCase.createdAt ?? new Date().toISOString(),
                  updatedAt: rawCase.updatedAt ?? new Date().toISOString(),
                },
                userEmail
              );
              importedCaseIds.push(created.id);
            } else {
              failures.push({
                caseId,
                reason: "Case ID conflicts with another user's existing record.",
              });
            }
            continue;
          }

          // Case exists for this user
          if (request.strategy === "skip_existing") {
            skippedCount++;
            continue;
          } else if (request.strategy === "overwrite_existing") {
            const updated = await this.updateCase(
              userId,
              caseId,
              {
                caseData: safeData,
                formValues: rawCase.formValues,
                analysis: rawCase.analysis ?? null,
                status: rawCase.status || "draft",
                analysisStatus: rawCase.analysisStatus || "current",
                reviewStatus: rawCase.reviewStatus || "pending",
                review: rawCase.review ?? null,
                updatedAt: rawCase.updatedAt,
              },
              undefined,
              userEmail
            );
            importedCaseIds.push(updated.id);
          } else if (request.strategy === "clone_as_new") {
            const newId = `case-migrated-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
            const created = await this.createCase(
              userId,
              {
                ...rawCase,
                id: newId,
                caseData: safeData,
                analysis: rawCase.analysis ?? null,
                status: rawCase.status ?? "draft",
                analysisStatus: rawCase.analysisStatus ?? "current",
                reviewStatus: rawCase.reviewStatus ?? "pending",
                createdAt: rawCase.createdAt ?? new Date().toISOString(),
                updatedAt: rawCase.updatedAt ?? new Date().toISOString(),
              },
              userEmail
            );
            importedCaseIds.push(created.id);
          }
        } else {
          // Brand new case
          const created = await this.createCase(
            userId,
            {
              ...rawCase,
              caseData: safeData,
              analysis: rawCase.analysis ?? null,
              status: rawCase.status ?? "draft",
              analysisStatus: rawCase.analysisStatus ?? "current",
              reviewStatus: rawCase.reviewStatus ?? "pending",
              createdAt: rawCase.createdAt ?? new Date().toISOString(),
              updatedAt: rawCase.updatedAt ?? new Date().toISOString(),
            },
            userEmail
          );
          importedCaseIds.push(created.id);
        }
      } catch (err: unknown) {
        failures.push({
          caseId,
          reason: err instanceof Error ? err.message : "Validation or migration error",
        });
      }
    }

    this.recordAudit(
      "migrated",
      userId,
      undefined,
      undefined,
      `Batch migration completed: ${importedCaseIds.length} imported, ${skippedCount} skipped, ${failures.length} failed. Strategy: ${request.strategy}`,
      userEmail
    );

    return {
      totalSubmitted: request.cases.length,
      importedCount: importedCaseIds.length,
      skippedCount,
      failedCount: failures.length,
      failures,
      importedCaseIds,
      completedAt: new Date().toISOString(),
    };
  }

  /**
   * List audit log events for compliance and traceability, strictly scoped to userId.
   */
  async listAuditEvents(userId: string, caseId?: string): Promise<AuditEvent[]> {
    return this.auditEvents
      .filter((e) => e.userId === userId && (!caseId || e.caseId === caseId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Clear all records (used in test fixtures).
   */
  clear() {
    this.cases.clear();
    this.auditEvents = [];
    this.seedDemoCloudData();
  }
}

// Global cache references on globalThis
interface GlobalRepositoryStore {
  __dentarith_pg_cloud_repo__?: PostgresCloudRepository;
  __dentarith_in_memory_repo__?: CloudRepository;
}

const globalRepoStore = globalThis as unknown as GlobalRepositoryStore;

/**
 * Factory that returns the active repository.
 * FAIL-CLOSED: In production, missing DATABASE_URL throws immediately without fallback.
 */
export function getCloudRepository(): ICloudRepository {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!isDatabaseConfigured()) {
      throw new DatabaseConfigurationError(
        "CRITICAL SECURITY CONFIGURATION ERROR: Cloud persistence is enabled in production, but DATABASE_URL is not configured. Failing closed to prevent data loss."
      );
    }
    if (!globalRepoStore.__dentarith_pg_cloud_repo__) {
      globalRepoStore.__dentarith_pg_cloud_repo__ = new PostgresCloudRepository();
    }
    return globalRepoStore.__dentarith_pg_cloud_repo__;
  }

  // Development / Test environments
  if (isDatabaseConfigured()) {
    if (!globalRepoStore.__dentarith_pg_cloud_repo__) {
      globalRepoStore.__dentarith_pg_cloud_repo__ = new PostgresCloudRepository();
    }
    return globalRepoStore.__dentarith_pg_cloud_repo__;
  }

  // Isolated in-memory test adapter for offline tests and local prototyping
  if (!globalRepoStore.__dentarith_in_memory_repo__) {
    globalRepoStore.__dentarith_in_memory_repo__ = new CloudRepository();
  }
  return globalRepoStore.__dentarith_in_memory_repo__;
}

/**
 * Dynamic proxy providing the CloudRepository contract across API routes.
 */
export const cloudRepository: ICloudRepository = new Proxy({} as ICloudRepository, {
  get(_target, prop) {
    const repo = getCloudRepository();
    const val = (repo as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(repo);
    }
    return val;
  },
});

