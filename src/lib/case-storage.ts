import type { ClinicalCase } from "./clinical-case";
import type { ClinicalAnalysis } from "./clinical-analysis";
import { periodontalChartSchema } from "./periodontal-types";
import { BENCHMARK_CASES } from "./benchmark-cases";
import type { CloudCaseRecord } from "./cloud-types";
import { assertWorkspaceCurrent, getWorkspaceUserId, notifyWorkspaceChanged, workspaceStorageKey } from "./browser-workspace";
export { BENCHMARK_CASES };

export type CaseStatus = "draft" | "analyzed" | "reviewed";
export type AnalysisStatus = "current" | "stale";
export type ReviewStatus = "pending" | "needs_review" | "reviewed";

export interface ClinicianCorrections {
  agreedWithAiDiagnosis?: boolean;
  finalDiagnosis?: string;
  diagnosisNotes?: string;
  treatmentPlan?: string;
  treatmentPlanNotes?: string;
  additionalObservations?: string;
}

export interface ClinicalReview {
  status: ReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  corrections?: ClinicianCorrections;
}

export interface StoredCase {
  id: string;
  caseData: ClinicalCase;
  formValues?: Record<string, string>;
  analysis: ClinicalAnalysis | null;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  analysisStatus: AnalysisStatus;
  reviewStatus: ReviewStatus;
  review?: ClinicalReview | null;
  sync?: { serverVersion: number; dirty: boolean; revision: string; conflict?: CloudCaseRecord };
  deletedAt?: string | null;
}

export const LEGACY_CASES_STORAGE_KEY = "dentai-clinical-cases";
export const CASES_STORAGE_KEY = workspaceStorageKey("cases", null);

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getWorkspaceRecords(userId = getWorkspaceUserId()): StoredCase[] {
  if (!isBrowser()) return [];
  return parseCasesSafely(window.localStorage.getItem(workspaceStorageKey("cases", userId)));
}

function writeWorkspaceRecords(records: StoredCase[], userId = getWorkspaceUserId()): void {
  if (!isBrowser()) return;
  assertWorkspaceCurrent(userId);
  window.localStorage.setItem(workspaceStorageKey("cases", userId), JSON.stringify(records));
  notifyWorkspaceChanged();
}

/** Legacy data is preserved, never assigned or uploaded during login. */
export function getUnassignedCases(): StoredCase[] {
  if (!isBrowser()) return [];
  return [
    ...parseCasesSafely(window.localStorage.getItem(LEGACY_CASES_STORAGE_KEY)),
    ...getWorkspaceRecords(null),
  ].filter((c) => !c.deletedAt);
}

/** Keep the local clinical copy and persist the server alternative for review. */
export function retainSyncConflict(userId: string, serverCase: CloudCaseRecord): void {
  if (serverCase.userId !== userId) throw new Error("Unexpected cloud record owner.");
  const records = getWorkspaceRecords(userId);
  const current = records.find((c) => c.id === serverCase.id);
  if (!current) return;
  current.sync = {
    serverVersion: current.sync?.serverVersion ?? 0,
    dirty: true,
    revision: current.sync?.revision ?? crypto.randomUUID(),
    conflict: { ...serverCase, caseData: sanitizeCaseForStorage(serverCase.caseData) },
  };
  writeWorkspaceRecords(records, userId);
}

/** Apply a cloud copy only to a clean record or an unchanged acknowledged revision. */
export function applySyncedCase(userId: string, serverCase: CloudCaseRecord, acknowledgedRevision?: string, localId = serverCase.id): void {
  assertWorkspaceCurrent(userId);
  if (serverCase.userId !== userId) throw new Error("Unexpected cloud record owner.");
  const records = getWorkspaceRecords(userId);
  const index = records.findIndex((c) => c.id === localId);
  const current = records[index];
  if (localId !== serverCase.id && records.some((c, i) => i !== index && c.id === serverCase.id)) {
    throw new Error("A cloud case identifier conflicts with an existing local record. Both copies are retained.");
  }
  if (current && serverCase.version < (current.sync?.serverVersion ?? 0)) return;
  if (current && current.sync?.dirty !== false) {
    if (acknowledgedRevision && current.sync?.revision !== acknowledgedRevision) {
      // An edit/deletion happened during the request. Keep it pending against the
      // version just committed; a later sync sends that newer local revision.
      current.id = serverCase.id;
      current.sync = { ...current.sync!, serverVersion: serverCase.version };
      writeWorkspaceRecords(records, userId);
      return;
    }
    if (!acknowledgedRevision && !sameClinicalContent(current, serverCase)) {
      if (serverCase.version > (current.sync?.serverVersion ?? 0)) retainSyncConflict(userId, serverCase);
      return;
    }
  }
  // A removed local snapshot must not be resurrected by a late acknowledgement.
  if (!current && acknowledgedRevision) return;
  const { userId: _owner, version, syncedAt: _syncedAt, ...record } = serverCase;
  void _owner; void _syncedAt;
  const stored: StoredCase = {
    ...record,
    caseData: sanitizeCaseForStorage(record.caseData),
    sync: { serverVersion: version, dirty: false, revision: crypto.randomUUID() },
  };
  if (index >= 0) records[index] = stored;
  else records.push(stored);
  writeWorkspaceRecords(records, userId);
}

function sameClinicalContent(a: StoredCase, b: StoredCase): boolean {
  const content = (c: StoredCase) => ({
    caseData: sanitizeCaseForStorage(c.caseData), formValues: c.formValues ?? null,
    analysis: c.analysis ?? null, status: c.status, analysisStatus: c.analysisStatus,
    reviewStatus: c.reviewStatus, review: c.review ?? null, deleted: Boolean(c.deletedAt),
  });
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(
      Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => [key, canonical(v)])
    );
    return value;
  };
  return JSON.stringify(canonical(content(a))) === JSON.stringify(canonical(content(b)));
}

export function acknowledgeDeletedCase(userId: string, id: string, revision: string, version: number): void {
  const records = getWorkspaceRecords(userId);
  const current = records.find((c) => c.id === id);
  if (!current) return;
  current.sync = {
    ...current.sync!, serverVersion: Math.max(version, current.sync?.serverVersion ?? 0),
    dirty: current.sync?.revision !== revision || !current.deletedAt,
  };
  writeWorkspaceRecords(records, userId);
}

/**
 * Strip large radiograph dataUrl payload to prevent exceeding browser localStorage quota.
 * Keeps metadata (fileName, mimeType, size) for clinical auditability.
 */
export function sanitizeCaseForStorage(c: ClinicalCase): ClinicalCase {
  if (c.radiograph && c.radiograph.dataUrl) {
    const safeRadiograph = { ...c.radiograph };
    delete safeRadiograph.dataUrl;
    return {
      ...c,
      radiograph: safeRadiograph,
    };
  }
  return c;
}

/**
 * Safely parse raw JSON into StoredCase array.
 * Never throws, gracefully discards corrupted items.
 */
export function parseCasesSafely(rawJson: string | null): StoredCase[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredCase => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          item.id.trim().length > 0 &&
          typeof item.caseData === "object" &&
          item.caseData !== null
        );
      })
      .map((item) => {
        const reviewStatus: ReviewStatus =
          item.reviewStatus ||
          item.review?.status ||
          (item.status === "reviewed"
            ? "reviewed"
            : item.analysis
            ? "needs_review"
            : "pending");
        return {
          ...item,
          reviewStatus,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Retrieve all cases from localStorage, sorted newest first.
 */
export function getCases(): StoredCase[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(workspaceStorageKey("cases"));
    const cases = parseCasesSafely(raw);
    return cases.filter((c) => !c.deletedAt).sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime() || 0;
      const timeB = new Date(b.updatedAt || b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("[Dentarith] Failed to read cases from localStorage:", error);
    return [];
  }
}

/**
 * Retrieve a specific case by ID (case-insensitive fallback).
 */
export function getCase(caseId: string): StoredCase | null {
  if (!caseId || !isBrowser()) return null;
  const cases = getCases();
  const trimmed = caseId.trim();
  const exact = cases.find((c) => c.id === trimmed);
  if (exact) return exact;
  return (
    cases.find((c) => c.id.toLowerCase() === trimmed.toLowerCase()) || null
  );
}

/**
 * Save or update a case in localStorage.
 * If the case exists, merges updates and sets updatedAt.
 * If not, appends it.
 */
export function saveCase(
  record: Omit<
    StoredCase,
    "createdAt" | "updatedAt" | "reviewStatus" | "analysis" | "analysisStatus"
  > & {
    analysis?: ClinicalAnalysis | null;
    analysisStatus?: AnalysisStatus;
    createdAt?: string;
    updatedAt?: string;
    reviewStatus?: ReviewStatus;
  }
): StoredCase {
  const now = new Date().toISOString();
  const cases = getWorkspaceRecords();
  const existingIndex = cases.findIndex(
    (c) => c.id.toLowerCase() === record.id.trim().toLowerCase()
  );

  const analysis: ClinicalAnalysis | null =
    record.analysis !== undefined
      ? record.analysis
      : existingIndex >= 0
      ? cases[existingIndex].analysis
      : null;

  const reviewStatus: ReviewStatus =
    record.reviewStatus ||
    record.review?.status ||
    (record.status === "reviewed"
      ? "reviewed"
      : analysis
      ? "needs_review"
      : "pending");

  const effectiveStatus: CaseStatus =
    record.status ||
    (reviewStatus === "reviewed"
      ? "reviewed"
      : analysis
      ? "analyzed"
      : "draft");

  const existingReview = existingIndex >= 0 ? cases[existingIndex].review : undefined;
  const review: ClinicalReview | null | undefined =
    record.review !== undefined ? record.review : existingReview;

  const safeCaseData = sanitizeCaseForStorage(record.caseData);

  const finalRecord: StoredCase = {
    ...record,
    id: record.id.trim(),
    caseData: safeCaseData,
    analysis,
    createdAt:
      existingIndex >= 0
        ? cases[existingIndex].createdAt || record.createdAt || now
        : record.createdAt || now,
    updatedAt: now,
    status: effectiveStatus,
    analysisStatus: record.analysisStatus || (analysis ? "current" : "stale"),
    reviewStatus,
    review: review
      ? {
          ...review,
          status: reviewStatus,
        }
      : undefined,
    deletedAt: null,
    sync: {
      serverVersion: existingIndex >= 0 ? cases[existingIndex].sync?.serverVersion ?? 0 : 0,
      dirty: true,
      revision: crypto.randomUUID(),
      conflict: existingIndex >= 0 ? cases[existingIndex].sync?.conflict : undefined,
    },
  };

  if (existingIndex >= 0) {
    cases[existingIndex] = finalRecord;
  } else {
    cases.unshift(finalRecord);
  }

  if (isBrowser()) {
    try {
      writeWorkspaceRecords(cases);
    } catch (error) {
      console.error("[Dentarith] Failed to write case to localStorage:", error);
      // Attempt quota recovery: clear temporary drafts to reclaim space
      try {
        window.localStorage.removeItem(workspaceStorageKey("draft"));
        writeWorkspaceRecords(cases);
      } catch {
        throw new Error(
          "Browser storage quota exceeded. Please export a backup from Settings and remove older cases to free storage space."
        );
      }
    }
  }

  return finalRecord;
}

/**
 * Update specific fields of an existing case.
 */
export function updateCase(
  caseId: string,
  updates: Partial<StoredCase>
): StoredCase | null {
  const existing = getCase(caseId);
  if (!existing) return null;

  const merged: StoredCase = {
    ...existing,
    ...updates,
    id: existing.id, // prevent ID overwrite
    updatedAt: new Date().toISOString(),
  };

  return saveCase(merged);
}

/**
 * Mark a case's existing analysis as stale (e.g. after clinical edits).
 * If the case was previously reviewed, transitions review status to needs_review
 * to enforce fresh clinical oversight.
 */
export function markAnalysisStale(caseId: string): StoredCase | null {
  const existing = getCase(caseId);
  if (!existing) return null;

  const updates: Partial<StoredCase> = {
    analysisStatus: "stale",
  };

  if (existing.reviewStatus === "reviewed" || existing.review?.status === "reviewed") {
    updates.reviewStatus = "needs_review";
    if (existing.review) {
      updates.review = {
        ...existing.review,
        status: "needs_review",
      };
    }
  }

  return updateCase(caseId, updates);
}

/**
 * Record clinician review and decisions for a case.
 * Preserves the original AI analysis separately without mutation.
 */
export function reviewCase(
  caseId: string,
  reviewInput: {
    status?: ReviewStatus;
    reviewedBy?: string;
    notes?: string;
    corrections?: ClinicianCorrections;
  }
): StoredCase | null {
  const existing = getCase(caseId);
  if (!existing) return null;

  const targetStatus: ReviewStatus = reviewInput.status || "reviewed";
  const now = new Date().toISOString();

  const existingReview = existing.review || {
    status: targetStatus,
  };

  const updatedReview: ClinicalReview = {
    ...existingReview,
    status: targetStatus,
    reviewedAt: targetStatus === "reviewed" ? now : existingReview.reviewedAt,
    reviewedBy: reviewInput.reviewedBy !== undefined ? reviewInput.reviewedBy : existingReview.reviewedBy,
    notes: reviewInput.notes !== undefined ? reviewInput.notes : existingReview.notes,
    corrections: reviewInput.corrections
      ? {
          ...existingReview.corrections,
          ...reviewInput.corrections,
        }
      : existingReview.corrections,
  };

  return updateCase(caseId, {
    reviewStatus: targetStatus,
    status: targetStatus === "reviewed" ? "reviewed" : existing.status,
    review: updatedReview,
  });
}

/**
 * Delete a case by ID.
 */
export function deleteCase(caseId: string): boolean {
  if (!isBrowser() || !caseId) return false;
  try {
    const cases = getWorkspaceRecords();
    const existing = cases.find((c) => c.id.toLowerCase() === caseId.trim().toLowerCase() && !c.deletedAt);
    if (!existing) return false;
    const filtered = cases.filter(
      (c) => c.id.toLowerCase() !== caseId.trim().toLowerCase()
    );
    if (filtered.length === cases.length) {
      return false; // nothing deleted
    }
    if (getWorkspaceUserId() !== null) {
      filtered.push({ ...existing, deletedAt: new Date().toISOString(), sync: {
        serverVersion: existing.sync?.serverVersion ?? 0, dirty: true, revision: crypto.randomUUID(),
        conflict: existing.sync?.conflict,
      } });
    }
    writeWorkspaceRecords(filtered);
    return true;
  } catch (error) {
    console.error("[Dentarith] Failed to delete case:", error);
    return false;
  }
}

/**
 * Clear all stored cases.
 */
export function clearCases(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(workspaceStorageKey("cases"));
    window.localStorage.removeItem(workspaceStorageKey("last-sync"));
    notifyWorkspaceChanged();
  } catch (error) {
    console.error("[Dentarith] Failed to clear cases:", error);
  }
}

/**
 * Attempt to save a case and explicitly return error status if storage fails.
 */
export function saveCaseSafely(
  record: Parameters<typeof saveCase>[0]
): { success: boolean; case: StoredCase; error?: string } {
  try {
    const saved = saveCase(record);
    return { success: true, case: saved };
  } catch (error) {
    return {
      success: false,
      case: record as StoredCase,
      error: error instanceof Error ? error.message : "Failed to persist case to storage.",
    };
  }
}

export interface StorageStats {
  caseCount: number;
  analyzedCount: number;
  reviewedCount: number;
  estimatedBytes: number;
  formattedSize: string;
  isNearQuota: boolean;
}

/**
 * Retrieve current storage health and usage statistics.
 */
export function getStorageStats(): StorageStats {
  if (!isBrowser()) {
    return {
      caseCount: 0,
      analyzedCount: 0,
      reviewedCount: 0,
      estimatedBytes: 0,
      formattedSize: "0 KB",
      isNearQuota: false,
    };
  }
  const cases = getCases();
  const raw = window.localStorage.getItem(workspaceStorageKey("cases")) || "";
  const estimatedBytes = raw.length * 2; // UTF-16 representation
  const analyzedCount = cases.filter((c) => Boolean(c.analysis)).length;
  const reviewedCount = cases.filter(
    (c) => c.reviewStatus === "reviewed" || c.status === "reviewed"
  ).length;

  let formattedSize = "0 KB";
  if (estimatedBytes < 1024) {
    formattedSize = `${estimatedBytes} B`;
  } else if (estimatedBytes < 1024 * 1024) {
    formattedSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;
  } else {
    formattedSize = `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // 4MB alert threshold for standard 5MB browser quota
  const isNearQuota = estimatedBytes > 4 * 1024 * 1024;

  return {
    caseCount: cases.length,
    analyzedCount,
    reviewedCount,
    estimatedBytes,
    formattedSize,
    isNearQuota,
  };
}

export interface CaseExportBundle {
  format: "dentarith-clinical-cases";
  version: "1.0";
  exportedAt: string;
  caseCount: number;
  backupScope: "structured_findings_and_reviews_only";
  binaryDataIncluded: false;
  disclaimer: string;
  cases: StoredCase[];
}

/**
 * Export stored clinical cases as a formatted, de-identified JSON backup bundle.
 */
export function exportCases(caseIds?: string[]): string {
  const allCases = getCases();
  const selected =
    caseIds && caseIds.length > 0
      ? allCases.filter((c) => caseIds.includes(c.id))
      : allCases;

  return exportCaseRecords(selected);
}

export function exportCaseRecords(selected: StoredCase[]): string {
  const bundle: CaseExportBundle = {
    format: "dentarith-clinical-cases",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    caseCount: selected.length,
    backupScope: "structured_findings_and_reviews_only",
    binaryDataIncluded: false,
    disclaimer:
      "Radiograph image binary data (dataUrl) is excluded from this export for storage and privacy reasons. Case metadata, clinical findings, AI analyses, clinician reviews, and radiograph file names are preserved.",
    cases: selected,
  };

  return JSON.stringify(bundle, null, 2);
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Safely import cases from JSON backup.
 * Validates structure, rejects corrupt entries, and prevents data loss.
 */
export function importCasesSafely(
  jsonString: string,
  options?: { overwriteExisting?: boolean }
): ImportResult {
  if (!jsonString || typeof jsonString !== "string") {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: ["No valid data provided to import."],
    };
  }

  let candidates: unknown[];
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      candidates = parsed;
    } else if (
      typeof parsed === "object" &&
      parsed !== null &&
      "cases" in parsed &&
      Array.isArray((parsed as { cases: unknown[] }).cases)
    ) {
      candidates = (parsed as { cases: unknown[] }).cases;
    } else if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "caseData" in parsed
    ) {
      candidates = [parsed];
    } else {
      return {
        success: false,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: ["Invalid backup structure. Expected a Dentarith export bundle or case array."],
      };
    }
  } catch {
    return {
      success: false,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: ["Failed to parse import string as JSON."],
    };
  }

  const existingCases = getCases();
  const existingMap = new Map(existingCases.map((c) => [c.id.toLowerCase(), c]));
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    if (
      typeof item !== "object" ||
      item === null ||
      !("id" in item) ||
      typeof (item as { id: unknown }).id !== "string" ||
      !(item as { id: string }).id.trim() ||
      !("caseData" in item) ||
      typeof (item as { caseData: unknown }).caseData !== "object" ||
      (item as { caseData: unknown }).caseData === null
    ) {
      skippedCount++;
      errors.push(`Item ${i + 1}: Missing valid id or caseData structure.`);
      continue;
    }

    const candidateCase = item as StoredCase;

    // Validate periodontalChart if present to reject malformed/out-of-range measurements
    if (candidateCase.caseData?.periodontalChart) {
      const perioValidation = periodontalChartSchema.safeParse(
        candidateCase.caseData.periodontalChart
      );
      if (!perioValidation.success) {
        skippedCount++;
        const issues = perioValidation.error.issues
          .slice(0, 3)
          .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
          .join("; ");
        errors.push(
          `Case ${candidateCase.id || i + 1}: Rejected due to invalid periodontal charting data (${issues}).`
        );
        continue;
      }
    }

    const key = candidateCase.id.trim().toLowerCase();
    const alreadyExists = existingMap.has(key);

    if (alreadyExists && !options?.overwriteExisting) {
      skippedCount++;
      continue;
    }

    try {
      saveCase(candidateCase);
      if (alreadyExists) {
        updatedCount++;
      } else {
        importedCount++;
      }
      existingMap.set(key, candidateCase);
    } catch (err) {
      skippedCount++;
      errors.push(
        `Case ${candidateCase.id}: ${
          err instanceof Error ? err.message : "Failed to persist to storage."
        }`
      );
    }
  }

  return {
    success: importedCount > 0 || updatedCount > 0 || candidates.length === 0,
    importedCount,
    updatedCount,
    skippedCount,
    errors,
  };
}

/**
 * Seed vetted synthetic benchmark cases for demonstration, education, and testing.
 */
export function seedBenchmarkCases(force = false): {
  addedCount: number;
  totalCount: number;
} {
  const existingCases = getCases();
  const existingIds = new Set(existingCases.map((c) => c.id.toLowerCase()));
  let addedCount = 0;

  for (const benchmark of BENCHMARK_CASES) {
    const key = benchmark.id.toLowerCase();
    if (force || !existingIds.has(key)) {
      saveCase(benchmark);
      existingIds.add(key);
      addedCount++;
    }
  }

  const finalCases = getCases();
  return {
    addedCount,
    totalCount: finalCases.length,
  };
}
