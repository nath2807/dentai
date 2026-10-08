import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deleteCase,
  getCase,
  getCases,
  saveCase,
  updateCase,
} from "./case-storage";
import { normalizeClinicalCase } from "./clinical-case";
import type { ClinicalCase } from "./clinical-case";
import type { ClinicalAnalysis } from "./clinical-analysis";

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

describe("End-to-End Case Management Workflow (Phase 3)", () => {
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

  it("completes full 12-step lifecycle: create -> analyze -> store -> reload -> edit -> stale -> re-analyze -> report -> delete", () => {
    // 1. Clinician enters synthetic case
    const syntheticFormValues = {
      caseId: "CASE-999",
      age: "34",
      sex: "Female",
      complaint: "Sharp pain with cold drinks and chewing",
      duration: "3 days",
      symptoms: "Cold sensitivity lingering for 45s, pain on chewing",
      toothNumber: "36",
      arch: "mandibular" as const,
      quadrant: "Lower Left (Q3)",
      coldTest: "Positive with lingering pain approximately 45 seconds",
      lingeringDuration: "45 seconds",
      percussion: "Positive",
      palpation: "Negative",
      caries: "Deep mesio-occlusal carious lesion",
      relevantNegativeFindings: "No swelling, no sinus tract",
    };

    const normalizedCase = normalizeClinicalCase(
      syntheticFormValues,
      null
    ) as unknown as ClinicalCase;

    // 2. Case saved as draft
    const draft = saveCase({
      id: "CASE-999",
      caseData: normalizedCase,
      formValues: syntheticFormValues as unknown as Record<string, string>,
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
    });
    expect(draft.id).toBe("CASE-999");
    expect(draft.status).toBe("draft");

    // 3. Analysis returned from AI reasoning engine
    const syntheticAnalysis: ClinicalAnalysis = {
      summary: "34yo female with pulpitis and apical periodontitis on tooth 36.",
      reportedInformation: ["Sharp pain with cold drinks", "3 days duration"],
      observedFindings: ["Deep MO caries", "Cold test lingering 45s", "Percussion positive"],
      inferredFindings: ["Irreversible pulpitis", "Apical PDL inflammation"],
      problemList: ["Tooth 36 deep caries", "Pain on cold and biting"],
      possibleDiagnoses: [
        {
          diagnosis: "Symptomatic Irreversible Pulpitis",
          diagnosticCategory: "pulpal",
          likelihood: "high",
          confidenceReason: "Thermal response lingers 45 seconds with deep caries",
          rank: 1,
          whyRanksHighest: "Prolonged thermal response is diagnostic of irreversible pulpitis",
          supportingFindings: ["Cold test lingering 45s", "Deep MO caries"],
          contradictingFindings: [],
          evidenceType: "vitality testing",
          reasoning: "Lingering pain indicates pulp is incapable of recovery",
          evidenceMap: [
            {
              finding: "Cold response lingers 45s",
              interpretation: "Prolonged thermal reaction",
              diagnosticRelevance: "Confirms irreversible inflammation",
            },
          ],
        },
        {
          diagnosis: "Symptomatic Apical Periodontitis",
          diagnosticCategory: "apical",
          likelihood: "high",
          confidenceReason: "Positive percussion indicates apical PDL inflammation",
          rank: 2,
          whyRanksHighest: "",
          supportingFindings: ["Percussion positive"],
          contradictingFindings: [],
          evidenceType: "mechanical testing",
          reasoning: "Inflammatory mediators have exited root canal into apical PDL",
          evidenceMap: [],
        },
      ],
      evidenceMap: [
        {
          finding: "Cold response lingers 45s",
          interpretation: "Prolonged thermal reaction",
          diagnosticRelevance: "Confirms irreversible inflammation",
        },
      ],
      differentialDiagnosis: [
        {
          diagnosis: "Cracked Tooth Syndrome",
          whyConsidered: "Pain on chewing",
          supportingEvidence: ["Pain on chewing"],
          supportingFindings: ["Pain on chewing"],
          evidenceAgainst: ["Deep caries explains symptoms"],
          whatWouldChangeRanking: "Isolated cusp pain on Tooth Slooth",
          missingEvidence: ["Tooth Slooth bite test", "Transillumination"],
        },
      ],
      contradictions: [],
      missingInformation: [
        {
          item: "Periapical radiograph",
          importance: "critical",
          whyItMatters: "Assess caries depth and rule out periapical radiolucency",
        },
      ],
      suggestedInvestigations: ["Periapical radiograph of tooth 36"],
      treatmentConsiderations: ["Root canal therapy or extraction"],
      redFlags: [],
      uncertainty: ["Definitive periapical status requires radiographic confirmation"],
      decisionChangingEvidence: ["Periapical lesion on radiograph"],
      safetyNotes: [
        "Dentarith provides clinical decision support only. The treating dental professional must independently verify all findings.",
      ],
    };

    // 4. Case updated after analysis
    const analyzedCase = updateCase("CASE-999", {
      analysis: syntheticAnalysis,
      status: "analyzed",
      analysisStatus: "current",
    });
    expect(analyzedCase?.status).toBe("analyzed");
    expect(analyzedCase?.analysisStatus).toBe("current");
    expect(analyzedCase?.analysis?.possibleDiagnoses[0].diagnosis).toBe(
      "Symptomatic Irreversible Pulpitis"
    );

    // 5. Verify case appears in case list / dashboard
    const allCases = getCases();
    expect(allCases).toHaveLength(1);
    expect(allCases[0].id).toBe("CASE-999");
    expect(allCases[0].status).toBe("analyzed");

    // 6. Reload / simulate new browser session
    const freshFetch = getCase("CASE-999");
    expect(freshFetch).not.toBeNull();
    expect(freshFetch?.caseData.chiefComplaint).toBe("Sharp pain with cold drinks and chewing");

    // 7. Edit clinical information (e.g. pain severity changed)
    const updatedFormValues = {
      ...syntheticFormValues,
      complaint: "Sharp pain with cold drinks, now throbbing at night",
    };
    const editedCase = normalizeClinicalCase(
      updatedFormValues,
      null
    ) as unknown as ClinicalCase;

    // 8. Save edits without re-analyzing -> analysis becomes stale
    updateCase("CASE-999", {
      caseData: editedCase,
      formValues: updatedFormValues as unknown as Record<string, string>,
      analysisStatus: "stale",
    });

    const retrievedAfterEdit = getCase("CASE-999");
    expect(retrievedAfterEdit?.caseData.chiefComplaint).toBe(
      "Sharp pain with cold drinks, now throbbing at night"
    );
    expect(retrievedAfterEdit?.analysisStatus).toBe("stale");
    expect(retrievedAfterEdit?.analysis).not.toBeNull();

    // 9. Re-analyze case with fresh reasoning
    const freshAnalysis: ClinicalAnalysis = {
      ...syntheticAnalysis,
      summary: "Updated assessment incorporating nocturnal throbbing symptoms.",
    };
    const reanalyzed = updateCase("CASE-999", {
      analysis: freshAnalysis,
      analysisStatus: "current",
    });
    expect(reanalyzed?.analysisStatus).toBe("current");
    expect(reanalyzed?.analysis?.summary).toContain("nocturnal throbbing");

    // 10. Generate Report & verify completeness and safety notice
    const reportCase = getCase("CASE-999");
    expect(reportCase?.analysis).not.toBeNull();
    expect(reportCase?.analysis?.possibleDiagnoses[0].rank).toBe(1);
    expect(reportCase?.analysis?.evidenceMap.length).toBeGreaterThan(0);
    expect(reportCase?.analysis?.missingInformation[0].importance).toBe("critical");
    expect(reportCase?.analysis?.safetyNotes[0]).toContain(
      "Dentarith provides clinical decision support only"
    );

    // 11. Delete confirmation
    expect(deleteCase("CASE-999")).toBe(true);

    // 12. Verify case is removed
    expect(getCase("CASE-999")).toBeNull();
    expect(getCases()).toHaveLength(0);
  });
});
