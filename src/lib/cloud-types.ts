import { z } from "zod";
import type { ClinicalCase } from "./clinical-case";
import type { ClinicalAnalysis } from "./clinical-analysis";
import type { CaseStatus, AnalysisStatus, ReviewStatus, ClinicalReview } from "./case-storage";

export type CloudSyncStatus = "local_only" | "syncing" | "synced" | "conflict" | "error" | "offline";

export interface CloudCaseRecord {
  id: string;
  userId: string;
  version: number;
  caseData: ClinicalCase;
  formValues?: Record<string, string>;
  analysis: ClinicalAnalysis | null;
  status: CaseStatus;
  analysisStatus: AnalysisStatus;
  reviewStatus: ReviewStatus;
  review?: ClinicalReview | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
  deletedAt?: string | null;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "review_signed"
  | "migrated"
  | "sync_batch"
  | "login"
  | "logout";

export interface AuditEvent {
  id: string;
  caseId?: string;
  userId: string;
  userEmail?: string;
  action: AuditAction;
  timestamp: string;
  version?: number;
  ipHash?: string;
  details?: string;
}

export const syncPushItemSchema = z.object({
  id: z.string().min(1, "Case ID is required."),
  caseData: z.any(), // ClinicalCase validated separately
  formValues: z.record(z.string(), z.string()).optional(),
  analysis: z.any().nullable().optional(),
  status: z.enum(["draft", "analyzed", "reviewed"]).default("draft"),
  analysisStatus: z.enum(["current", "stale"]).default("current"),
  reviewStatus: z.enum(["pending", "needs_review", "reviewed"]).default("pending"),
  review: z.any().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().nonnegative().optional(),
  deleted: z.boolean().optional(),
});
export type SyncPushItem = z.infer<typeof syncPushItemSchema>;

export interface SyncPushResult {
  caseId: string;
  status: "created" | "updated" | "up_to_date" | "conflict" | "error";
  serverVersion?: number;
  serverCase?: CloudCaseRecord;
  error?: string;
}

export const syncBatchRequestSchema = z.object({
  pushes: z.array(syncPushItemSchema).max(100, "Maximum batch size is 100 cases."),
  since: z.string().optional(),
});
export type SyncBatchRequest = z.infer<typeof syncBatchRequestSchema>;

export interface SyncBatchResponse {
  results: SyncPushResult[];
  pulledCases: CloudCaseRecord[];
  serverTime: string;
}

export const migrationStrategyEnum = z.enum(["skip_existing", "overwrite_existing", "clone_as_new"]);
export type MigrationStrategy = z.infer<typeof migrationStrategyEnum>;

export const migrationRequestSchema = z.object({
  cases: z.array(z.any()).min(1, "At least one case must be selected for migration."),
  strategy: migrationStrategyEnum.default("skip_existing"),
  userConsentGiven: z.boolean().refine((val) => val === true, {
    message: "Explicit clinician consent is required before migrating cases to cloud storage.",
  }),
});
export type MigrationRequest = z.infer<typeof migrationRequestSchema>;

export interface MigrationResult {
  totalSubmitted: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: { caseId: string; reason: string }[];
  importedCaseIds: string[];
  completedAt: string;
}
