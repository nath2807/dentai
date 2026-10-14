import { describe, it, expect } from "vitest";
import {
  syncPushItemSchema,
  migrationRequestSchema,
  cloudCaseDataSchema,
  reviewSchema,
} from "./cloud-types";
import { BENCHMARK_CASE_PULPITIS } from "./benchmark-cases";

describe("Cloud Sync & Migration Schema Strict Validation", () => {
  const validCaseData = {
    ...BENCHMARK_CASE_PULPITIS.caseData,
    caseInformation: {
      caseId: "CASE-STRICT-001",
      age: 35,
      sex: "Female",
    },
    chiefComplaint: "Severe throbbing pain in lower right tooth",
  };

  const validReview = {
    status: "reviewed" as const,
    reviewedAt: new Date().toISOString(),
    reviewedBy: "Dr. Clinician, DDS",
    notes: "AI diagnosis and staging verified.",
    corrections: {
      agreedWithAiDiagnosis: true,
      finalDiagnosis: "Symptomatic Irreversible Pulpitis #30",
    },
  };

  describe("cloudCaseDataSchema", () => {
    it("validates compliant clinical case data", () => {
      const parsed = cloudCaseDataSchema.safeParse(validCaseData);
      expect(parsed.success).toBe(true);
    });

    it("rejects case data missing chief complaint", () => {
      const invalid = { ...validCaseData, chiefComplaint: "" };
      const parsed = cloudCaseDataSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("rejects case data with invalid age type", () => {
      const invalid = {
        ...validCaseData,
        caseInformation: { ...validCaseData.caseInformation, age: "thirty-five" },
      };
      const parsed = cloudCaseDataSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("syncPushItemSchema", () => {
    it("accepts a fully compliant sync push item", () => {
      const item = {
        id: "push-001",
        caseData: validCaseData,
        status: "reviewed",
        analysisStatus: "current",
        reviewStatus: "reviewed",
        review: validReview,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = syncPushItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it("rejects sync push item when caseData is malformed (replaces z.any())", () => {
      const malformedItem = {
        id: "push-002",
        caseData: {
          notAClinicalCase: true,
        },
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = syncPushItemSchema.safeParse(malformedItem);
      expect(result.success).toBe(false);
    });

    it("rejects sync push item when review is invalid", () => {
      const itemWithBadReview = {
        id: "push-003",
        caseData: validCaseData,
        review: {
          status: "invalid_status",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = syncPushItemSchema.safeParse(itemWithBadReview);
      expect(result.success).toBe(false);
    });
  });

  describe("migrationRequestSchema", () => {
    it("accepts valid migration request with explicit consent", () => {
      const request = {
        expectedUserId: "usr_clinical_demo_01",
        strategy: "skip_existing",
        userConsentGiven: true,
        cases: [
          {
            id: "mig-case-001",
            caseData: validCaseData,
            status: "draft",
            review: validReview,
          },
        ],
      };
      const result = migrationRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it("rejects migration request when caseData is malformed (replaces z.any())", () => {
      const request = {
        expectedUserId: "usr_clinical_demo_01",
        strategy: "skip_existing",
        userConsentGiven: true,
        cases: [
          {
            id: "mig-case-002",
            caseData: { randomProperty: 123 },
          },
        ],
      };
      const result = migrationRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("rejects migration request when explicit clinician consent is false", () => {
      const request = {
        expectedUserId: "usr_clinical_demo_01",
        strategy: "skip_existing",
        userConsentGiven: false,
        cases: [
          {
            id: "mig-case-001",
            caseData: validCaseData,
          },
        ],
      };
      const result = migrationRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("reviewSchema", () => {
    it("validates compliant clinician review payload", () => {
      const result = reviewSchema.safeParse(validReview);
      expect(result.success).toBe(true);
    });

    it("rejects invalid review status", () => {
      const result = reviewSchema.safeParse({
        ...validReview,
        status: "unauthorized_status",
      });
      expect(result.success).toBe(false);
    });
  });
});
