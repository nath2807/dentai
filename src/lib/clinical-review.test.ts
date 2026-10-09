import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getCase,
  markAnalysisStale,
  reviewCase,
  saveCase,
  updateCase,
} from "./case-storage";
import type { ClinicalCase } from "./clinical-case";
import type { ClinicalAnalysis } from "./clinical-analysis";

const sampleCaseData: ClinicalCase = {
  caseInformation: { caseId: "CASE-REV-100", age: 42, sex: "Male" },
  chiefComplaint: "Severe throbbing pain in lower right molar, worse when lying down",
  historyOfPresentingComplaint: {
    duration: "4 days",
    onset: "Acute",
    symptoms: "Continuous throbbing pain and temperature sensitivity",
    aggravatingFactors: "Hot liquids, chewing, lying flat",
    relievingFactors: "Cold water temporarily relieves",
  },
  medicalHistory: { conditions: "Type 2 Diabetes (controlled)", medications: "Metformin", allergies: "Penicillin" },
  dentalHistory: {
    previousTreatment: "Restorations",
    previousExtractions: "None",
    endodonticTreatment: "None",
    prostheticTreatment: "None",
    orthodonticTreatment: "None",
    oralHygiene: "Fair",
  },
  clinicalExamination: {
    toothOrRegion: "Tooth 46",
    extraoralFindings: "No facial asymmetry, lymph nodes normal",
    intraoralFindings: "Deep distal restoration on 46 with secondary caries",
    hardTissueFindings: "Recurrent decay under distal margin",
    softTissueFindings: "Normal gingival margin, no sinus tract",
    periodontalFindings: "Probing 2-3 mm throughout",
    pulpalFindings: "Exaggerated response to cold lingering >60 seconds; heat triggers severe pain",
    percussion: "Tender / Positive (+)",
    palpation: "Mild tenderness at buccal apical area",
    mobility: "Grade 0",
    probing: "2-3 mm",
    vitalityTests: "Cold test positive lingering; EPT 28 (control 32)",
  },
  toothAssessment: {
    toothNumber: "46",
    arch: "mandibular",
    quadrant: "Lower Right (Q4)",
  },
  radiograph: null,
};

const sampleAnalysis: ClinicalAnalysis = {
  summary: "Acute irreversible pulpal inflammation with periapical ligament involvement on tooth 46.",
  reportedInformation: ["Throbbing nocturnal pain", "Hot exacerbation", "Cold transient relief"],
  observedFindings: ["Cold test lingering >60s", "Percussion positive (+)", "Secondary distal caries"],
  inferredFindings: ["Irreversible pulpitis with symptomatic apical periodontitis"],
  problemList: ["Tooth 46 irreversible pulpitis", "Apical periodontitis", "Recurrent caries"],
  possibleDiagnoses: [
    {
      diagnosis: "Symptomatic Irreversible Pulpitis",
      diagnosticCategory: "pulpal",
      likelihood: "high",
      confidenceReason: "Lingering thermal responsiveness >60s with heat sensitivity",
      rank: 1,
      whyRanksHighest: "Thermal hypersensitivity lasting over 60 seconds pathognomonic of irreversible pulpal damage",
      supportingFindings: ["Cold lingering >60s", "Heat exacerbation", "Deep distal caries"],
      contradictingFindings: [],
      evidenceType: "thermal testing",
      reasoning: "Pulp tissue is irreversibly inflamed and non-viable long-term.",
      evidenceMap: [
        {
          finding: "Cold lingering >60s",
          interpretation: "Severe prolonged C-fiber response",
          diagnosticRelevance: "Confirms irreversible pulpal state",
        },
      ],
    },
    {
      diagnosis: "Symptomatic Apical Periodontitis",
      diagnosticCategory: "apical",
      likelihood: "high",
      confidenceReason: "Tender to vertical percussion and palpation",
      rank: 2,
      whyRanksHighest: "",
      supportingFindings: ["Percussion positive (+)", "Palpation tenderness"],
      contradictingFindings: [],
      evidenceType: "periapical mechanical testing",
      reasoning: "Inflammation extending to periapical periodontal ligament space.",
      evidenceMap: [],
    },
  ],
  evidenceMap: [
    {
      finding: "Cold lingering >60s",
      interpretation: "Prolonged thermal reaction",
      diagnosticRelevance: "Irreversible inflammation",
    },
  ],
  differentialDiagnosis: [
    {
      diagnosis: "Cracked Tooth Syndrome",
      whyConsidered: "Pain on chewing",
      supportingEvidence: ["Chewing tenderness"],
      supportingFindings: ["Chewing tenderness"],
      evidenceAgainst: ["Thermal lingering indicates pulpal pathosis rather than isolated fracture"],
      whatWouldChangeRanking: "Isolated cusp pain on selective tooth sleuth test",
      missingEvidence: ["Tooth sleuth bite test", "Transillumination"],
    },
  ],
  contradictions: [],
  missingInformation: [
    {
      item: "Periapical Radiograph of Tooth 46",
      importance: "critical",
      whyItMatters: "Confirm periapical lamina dura integrity and evaluate root canal anatomy",
    },
  ],
  suggestedInvestigations: ["Periapical radiograph with parallel technique", "Bitewing radiograph"],
  treatmentConsiderations: [
    "Pulpectomy / Root canal therapy Tooth 46",
    "Occlusal reduction if hyper-occlusion present",
    "Post-endodontic full-coverage restoration (crown)",
  ],
  redFlags: [],
  uncertainty: ["Periapical bone lesion status requires radiographic confirmation"],
  decisionChangingEvidence: ["Presence of radiolucency on periapical radiograph"],
  safetyNotes: [
    "Dentarith provides clinical decision support only. The licensed clinician must independently verify findings.",
  ],
};

class LocalStorageMock {
  private items = new Map<string, string>();
  getItem(key: string) { return this.items.get(key) ?? null; }
  setItem(key: string, value: string) { this.items.set(key, String(value)); }
  removeItem(key: string) { this.items.delete(key); }
  clear() { this.items.clear(); }
  get length() { return this.items.size; }
  key(i: number) { return Array.from(this.items.keys())[i] ?? null; }
}

describe("Clinical Review & Decision Trace Module", () => {
  beforeEach(() => {
    const mockStorage = new LocalStorageMock();
    (globalThis as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: mockStorage as unknown as Storage,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  describe("1. Review State Transitions", () => {
    it("transitions review state: pending (draft) -> needs_review (analyzed) -> reviewed (clinician confirmed)", () => {
      // 1. Initial draft
      const draft = saveCase({
        id: "CASE-FLOW-01",
        caseData: sampleCaseData,
        analysis: null,
        status: "draft",
        analysisStatus: "stale",
      });
      expect(draft.reviewStatus).toBe("pending");
      expect(draft.status).toBe("draft");

      // 2. Analyzed by AI
      const analyzed = updateCase("CASE-FLOW-01", {
        analysis: sampleAnalysis,
        status: "analyzed",
        analysisStatus: "current",
        reviewStatus: "needs_review",
      });
      expect(analyzed?.reviewStatus).toBe("needs_review");
      expect(analyzed?.status).toBe("analyzed");

      // 3. Clinician reviews and signs off
      const reviewed = reviewCase("CASE-FLOW-01", {
        status: "reviewed",
        reviewedBy: "Dr. Alexander Wright, DDS",
        corrections: {
          agreedWithAiDiagnosis: true,
          finalDiagnosis: "Symptomatic Irreversible Pulpitis",
        },
      });
      expect(reviewed?.reviewStatus).toBe("reviewed");
      expect(reviewed?.status).toBe("reviewed");
      expect(reviewed?.review?.reviewedAt).toBeDefined();
    });

    it("transitions reviewed case back to needs_review when clinical findings change", () => {
      saveCase({
        id: "CASE-FLOW-02",
        caseData: sampleCaseData,
        analysis: sampleAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      reviewCase("CASE-FLOW-02", {
        status: "reviewed",
        reviewedBy: "Dr. Wright",
      });

      expect(getCase("CASE-FLOW-02")?.reviewStatus).toBe("reviewed");

      // Findings updated -> analysis marked stale
      const staled = markAnalysisStale("CASE-FLOW-02");
      expect(staled?.analysisStatus).toBe("stale");
      expect(staled?.reviewStatus).toBe("needs_review");
      expect(staled?.review?.status).toBe("needs_review");
    });
  });

  describe("2. Decision Trace and Clinician Corrections", () => {
    it("stores clinician agreement with AI leading diagnosis", () => {
      saveCase({
        id: "CASE-TRACE-AGREE",
        caseData: sampleCaseData,
        analysis: sampleAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      const reviewed = reviewCase("CASE-TRACE-AGREE", {
        status: "reviewed",
        reviewedBy: "Dr. Katherine Lee, DDS",
        notes: "Verified clinical symptoms and pulpal testing personally.",
        corrections: {
          agreedWithAiDiagnosis: true,
          finalDiagnosis: "Symptomatic Irreversible Pulpitis",
          diagnosisNotes: "Patient has classic severe lingering cold response; aligns with AI Rank #1.",
          treatmentPlan: "Endodontic therapy (RCT) on Tooth 46, followed by full porcelain-fused-to-zirconia crown.",
          treatmentPlanNotes: "Extirpation scheduled today under 2% lidocaine.",
          additionalObservations: "Opposing tooth 16 has slight extrusion.",
        },
      });

      expect(reviewed?.review?.corrections?.agreedWithAiDiagnosis).toBe(true);
      expect(reviewed?.review?.corrections?.finalDiagnosis).toBe("Symptomatic Irreversible Pulpitis");
      expect(reviewed?.review?.corrections?.treatmentPlan).toContain("Endodontic therapy");
      expect(reviewed?.review?.corrections?.additionalObservations).toContain("Opposing tooth 16");
    });

    it("stores clinician diagnostic override while preserving original AI analysis completely separate", () => {
      saveCase({
        id: "CASE-TRACE-OVERRIDE",
        caseData: sampleCaseData,
        analysis: sampleAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      // Clinician overrides AI hypothesis based on chairside physical findings
      const reviewed = reviewCase("CASE-TRACE-OVERRIDE", {
        status: "reviewed",
        reviewedBy: "Dr. Michael Chen, DDS",
        notes: "Clinical examination reveals severe occlusal trauma rather than irreversible pulpitis.",
        corrections: {
          agreedWithAiDiagnosis: false,
          finalDiagnosis: "Primary Occlusal Traumatism with Reversible Pulpitis",
          diagnosisNotes: "Heavy contact on mesio-buccal cusp in lateral excursion. Cold lingering was exaggerated by fear.",
          treatmentPlan: "1. Occlusal equilibration\n2. Re-evaluate vitality in 14 days",
          treatmentPlanNotes: "Defer root canal therapy pending symptom resolution after bite adjustment.",
        },
      });

      // Clinician decision trace is stored accurately
      expect(reviewed?.review?.corrections?.agreedWithAiDiagnosis).toBe(false);
      expect(reviewed?.review?.corrections?.finalDiagnosis).toBe(
        "Primary Occlusal Traumatism with Reversible Pulpitis"
      );
      expect(reviewed?.review?.corrections?.treatmentPlan).toContain("Occlusal equilibration");

      // Original AI analysis remains pristine
      expect(reviewed?.analysis?.possibleDiagnoses[0].diagnosis).toBe(
        "Symptomatic Irreversible Pulpitis"
      );
      expect(reviewed?.analysis?.possibleDiagnoses[0].rank).toBe(1);
      expect(reviewed?.analysis?.treatmentConsiderations).toContain(
        "Pulpectomy / Root canal therapy Tooth 46"
      );
      expect(reviewed?.analysis?.summary).toContain("Acute irreversible pulpal inflammation");
    });
  });

  describe("3. Report Integration & Safety Disclaimers", () => {
    it("provides complete review metadata and safety trace for printable reports", () => {
      saveCase({
        id: "CASE-REPORT-TRACE",
        caseData: sampleCaseData,
        analysis: sampleAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      reviewCase("CASE-REPORT-TRACE", {
        status: "reviewed",
        reviewedBy: "Dr. Amanda White, DDS (State License #98412)",
        notes: "Case reviewed and treatment plan authorized.",
        corrections: {
          agreedWithAiDiagnosis: true,
          finalDiagnosis: "Symptomatic Irreversible Pulpitis",
          treatmentPlan: "Complete Root Canal Treatment Tooth 46",
        },
      });

      const reportCase = getCase("CASE-REPORT-TRACE");
      expect(reportCase).not.toBeNull();

      // Verify fields required for printable report
      expect(reportCase?.reviewStatus).toBe("reviewed");
      expect(reportCase?.review?.reviewedBy).toBe("Dr. Amanda White, DDS (State License #98412)");
      expect(reportCase?.review?.reviewedAt).toBeDefined();
      expect(reportCase?.review?.corrections?.finalDiagnosis).toBe("Symptomatic Irreversible Pulpitis");
      expect(reportCase?.review?.corrections?.treatmentPlan).toBe("Complete Root Canal Treatment Tooth 46");

      // Verify AI analysis is present for side-by-side trace
      expect(reportCase?.analysis?.possibleDiagnoses.length).toBeGreaterThan(0);
      expect(reportCase?.analysis?.safetyNotes.length).toBeGreaterThan(0);
    });

    it("handles partial review (notes without full corrections) gracefully", () => {
      saveCase({
        id: "CASE-PARTIAL-REV",
        caseData: sampleCaseData,
        analysis: sampleAnalysis,
        status: "analyzed",
        analysisStatus: "current",
      });

      const updated = reviewCase("CASE-PARTIAL-REV", {
        status: "needs_review",
        notes: "Awaiting endodontic specialist consultation.",
      });

      expect(updated?.reviewStatus).toBe("needs_review");
      expect(updated?.review?.notes).toBe("Awaiting endodontic specialist consultation.");
      expect(updated?.review?.corrections).toBeUndefined();
    });
  });
});
