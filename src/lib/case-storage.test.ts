import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CASES_STORAGE_KEY,
  clearCases,
  deleteCase,
  exportCases,
  getCase,
  getCases,
  getStorageStats,
  importCasesSafely,
  markAnalysisStale,
  reviewCase,
  sanitizeCaseForStorage,
  saveCase,
  saveCaseSafely,
  seedBenchmarkCases,
  updateCase,
} from "./case-storage";
import type { ClinicalCase } from "./clinical-case";
import type { ClinicalAnalysis } from "./clinical-analysis";
import { workspaceStorageKey } from "./browser-workspace";

const mockCaseData: ClinicalCase = {
  caseInformation: { caseId: "CASE-101", age: 34, sex: "Female" },
  chiefComplaint: "Pain on lower left molar",
  historyOfPresentingComplaint: {
    duration: "3 days",
    onset: "Gradual",
    symptoms: "Cold sensitivity",
    aggravatingFactors: "Cold drinks",
    relievingFactors: "None",
  },
  medicalHistory: { conditions: "", medications: "", allergies: "" },
  dentalHistory: {
    previousTreatment: "",
    previousExtractions: "",
    endodonticTreatment: "",
    prostheticTreatment: "",
    orthodonticTreatment: "",
    oralHygiene: "",
  },
  clinicalExamination: {
    toothOrRegion: "Tooth 36",
    extraoralFindings: "",
    intraoralFindings: "",
    hardTissueFindings: "",
    softTissueFindings: "",
    periodontalFindings: "",
    pulpalFindings: "",
    percussion: "Positive",
    palpation: "Negative",
    mobility: "Grade 0",
    probing: "2-3 mm",
    vitalityTests: "Cold lingering",
  },
  radiograph: null,
};

const mockAnalysis: ClinicalAnalysis = {
  summary: "Pulpal and apical inflammation suspected on tooth 36.",
  reportedInformation: ["Pain on cold"],
  observedFindings: ["Cold lingering"],
  inferredFindings: ["Irreversible pulpitis"],
  problemList: ["Tooth 36 pain"],
  possibleDiagnoses: [
    {
      diagnosis: "Symptomatic Irreversible Pulpitis",
      diagnosticCategory: "pulpal",
      likelihood: "high",
      confidenceReason: "Thermal lingering",
      rank: 1,
      supportingFindings: ["Cold lingering"],
      contradictingFindings: [],
      evidenceType: "vitality",
      reasoning: "Lingering pain",
      evidenceMap: [],
      whyRanksHighest: "Thermal duration",
    },
  ],
  evidenceMap: [],
  differentialDiagnosis: [],
  contradictions: [],
  missingInformation: [
    {
      item: "Periapical radiograph",
      importance: "critical",
      whyItMatters: "Evaluate periapical status",
    },
  ],
  suggestedInvestigations: ["Periapical radiograph"],
  treatmentConsiderations: ["Root canal therapy"],
  redFlags: [],
  uncertainty: ["Radiographs missing"],
  decisionChangingEvidence: [],
  safetyNotes: ["Clinician must review."],
};

class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  get length(): number {
    return this.store.size;
  }
}

describe("case-storage repository", () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: mockStorage as unknown as Storage,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("saves and retrieves a case", () => {
    const saved = saveCase({
      id: "CASE-101",
      caseData: mockCaseData,
      analysis: mockAnalysis,
      status: "analyzed",
      analysisStatus: "current",
    });

    expect(saved.id).toBe("CASE-101");
    expect(saved.status).toBe("analyzed");
    expect(saved.analysisStatus).toBe("current");

    const retrieved = getCase("CASE-101");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.caseData.chiefComplaint).toBe("Pain on lower left molar");
    expect(retrieved?.analysis?.possibleDiagnoses[0].diagnosis).toBe(
      "Symptomatic Irreversible Pulpitis"
    );
  });

  it("handles case-insensitive ID lookup", () => {
    saveCase({
      id: "CASE-ABC",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
    });

    expect(getCase("case-abc")?.id).toBe("CASE-ABC");
    expect(getCase("CASE-ABC")?.id).toBe("CASE-ABC");
  });

  it("sorts cases newest first by updatedAt", () => {
    saveCase({
      id: "CASE-OLD",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    saveCase({
      id: "CASE-NEW",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
    });

    const all = getCases();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("CASE-NEW");
    expect(all[1].id).toBe("CASE-OLD");
  });

  it("updates existing case without duplicates", () => {
    saveCase({
      id: "CASE-101",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
    });

    updateCase("CASE-101", {
      status: "analyzed",
      analysis: mockAnalysis,
      analysisStatus: "current",
    });

    const all = getCases();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("analyzed");
    expect(all[0].analysisStatus).toBe("current");
  });

  it("marks analysis as stale", () => {
    saveCase({
      id: "CASE-101",
      caseData: mockCaseData,
      analysis: mockAnalysis,
      status: "analyzed",
      analysisStatus: "current",
    });

    markAnalysisStale("CASE-101");
    const updated = getCase("CASE-101");
    expect(updated?.analysisStatus).toBe("stale");
    expect(updated?.analysis).not.toBeNull();
  });

  it("deletes a case", () => {
    saveCase({
      id: "CASE-101",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
    });

    expect(deleteCase("CASE-101")).toBe(true);
    expect(getCase("CASE-101")).toBeNull();
    expect(getCases()).toHaveLength(0);
  });

  it("returns false when deleting non-existent case", () => {
    expect(deleteCase("DOES-NOT-EXIST")).toBe(false);
  });

  it("clears all cases", () => {
    saveCase({
      id: "CASE-1",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
    });
    saveCase({
      id: "CASE-2",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
    });

    clearCases();
    expect(getCases()).toHaveLength(0);
  });

  it("safely recovers from malformed localStorage data without crashing", () => {
    mockStorage.setItem(CASES_STORAGE_KEY, "this-is-not-json{{{");
    expect(getCases()).toEqual([]);
    expect(getCase("CASE-1")).toBeNull();

    mockStorage.setItem(
      CASES_STORAGE_KEY,
      JSON.stringify(["not-a-case", { noId: true }, null, 42])
    );
    expect(getCases()).toEqual([]);
  });

  it("filters out invalid items and keeps valid ones from dirty storage", () => {
    const dirty = [
      { id: "VALID-1", caseData: mockCaseData, status: "draft" },
      { garbage: true },
      null,
    ];
    mockStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(dirty));

    const cases = getCases();
    expect(cases).toHaveLength(1);
    expect(cases[0].id).toBe("VALID-1");
  });

  it("supports the full case lifecycle (draft -> analyzed -> stale -> re-analyzed -> reviewed)", () => {
    // 1. Initial draft
    const draft = saveCase({
      id: "CASE-LIFECYCLE-001",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
    });
    expect(draft.status).toBe("draft");
    expect(draft.analysis).toBeNull();

    // 2. Initial analysis
    const analyzed = updateCase("CASE-LIFECYCLE-001", {
      analysis: mockAnalysis,
      status: "analyzed",
      analysisStatus: "current",
    });
    expect(analyzed?.status).toBe("analyzed");
    expect(analyzed?.analysisStatus).toBe("current");

    // 3. Clinical findings updated -> stale analysis
    const stale = markAnalysisStale("CASE-LIFECYCLE-001");
    expect(stale?.analysisStatus).toBe("stale");
    expect(stale?.analysis).not.toBeNull();

    // 4. Re-analyzed
    const reanalyzed = updateCase("CASE-LIFECYCLE-001", {
      analysis: { ...mockAnalysis, summary: "Updated reasoning summary" },
      status: "analyzed",
      analysisStatus: "current",
    });
    expect(reanalyzed?.analysisStatus).toBe("current");
    expect(reanalyzed?.analysis?.summary).toBe("Updated reasoning summary");

    // 5. Clinician reviews and marks reviewed
    const reviewed = updateCase("CASE-LIFECYCLE-001", {
      status: "reviewed",
    });
    expect(reviewed?.status).toBe("reviewed");
  });

  it("verifies report readiness and safety disclaimer requirement", () => {
    // Case without analysis is not ready for clinical decision report
    const unanalyzed = saveCase({
      id: "CASE-NO-REPORT",
      caseData: mockCaseData,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
    });
    expect(unanalyzed.analysis).toBeNull();

    // Case with analysis contains all mandatory report fields
    const ready = saveCase({
      id: "CASE-REPORT-READY",
      caseData: mockCaseData,
      analysis: mockAnalysis,
      status: "analyzed",
      analysisStatus: "current",
    });
    expect(ready.analysis).not.toBeNull();
    expect(ready.analysis?.possibleDiagnoses[0].diagnosis).toBeDefined();
    expect(ready.analysis?.possibleDiagnoses[0].rank).toBe(1);
    expect(ready.analysis?.safetyNotes.length).toBeGreaterThan(0);
    expect(ready.analysis?.safetyNotes[0]).toContain("Clinician must review");
  });

  describe("Clinical Review & Decision Trace", () => {
    it("assigns appropriate default review states for draft vs analyzed cases", () => {
      const draft = saveCase({
        id: "CASE-REV-DEFAULT-1",
        caseData: mockCaseData,
        analysis: null,
        status: "draft",
        analysisStatus: "stale",
      });
      expect(draft.reviewStatus).toBe("pending");

      const analyzed = saveCase({
        id: "CASE-REV-DEFAULT-2",
        caseData: mockCaseData,
        analysis: mockAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });
      expect(analyzed.reviewStatus).toBe("needs_review");
    });

    it("records clinician review, sets reviewedAt timestamp, and persists corrections", () => {
      saveCase({
        id: "CASE-REV-TRACE-1",
        caseData: mockCaseData,
        analysis: mockAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      const reviewed = reviewCase("CASE-REV-TRACE-1", {
        status: "reviewed",
        reviewedBy: "Dr. Elena Rostova, DDS (Lic #44192)",
        notes: "Confirmed irreversible pulpitis following thermal test verification.",
        corrections: {
          agreedWithAiDiagnosis: true,
          finalDiagnosis: "Symptomatic Irreversible Pulpitis",
          diagnosisNotes: "Lingering cold response exceeds 30 seconds with deep caries.",
          treatmentPlan: "1. Root canal therapy Tooth 36\n2. Core build-up and full coverage crown",
          treatmentPlanNotes: "Extirpation required for immediate relief.",
          additionalObservations: "Mild occlusal wear on opposing maxillary tooth.",
        },
      });

      expect(reviewed).not.toBeNull();
      expect(reviewed?.reviewStatus).toBe("reviewed");
      expect(reviewed?.status).toBe("reviewed");
      expect(reviewed?.review?.reviewedBy).toBe("Dr. Elena Rostova, DDS (Lic #44192)");
      expect(reviewed?.review?.reviewedAt).toBeDefined();
      expect(reviewed?.review?.notes).toContain("Confirmed irreversible pulpitis");
      expect(reviewed?.review?.corrections?.finalDiagnosis).toBe("Symptomatic Irreversible Pulpitis");
      expect(reviewed?.review?.corrections?.agreedWithAiDiagnosis).toBe(true);
      expect(reviewed?.review?.corrections?.treatmentPlan).toContain("Root canal therapy");
    });

    it("preserves original AI analysis separately without mutation when clinician overrides diagnosis", () => {
      saveCase({
        id: "CASE-REV-OVERRIDE-1",
        caseData: mockCaseData,
        analysis: mockAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      // Clinician disagrees with AI and overrides with differential diagnosis
      const reviewed = reviewCase("CASE-REV-OVERRIDE-1", {
        status: "reviewed",
        reviewedBy: "Dr. Marcus Brody, DMD",
        corrections: {
          agreedWithAiDiagnosis: false,
          finalDiagnosis: "Reversible Pulpitis with Dentine Hypersensitivity",
          diagnosisNotes: "Symptom duration shorter than reported by patient; pulp tests recovered under 10s.",
          treatmentPlan: "Desensitizing agent application and temporary sedative restoration.",
        },
      });

      expect(reviewed?.review?.corrections?.agreedWithAiDiagnosis).toBe(false);
      expect(reviewed?.review?.corrections?.finalDiagnosis).toBe(
        "Reversible Pulpitis with Dentine Hypersensitivity"
      );

      // Crucial requirement: original AI analysis MUST remain completely untouched
      expect(reviewed?.analysis?.possibleDiagnoses[0].diagnosis).toBe(
        "Symptomatic Irreversible Pulpitis"
      );
      expect(reviewed?.analysis?.possibleDiagnoses[0].rank).toBe(1);
      expect(reviewed?.analysis?.treatmentConsiderations[0]).toBe("Root canal therapy");
    });

    it("transitions reviewed case to needs_review when clinical findings change and analysis becomes stale", () => {
      saveCase({
        id: "CASE-STALE-REV-1",
        caseData: mockCaseData,
        analysis: mockAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      reviewCase("CASE-STALE-REV-1", {
        status: "reviewed",
        reviewedBy: "Dr. Sara Vance, DDS",
      });

      const beforeStale = getCase("CASE-STALE-REV-1");
      expect(beforeStale?.reviewStatus).toBe("reviewed");

      // Clinical findings modified -> markAnalysisStale called
      const afterStale = markAnalysisStale("CASE-STALE-REV-1");
      expect(afterStale?.analysisStatus).toBe("stale");
      expect(afterStale?.reviewStatus).toBe("needs_review");
      expect(afterStale?.review?.status).toBe("needs_review");
      // Previous review details are preserved for clinical audit
      expect(afterStale?.review?.reviewedBy).toBe("Dr. Sara Vance, DDS");
    });

    it("persists review data across reload from localStorage", () => {
      saveCase({
        id: "CASE-PERSIST-REV-1",
        caseData: mockCaseData,
        analysis: mockAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      reviewCase("CASE-PERSIST-REV-1", {
        status: "reviewed",
        reviewedBy: "Dr. Nathan Cole, DDS",
        corrections: {
          finalDiagnosis: "Symptomatic Irreversible Pulpitis",
          treatmentPlan: "Endodontic therapy",
        },
      });

      // Retrieve via getCase
      const retrieved = getCase("CASE-PERSIST-REV-1");
      expect(retrieved?.reviewStatus).toBe("reviewed");
      expect(retrieved?.review?.reviewedBy).toBe("Dr. Nathan Cole, DDS");
      expect(retrieved?.review?.corrections?.finalDiagnosis).toBe("Symptomatic Irreversible Pulpitis");

      // Retrieve via getCases list
      const allCases = getCases();
      const found = allCases.find((c) => c.id === "CASE-PERSIST-REV-1");
      expect(found?.reviewStatus).toBe("reviewed");
      expect(found?.review?.corrections?.treatmentPlan).toBe("Endodontic therapy");
    });
  });

  describe("Workspace Data Management, Backup, & Benchmarks", () => {
    it("sanitizeCaseForStorage strips large radiograph dataUrl to preserve quota", () => {
      const caseWithImage: ClinicalCase = {
        ...mockCaseData,
        radiograph: {
          fileName: "periapical-30.png",
          mimeType: "image/png",
          size: 1048576,
          dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
        },
      };

      const sanitized = sanitizeCaseForStorage(caseWithImage);
      expect(sanitized.radiograph?.fileName).toBe("periapical-30.png");
      expect(sanitized.radiograph?.mimeType).toBe("image/png");
      expect(sanitized.radiograph?.size).toBe(1048576);
      expect(sanitized.radiograph?.dataUrl).toBeUndefined();
    });

    it("saveCase automatically sanitizes radiograph when saving to localStorage", () => {
      const caseWithImage: ClinicalCase = {
        ...mockCaseData,
        caseInformation: { caseId: "CASE-IMG-1", age: 40, sex: "Female" },
        radiograph: {
          fileName: "bitewing.png",
          mimeType: "image/png",
          size: 500000,
          dataUrl: "data:image/png;base64,LARGE_BASE64_PAYLOAD",
        },
      };

      const saved = saveCase({
        id: "CASE-IMG-1",
        caseData: caseWithImage,
        status: "draft",
      });

      expect(saved.caseData.radiograph?.dataUrl).toBeUndefined();
      const fromStorage = getCase("CASE-IMG-1");
      expect(fromStorage?.caseData.radiograph?.fileName).toBe("bitewing.png");
      expect(fromStorage?.caseData.radiograph?.dataUrl).toBeUndefined();
    });

    it("saveCaseSafely returns success status and saved case", () => {
      const result = saveCaseSafely({
        id: "CASE-SAFE-1",
        caseData: mockCaseData,
        status: "draft",
      });

      expect(result.success).toBe(true);
      expect(result.case.id).toBe("CASE-SAFE-1");
      expect(getCase("CASE-SAFE-1")).not.toBeNull();
    });

    it("getStorageStats reports accurate counts and formatted storage size", () => {
      expect(getStorageStats().caseCount).toBe(0);

      saveCase({
        id: "CASE-STATS-1",
        caseData: mockCaseData,
        status: "draft",
      });
      saveCase({
        id: "CASE-STATS-2",
        caseData: mockCaseData,
        analysis: mockAnalysis,
        status: "analyzed",
      });

      reviewCase("CASE-STATS-2", {
        status: "reviewed",
        reviewedBy: "Dr. Smith",
      });

      const stats = getStorageStats();
      expect(stats.caseCount).toBe(2);
      expect(stats.analyzedCount).toBe(1);
      expect(stats.reviewedCount).toBe(1);
      expect(stats.estimatedBytes).toBeGreaterThan(0);
      expect(stats.formattedSize).toContain("KB");
      expect(stats.isNearQuota).toBe(false);
    });

    it("exportCases produces a valid de-identified backup bundle", () => {
      saveCase({
        id: "CASE-EXP-1",
        caseData: mockCaseData,
        status: "draft",
      });

      const jsonString = exportCases();
      const parsed = JSON.parse(jsonString);

      expect(parsed.format).toBe("dentarith-clinical-cases");
      expect(parsed.version).toBe("1.0");
      expect(parsed.caseCount).toBe(1);
      expect(parsed.backupScope).toBe("structured_findings_and_reviews_only");
      expect(parsed.binaryDataIncluded).toBe(false);
      expect(parsed.disclaimer).toContain("Radiograph image binary data (dataUrl) is excluded");
      expect(parsed.cases).toHaveLength(1);
      expect(parsed.cases[0].id).toBe("CASE-EXP-1");
    });

    it("recovers from quota exceeded errors by removing orphaned drafts", () => {
      // Set an orphaned draft
      mockStorage.setItem(workspaceStorageKey("draft"), JSON.stringify({ draft: true }));

      // Simulate quota error on first setItem call for cases key, then succeed after draft cleanup
      let calls = 0;
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      mockStorage.setItem = (key: string, val: string) => {
        if (key === CASES_STORAGE_KEY && calls === 0) {
          calls++;
          throw new Error("QuotaExceededError");
        }
        originalSetItem(key, val);
      };

      const saved = saveCase({
        id: "CASE-QUOTA-1",
        caseData: mockCaseData,
        status: "draft",
      });

      expect(saved.id).toBe("CASE-QUOTA-1");
      expect(mockStorage.getItem(workspaceStorageKey("draft"))).toBeNull();
      expect(getCase("CASE-QUOTA-1")).not.toBeNull();

      // Restore original setItem
      mockStorage.setItem = originalSetItem;
    });

    it("throws a clear error if storage quota is permanently exhausted", () => {
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      mockStorage.setItem = (key: string, val: string) => {
        if (key === CASES_STORAGE_KEY) {
          throw new Error("QuotaExceededError");
        }
        originalSetItem(key, val);
      };

      expect(() => {
        saveCase({
          id: "CASE-QUOTA-FAIL",
          caseData: mockCaseData,
          status: "draft",
        });
      }).toThrow(/Browser storage quota exceeded/);

      mockStorage.setItem = originalSetItem;
    });

    it("importCasesSafely imports a valid bundle", () => {
      const backupBundle = {
        format: "dentarith-clinical-cases",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        caseCount: 2,
        cases: [
          {
            id: "CASE-IMP-1",
            caseData: mockCaseData,
            status: "draft",
          },
          {
            id: "CASE-IMP-2",
            caseData: mockCaseData,
            status: "draft",
          },
        ],
      };

      const result = importCasesSafely(JSON.stringify(backupBundle));
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(result.errors).toHaveLength(0);

      expect(getCase("CASE-IMP-1")).not.toBeNull();
      expect(getCase("CASE-IMP-2")).not.toBeNull();
    });

    it("importCasesSafely handles invalid JSON and corrupt entries gracefully", () => {
      const invalidJsonResult = importCasesSafely("{ not valid json");
      expect(invalidJsonResult.success).toBe(false);
      expect(invalidJsonResult.errors[0]).toContain("Failed to parse");

      const malformedCases = [
        { notACase: true },
        { id: "CASE-CORRUPT-1" }, // missing caseData
      ];
      const corruptResult = importCasesSafely(JSON.stringify(malformedCases));
      expect(corruptResult.importedCount).toBe(0);
      expect(corruptResult.skippedCount).toBe(2);
      expect(corruptResult.errors.length).toBeGreaterThan(0);
    });

    it("importCasesSafely respects overwriteExisting option", () => {
      saveCase({
        id: "CASE-COLLISION-1",
        caseData: { ...mockCaseData, chiefComplaint: "Original complaint" },
        status: "draft",
      });

      const incoming = [
        {
          id: "CASE-COLLISION-1",
          caseData: { ...mockCaseData, chiefComplaint: "Updated complaint" },
          status: "draft",
        },
      ];

      // With overwriteExisting: false (default), skip
      const skipResult = importCasesSafely(JSON.stringify(incoming), {
        overwriteExisting: false,
      });
      expect(skipResult.skippedCount).toBe(1);
      expect(skipResult.updatedCount).toBe(0);
      expect(getCase("CASE-COLLISION-1")?.caseData.chiefComplaint).toBe(
        "Original complaint"
      );

      // With overwriteExisting: true, update
      const updateResult = importCasesSafely(JSON.stringify(incoming), {
        overwriteExisting: true,
      });
      expect(updateResult.updatedCount).toBe(1);
      expect(getCase("CASE-COLLISION-1")?.caseData.chiefComplaint).toBe(
        "Updated complaint"
      );
    });

    it("seedBenchmarkCases populates reference cases and is idempotent", () => {
      expect(getCases()).toHaveLength(0);

      const firstSeed = seedBenchmarkCases(false);
      expect(firstSeed.addedCount).toBe(3);
      expect(firstSeed.totalCount).toBe(3);

      expect(getCase("CASE-BENCH-001")).not.toBeNull();
      expect(getCase("CASE-BENCH-002")).not.toBeNull();
      expect(getCase("CASE-BENCH-003")).not.toBeNull();

      // Second run without force should not duplicate
      const secondSeed = seedBenchmarkCases(false);
      expect(secondSeed.addedCount).toBe(0);
      expect(secondSeed.totalCount).toBe(3);
    });
  });
});
