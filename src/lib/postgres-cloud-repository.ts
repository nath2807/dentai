/**
 * Dentarith Durable PostgreSQL Cloud Repository.
 *
 * Implements the CloudRepository contract over a real PostgreSQL database with:
 * - Strict tenant isolation by userId.
 * - Monotonic integer versioning & optimistic concurrency control.
 * - Transactional atomicity: case mutations and audit records committed together.
 * - Automatic radiograph binary content / dataUrl stripping.
 * - Safe serverless pool usage and fail-closed security.
 */
import crypto from "crypto";
import { clinicalCaseSchema } from "./clinical-case";
import { sanitizeCaseForStorage, type StoredCase } from "./case-storage";
import { BENCHMARK_CASE_PULPITIS } from "./benchmark-cases";
import {
  type CloudCaseRecord,
  type AuditEvent,
  type SyncBatchRequest,
  type SyncBatchResponse,
  type SyncPushResult,
  type MigrationRequest,
  type MigrationResult,
  type AuditAction,
} from "./cloud-types";
import { ConcurrencyError, NotFoundError } from "./cloud-repository";
import { query, withTransaction, isDatabaseConfigured } from "./db-client";

interface DbClinicalCaseRow {
  id: string;
  user_id: string;
  version: number;
  status: string;
  analysis_status: string;
  review_status: string;
  case_data: unknown;
  form_values: unknown;
  analysis: unknown;
  review: unknown;
  created_at: Date | string;
  updated_at: Date | string;
  synced_at: Date | string;
  deleted_at: Date | string | null;
}

export class PostgresCloudRepository {
  constructor(options: { seedDemo?: boolean } = {}) {
    if (options.seedDemo !== false) {
      void this.seedDemoCloudData();
    }
  }

  private async seedDemoCloudData(): Promise<void> {
    if (!isDatabaseConfigured()) return;

    const isProduction = process.env.NODE_ENV === "production";
    const enableDemo = process.env.ENABLE_DEMO_ACCOUNTS === "true";
    if (isProduction && !enableDemo) {
      return;
    }

    try {
      const demoUserId = "usr_clinical_demo_01";
      const demoCaseId = "case-cloud-demo-001";
      const now = new Date("2026-03-01T10:00:00Z").toISOString();

      const existing = await query("SELECT id FROM clinical_cases WHERE id = $1 AND user_id = $2", [
        demoCaseId,
        demoUserId,
      ]);
      if (existing.rows.length > 0) return;

      const safeCaseData = sanitizeCaseForStorage({
        ...BENCHMARK_CASE_PULPITIS.caseData,
        caseInformation: {
          ...BENCHMARK_CASE_PULPITIS.caseData.caseInformation,
          caseId: "DEMO-PERIO-CLOUD-1",
        },
        chiefComplaint: "Bleeding gums while brushing and dull ache around upper right molars.",
      });

      await withTransaction(async (client) => {
        // Ensure demo user exists before inserting foreign key
        await client.query(
          `INSERT INTO users (id, email, name, role, license_number, organization, password_hash, password_salt, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            demoUserId,
            "dr.chen@dentarith.clinic",
            "Dr. Sarah Chen, DDS",
            "clinician",
            "DDS-CA-98421",
            "Metropolitan Dental Group",
            "placeholder_hash",
            "placeholder_salt",
            now,
            now,
          ]
        );

        await client.query(
          `INSERT INTO clinical_cases (
             id, user_id, version, status, analysis_status, review_status,
             case_data, form_values, analysis, review, created_at, updated_at, synced_at, deleted_at
           ) VALUES ($1, $2, 1, 'reviewed', 'current', 'reviewed', $3, $4, $5, $6, $7, $8, $9, NULL)
           ON CONFLICT (id, user_id) DO NOTHING`,
          [
            demoCaseId,
            demoUserId,
            JSON.stringify(safeCaseData),
            null,
            null,
            JSON.stringify({
              status: "reviewed",
              reviewedAt: now,
              reviewedBy: "Dr. Sarah Chen, DDS",
              notes: "Cloud baseline verified for demonstration.",
            }),
            now,
            now,
            now,
          ]
        );

        await client.query(
          `INSERT INTO audit_events (id, case_id, user_id, user_email, action, timestamp, version, details)
           VALUES ($1, $2, $3, $4, 'create', $5, 1, 'Initial seeded cloud case')
           ON CONFLICT (id) DO NOTHING`,
          ["aud_demo_init_01", demoCaseId, demoUserId, "dr.chen@dentarith.clinic", now]
        );
      });
    } catch {
      // Safe fallback if database tables are not yet migrated
    }
  }

  /**
   * Helper: Map database row to CloudCaseRecord.
   */
  private mapRowToCloudCase(row: DbClinicalCaseRow): CloudCaseRecord {
    return {
      id: row.id,
      userId: row.user_id,
      version: row.version,
      status: row.status as CloudCaseRecord["status"],
      analysisStatus: row.analysis_status as CloudCaseRecord["analysisStatus"],
      reviewStatus: row.review_status as CloudCaseRecord["reviewStatus"],
      caseData: typeof row.case_data === "string" ? JSON.parse(row.case_data) : row.case_data,
      formValues:
        row.form_values ? (typeof row.form_values === "string" ? JSON.parse(row.form_values) : row.form_values) : undefined,
      analysis:
        row.analysis ? (typeof row.analysis === "string" ? JSON.parse(row.analysis) : row.analysis) : null,
      review:
        row.review ? (typeof row.review === "string" ? JSON.parse(row.review) : row.review) : null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      syncedAt: new Date(row.synced_at).toISOString(),
      deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    };
  }

  /**
   * List cases belonging to a specific user, with optional timestamp cursor and soft-delete inclusion.
   */
  async listCases(
    userId: string,
    options?: { since?: string; includeDeleted?: boolean; limit?: number; offset?: number }
  ): Promise<CloudCaseRecord[]> {
    let sql = "SELECT * FROM clinical_cases WHERE user_id = $1";
    const params: unknown[] = [userId];

    if (!options?.includeDeleted) {
      sql += " AND deleted_at IS NULL";
    }

    if (options?.since) {
      params.push(new Date(options.since).toISOString());
      sql += ` AND synced_at >= $${params.length}`;
    }

    sql += " ORDER BY synced_at DESC, id DESC";

    if (typeof options?.limit === "number" && options.limit > 0) {
      params.push(Math.min(Math.max(1, Math.floor(options.limit)), 100));
      sql += ` LIMIT $${params.length}`;
    }

    if (typeof options?.offset === "number" && options.offset >= 0) {
      params.push(Math.max(0, Math.floor(options.offset)));
      sql += ` OFFSET $${params.length}`;
    }

    const res = await query(sql, params);
    return res.rows.map((row) => this.mapRowToCloudCase(row as unknown as DbClinicalCaseRow));
  }

  /**
   * Retrieve a single case by ID with strict tenant scoping.
   * Returns null if case does not exist, belongs to another user, or is soft-deleted.
   */
  async getCase(userId: string, caseId: string): Promise<CloudCaseRecord | null> {
    const res = await query(
      "SELECT * FROM clinical_cases WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [caseId, userId]
    );

    if (res.rows.length === 0) return null;
    return this.mapRowToCloudCase(res.rows[0] as unknown as DbClinicalCaseRow);
  }

  /**
   * Create a new clinical case in PostgreSQL with transactional audit record.
   */
  async createCase(
    userId: string,
    storedCase: StoredCase,
    userEmail?: string
  ): Promise<CloudCaseRecord> {
    clinicalCaseSchema.parse(storedCase.caseData);
    const safeData = sanitizeCaseForStorage(storedCase.caseData);

    const now = new Date().toISOString();
    let id = storedCase.id || `case-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    return await withTransaction(async (client) => {
      // Check collision
      const existingCheck = await client.query(
        "SELECT user_id FROM clinical_cases WHERE id = $1",
        [id]
      );

      if (existingCheck.rows.length > 0) {
        if (existingCheck.rows[0].user_id !== userId) {
          // Collision with another user's case -> generate unique ID for this user
          id = `case-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
        } else {
          throw new Error(`A cloud case with ID ${id} already exists.`);
        }
      }

      const res = await client.query(
        `INSERT INTO clinical_cases (
           id, user_id, version, status, analysis_status, review_status,
           case_data, form_values, analysis, review, created_at, updated_at, synced_at, deleted_at
         ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL)
         RETURNING *`,
        [
          id,
          userId,
          storedCase.status || "draft",
          storedCase.analysisStatus || "current",
          storedCase.reviewStatus || "pending",
          JSON.stringify(safeData),
          storedCase.formValues ? JSON.stringify(storedCase.formValues) : null,
          storedCase.analysis ? JSON.stringify(storedCase.analysis) : null,
          storedCase.review ? JSON.stringify(storedCase.review) : null,
          storedCase.createdAt || now,
          storedCase.updatedAt || now,
          now,
        ]
      );

      // Insert audit record transactionally
      const auditId = `aud_${crypto.randomBytes(8).toString("hex")}`;
      await client.query(
        `INSERT INTO audit_events (id, case_id, user_id, user_email, action, timestamp, version, details)
         VALUES ($1, $2, $3, $4, 'create', $5, 1, 'Case created in cloud storage')`,
        [auditId, id, userId, userEmail || null, now]
      );

      return this.mapRowToCloudCase(res.rows[0] as unknown as DbClinicalCaseRow);
    });
  }

  /**
   * Update an existing case with ownership check, optimistic concurrency, and audit logging.
   */
  async updateCase(
    userId: string,
    caseId: string,
    updates: Partial<StoredCase>,
    expectedVersion?: number,
    userEmail?: string
  ): Promise<CloudCaseRecord> {
    return await withTransaction(async (client) => {
      // 1. Fetch current case with row lock
      const currentRes = await client.query(
        "SELECT * FROM clinical_cases WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [caseId, userId]
      );

      if (currentRes.rows.length === 0 || currentRes.rows[0].deleted_at !== null) {
        throw new NotFoundError(`Case ${caseId} not found.`);
      }

      const current = currentRes.rows[0];

      // 2. Optimistic concurrency check
      if (expectedVersion !== undefined && expectedVersion !== current.version) {
        throw new ConcurrencyError(caseId, current.version, expectedVersion);
      }

      // 3. Validate and sanitize updates
      let safeData = typeof current.case_data === "string" ? JSON.parse(current.case_data) : current.case_data;
      if (updates.caseData) {
        clinicalCaseSchema.parse(updates.caseData);
        safeData = sanitizeCaseForStorage(updates.caseData);
      }

      const nextVersion = current.version + 1;
      const now = new Date().toISOString();

      const formValues =
        updates.formValues !== undefined
          ? updates.formValues
          : (current.form_values ? (typeof current.form_values === "string" ? JSON.parse(current.form_values) : current.form_values) : null);

      const analysis =
        updates.analysis !== undefined
          ? updates.analysis
          : (current.analysis ? (typeof current.analysis === "string" ? JSON.parse(current.analysis) : current.analysis) : null);

      const review =
        updates.review !== undefined
          ? updates.review
          : (current.review ? (typeof current.review === "string" ? JSON.parse(current.review) : current.review) : null);

      // 4. Update row
      const updateRes = await client.query(
        `UPDATE clinical_cases
         SET version = $3,
             case_data = $4,
             form_values = $5,
             analysis = $6,
             status = $7,
             analysis_status = $8,
             review_status = $9,
             review = $10,
             updated_at = $11,
             synced_at = $12
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [
          caseId,
          userId,
          nextVersion,
          JSON.stringify(safeData),
          formValues ? JSON.stringify(formValues) : null,
          analysis ? JSON.stringify(analysis) : null,
          updates.status || current.status,
          updates.analysisStatus || current.analysis_status,
          updates.reviewStatus || current.review_status,
          review ? JSON.stringify(review) : null,
          updates.updatedAt || now,
          now,
        ]
      );

      // 5. Audit event inside transaction
      const isReview = updates.review && updates.review.status === "reviewed";
      const action: AuditAction = isReview ? "review_signed" : "update";
      const details = isReview
        ? "Clinician review submitted and signed"
        : "Case updated in cloud storage";

      const auditId = `aud_${crypto.randomBytes(8).toString("hex")}`;
      await client.query(
        `INSERT INTO audit_events (id, case_id, user_id, user_email, action, timestamp, version, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [auditId, caseId, userId, userEmail || null, action, now, nextVersion, details]
      );

      return this.mapRowToCloudCase(updateRes.rows[0] as unknown as DbClinicalCaseRow);
    });
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
    return await withTransaction(async (client) => {
      const currentRes = await client.query(
        "SELECT version, deleted_at FROM clinical_cases WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [caseId, userId]
      );

      if (currentRes.rows.length === 0 || currentRes.rows[0].deleted_at !== null) {
        throw new NotFoundError(`Case ${caseId} not found.`);
      }

      if (expectedVersion !== undefined && expectedVersion !== currentRes.rows[0].version) {
        throw new ConcurrencyError(caseId, currentRes.rows[0].version, expectedVersion);
      }
      const nextVersion = currentRes.rows[0].version + 1;
      const now = new Date().toISOString();

      await client.query(
        `UPDATE clinical_cases
         SET version = $3,
             deleted_at = $4,
             updated_at = $4,
             synced_at = $4
         WHERE id = $1 AND user_id = $2`,
        [caseId, userId, nextVersion, now]
      );

      const auditId = `aud_${crypto.randomBytes(8).toString("hex")}`;
      await client.query(
        `INSERT INTO audit_events (id, case_id, user_id, user_email, action, timestamp, version, details)
         VALUES ($1, $2, $3, $4, 'delete', $5, $6, 'Case soft-deleted from cloud')`,
        [auditId, caseId, userId, userEmail || null, now, nextVersion]
      );

      return { success: true, version: nextVersion };
    });
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
        const existingRes = await query(
          "SELECT * FROM clinical_cases WHERE id = $1",
          [push.id]
        );
        const existingRow = existingRes.rows[0];

        if (push.deleted) {
          if (existingRow && existingRow.user_id === userId && existingRow.deleted_at === null) {
            if (push.version !== existingRow.version) {
              results.push({ caseId: push.id, status: "conflict", serverVersion: existingRow.version,
                serverCase: this.mapRowToCloudCase(existingRow as unknown as DbClinicalCaseRow) });
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

        if (!existingRow) {
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
        } else if (existingRow.user_id !== userId) {
          // Belongs to another user -> forbid overwrite
          results.push({
            caseId: push.id,
            status: "error",
            error: "Ownership conflict: ID already assigned to another user.",
          });
        } else {
          // Existing case for this user
          const existingRecord = this.mapRowToCloudCase(existingRow as unknown as DbClinicalCaseRow);
          const clientVersion = push.version || 0;

          if (existingRecord.deletedAt || clientVersion !== existingRecord.version) {
            // Server has newer updates -> conflict!
            results.push({
              caseId: push.id,
              status: "conflict",
              serverVersion: existingRecord.version,
              serverCase: existingRecord,
              error: `Server has newer version (${existingRecord.version}) than client (${clientVersion}).`,
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
      includeDeleted: true,
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
        clinicalCaseSchema.parse(rawCase.caseData);
        const safeData = sanitizeCaseForStorage(rawCase.caseData);

        const existingRes = await query(
          "SELECT id, user_id FROM clinical_cases WHERE id = $1",
          [caseId]
        );
        const existing = existingRes.rows[0];

        if (existing) {
          if (existing.user_id !== userId) {
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

    const auditId = `aud_${crypto.randomBytes(8).toString("hex")}`;
    const now = new Date().toISOString();
    await query(
      `INSERT INTO audit_events (id, user_id, user_email, action, timestamp, details)
       VALUES ($1, $2, $3, 'migrated', $4, $5)`,
      [
        auditId,
        userId,
        userEmail,
        now,
        `Batch migration completed: ${importedCaseIds.length} imported, ${skippedCount} skipped, ${failures.length} failed. Strategy: ${request.strategy}`,
      ]
    );

    return {
      totalSubmitted: request.cases.length,
      importedCount: importedCaseIds.length,
      skippedCount,
      failedCount: failures.length,
      failures,
      importedCaseIds,
      completedAt: now,
    };
  }

  /**
   * List audit log events for compliance and traceability, strictly scoped to userId.
   */
  async listAuditEvents(userId: string, caseId?: string): Promise<AuditEvent[]> {
    let sql = "SELECT * FROM audit_events WHERE user_id = $1";
    const params: unknown[] = [userId];

    if (caseId) {
      params.push(caseId);
      sql += " AND case_id = $2";
    }

    sql += " ORDER BY timestamp DESC";

    const res = await query(sql, params);
    return res.rows.map((row) => ({
      id: row.id,
      caseId: row.case_id || undefined,
      userId: row.user_id,
      userEmail: row.user_email || undefined,
      action: row.action as AuditAction,
      timestamp: new Date(row.timestamp).toISOString(),
      version: row.version || undefined,
      ipHash: row.ip_hash || undefined,
      details: row.details || undefined,
    }));
  }

  /**
   * Retained for interface compatibility; persistent records cannot be bulk-cleared.
   */
  async clear(): Promise<void> {
    throw new Error("Bulk clearing PostgreSQL cases is disabled. Use an isolated disposable test database.");
  }
}
