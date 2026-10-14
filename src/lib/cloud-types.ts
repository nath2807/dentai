import { z } from "zod";
import { clinicalCaseSchema } from "./clinical-case";
import { ClinicalAnalysis as analysisSchema } from "./clinical-analysis";
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
  expectedUserId: z.string().min(1).optional(),
  pushes: z.array(syncPushItemSchema).max(100, "Maximum batch size is 100 cases."),
  since: z.string().optional(),
});
export type SyncBatchRequest = z.infer<typeof syncBatchRequestSchema>;

export interface SyncBatchResponse {
  userId: string;
  results: SyncPushResult[];
  pulledCases: CloudCaseRecord[];
  serverTime: string;
}

export const migrationStrategyEnum = z.enum(["skip_existing", "overwrite_existing", "clone_as_new"]);
export type MigrationStrategy = z.infer<typeof migrationStrategyEnum>;

export const migrationRequestSchema = z.object({
  expectedUserId: z.string().min(1).optional(),
  cases: z.array(z.any()).min(1, "At least one case must be selected for migration.").max(100),
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

const reviewSchema = z.object({
  status: z.enum(["pending", "needs_review", "reviewed"]),
  reviewedAt: z.string().optional(), reviewedBy: z.string().optional(), notes: z.string().optional(),
  corrections: z.object({
    agreedWithAiDiagnosis: z.boolean().optional(), finalDiagnosis: z.string().optional(),
    diagnosisNotes: z.string().optional(), treatmentPlan: z.string().optional(),
    treatmentPlanNotes: z.string().optional(), additionalObservations: z.string().optional(),
  }).optional(),
});

export const cloudCaseRecordSchema = syncPushItemSchema.omit({ deleted: true }).extend({
  userId: z.string().min(1), version: z.number().int().positive(),
  caseData: clinicalCaseSchema.extend({
    medicalHistory: z.object({ conditions: z.string(), medications: z.string(), allergies: z.string() }).catchall(z.string()),
    dentalHistory: z.object({ previousTreatment: z.string(), previousExtractions: z.string(), endodonticTreatment: z.string(),
      prostheticTreatment: z.string(), orthodonticTreatment: z.string(), oralHygiene: z.string() }).catchall(z.string()),
  }), analysis: analysisSchema.nullable(),
  review: reviewSchema.nullable().optional(), syncedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), deletedAt: z.iso.datetime().nullable().optional(),
});

export const syncBatchResponseSchema = z.object({
  success: z.literal(true), userId: z.string().min(1), serverTime: z.iso.datetime(),
  results: z.array(z.object({
    caseId: z.string().min(1), status: z.enum(["created", "updated", "up_to_date", "conflict", "error"]),
    serverVersion: z.number().int().nonnegative().optional(), serverCase: cloudCaseRecordSchema.optional(),
    error: z.string().optional(),
  })),
  pulledCases: z.array(cloudCaseRecordSchema),
});

export const migrationResponseSchema = z.object({
  success: z.literal(true), userId: z.string().min(1),
  totalSubmitted: z.number().int().nonnegative(), importedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(), failedCount: z.number().int().nonnegative(),
  failures: z.array(z.object({ caseId: z.string(), reason: z.string() })),
  importedCaseIds: z.array(z.string()), completedAt: z.iso.datetime(),
});
