import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CASES_STORAGE_KEY,
  clearCases,
  deleteCase,
  getCase,
  getCases,
  markAnalysisStale,
  saveCase,
  updateCase,
} from "./case-storage";
import type { ClinicalCase } from "./clinical-case";
import type { ClinicalAnalysis } from "./clinical-analysis";

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
});
