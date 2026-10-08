import type { ClinicalCase } from "./clinical-case";
import type { ClinicalAnalysis } from "./clinical-analysis";

export type CaseStatus = "draft" | "analyzed" | "reviewed";
export type AnalysisStatus = "current" | "stale";

export interface StoredCase {
  id: string;
  caseData: ClinicalCase;
  formValues?: Record<string, string>;
  analysis: ClinicalAnalysis | null;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  analysisStatus: AnalysisStatus;
}

export const CASES_STORAGE_KEY = "dentai-clinical-cases";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
    return parsed.filter((item): item is StoredCase => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        item.id.trim().length > 0 &&
        typeof item.caseData === "object" &&
        item.caseData !== null
      );
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
    const raw = window.localStorage.getItem(CASES_STORAGE_KEY);
    const cases = parseCasesSafely(raw);
    return cases.sort((a, b) => {
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
  record: Omit<StoredCase, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  }
): StoredCase {
  const now = new Date().toISOString();
  const cases = getCases();
  const existingIndex = cases.findIndex(
    (c) => c.id.toLowerCase() === record.id.trim().toLowerCase()
  );

  const finalRecord: StoredCase = {
    ...record,
    id: record.id.trim(),
    createdAt:
      existingIndex >= 0
        ? cases[existingIndex].createdAt || record.createdAt || now
        : record.createdAt || now,
    updatedAt: now,
    status: record.status || "draft",
    analysisStatus: record.analysisStatus || (record.analysis ? "current" : "stale"),
  };

  if (existingIndex >= 0) {
    cases[existingIndex] = finalRecord;
  } else {
    cases.unshift(finalRecord);
  }

  if (isBrowser()) {
    try {
      window.localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(cases));
    } catch (error) {
      console.error("[Dentarith] Failed to write case to localStorage:", error);
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
 */
export function markAnalysisStale(caseId: string): StoredCase | null {
  return updateCase(caseId, { analysisStatus: "stale" });
}

/**
 * Delete a case by ID.
 */
export function deleteCase(caseId: string): boolean {
  if (!isBrowser() || !caseId) return false;
  try {
    const cases = getCases();
    const filtered = cases.filter(
      (c) => c.id.toLowerCase() !== caseId.trim().toLowerCase()
    );
    if (filtered.length === cases.length) {
      return false; // nothing deleted
    }
    window.localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(filtered));
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
    window.localStorage.removeItem(CASES_STORAGE_KEY);
  } catch (error) {
    console.error("[Dentarith] Failed to clear cases:", error);
  }
}
