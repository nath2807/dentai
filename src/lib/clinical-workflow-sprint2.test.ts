import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findTooth,
  formatToothWithSystem,
  getOdontogramQuadrants,
} from "./tooth-numbering";
import { ClinicalAnalysis } from "./clinical-analysis";
import {
  saveCase,
  getCase,
  reviewCase,
  deleteCase,
} from "./case-storage";
import { normalizeClinicalCase } from "./clinical-case";
import type { ClinicalCase } from "./clinical-case";

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

describe("Dentarith 2.0 — Clinical Workflow & Data Quality (Sprint 2)", () => {
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

  it("verifies anatomical quadrant opposition across all 16 tooth pairs", () => {
    const { upperRight, upperLeft, lowerRight, lowerLeft } = getOdontogramQuadrants();

    // 8 teeth per quadrant
    expect(upperRight).toHaveLength(8);
    expect(upperLeft).toHaveLength(8);
    expect(lowerRight).toHaveLength(8);
    expect(lowerLeft).toHaveLength(8);

    // Anatomical opposition: Upper Right opposing Lower Right (Patient Right)
    // #1 (Wisdom) opposes #32 (Wisdom)
    expect(upperRight[0].universal).toBe("1");
    expect(lowerRight[0].universal).toBe("32");

    // #3 (1st Molar) opposes #30 (1st Molar)
    expect(upperRight[2].universal).toBe("3");
    expect(lowerRight[2].universal).toBe("30");

    // #8 (Central Incisor) opposes #25 (Central Incisor)
    expect(upperRight[7].universal).toBe("8");
    expect(lowerRight[7].universal).toBe("25");

    // Anatomical opposition: Upper Left opposing Lower Left (Patient Left)
    // #9 (Central Incisor) opposes #24 (Central Incisor)
    expect(upperLeft[0].universal).toBe("9");
    expect(lowerLeft[0].universal).toBe("24");

    // #14 (1st Molar) opposes #19 (1st Molar)
    expect(upperLeft[5].universal).toBe("14");
    expect(lowerLeft[5].universal).toBe("19");

    // #16 (Wisdom) opposes #17 (Wisdom)
    expect(upperLeft[7].universal).toBe("16");
    expect(lowerLeft[7].universal).toBe("17");
  });

  it("handles tooth selection and clearing/deselection gracefully", () => {
    // Selection of tooth 19
    const selected = findTooth("19");
    expect(selected).not.toBeNull();
    expect(selected?.universal).toBe("19");
    expect(selected?.fdi).toBe("36");

    // Deselection / null query
    const cleared = findTooth("");
    expect(cleared).toBeNull();

    // Format with unselected or missing tooth
    expect(formatToothWithSystem("")).toBe("Not specified");
    expect(formatToothWithSystem("unspecified")).toBe("Tooth unspecified");
  });

  it("strictly differentiates between unreviewed draft and clinician-reviewed case", () => {
    const caseId = "TEST-SPRINT2-REVIEW-001";
    const caseData = normalizeClinicalCase(
      {
        caseId,
        age: "45",
        sex: "Male",
        complaint: "Dull ache on lower left molar",
        duration: "2 weeks",
        symptoms: "Mild sensitivity to cold",
        toothNumber: "19",
      },
      null
    ) as unknown as ClinicalCase;

    // 1. Initial draft without review
    saveCase({
      id: caseId,
      caseData,
      formValues: { caseId, toothNumber: "19" },
      analysis: null,
      status: "draft",
      analysisStatus: "stale",
      reviewStatus: "pending",
    });

    const unreviewed = getCase(caseId);
    expect(unreviewed).not.toBeNull();
    expect(unreviewed?.reviewStatus).toBe("pending");
    expect(unreviewed?.review).toBeUndefined();

    // 2. Perform clinician review sign-off
    const reviewed = reviewCase(caseId, {
      status: "reviewed",
      reviewedBy: "Dr. Gregory House, DDS",
      notes: "Confirmed deep dentinal caries approaching pulp.",
      corrections: {
        agreedWithAiDiagnosis: true,
        finalDiagnosis: "Reversible Pulpitis",
        diagnosisNotes: "Cold response transient, resolved within 5s.",
        treatmentPlan: "Indirect pulp capping and composite resin restoration.",
      },
    });

    expect(reviewed).not.toBeNull();
    expect(reviewed?.reviewStatus).toBe("reviewed");
    expect(reviewed?.review?.reviewedBy).toBe("Dr. Gregory House, DDS");
    expect(reviewed?.review?.corrections?.finalDiagnosis).toBe("Reversible Pulpitis");
    expect(reviewed?.review?.corrections?.treatmentPlan).toContain("Indirect pulp capping");

    // Clean up
    deleteCase(caseId);
  });

  it("strictly validates ClinicalAnalysis schema and rejects malformed diagnoses", () => {
    // Valid minimal analysis
    const validData = {
      summary: "Clinical findings indicate localized reversible pulpitis.",
      reportedInformation: ["Patient reports transient cold sensitivity"],
      observedFindings: ["Cold sensation resolves in under 5 seconds"],
      inferredFindings: ["Pulp maintains vitality without irreversible changes"],
      problemList: ["Transient cold sensitivity"],
      possibleDiagnoses: [
        {
          diagnosis: "Reversible Pulpitis",
          diagnosticCategory: "pulpal",
          likelihood: "high",
          confidenceReason: "Thermal response is immediate and transient.",
          rank: 1,
          whyRanksHighest: "Cold sensitivity resolves immediately upon removal of stimulus.",
          supportingFindings: ["Transient cold response"],
          contradictingFindings: [],
          evidenceType: "clinical findings",
          reasoning: "Classic presentation of reversible pulpal hyperemia.",
        },
      ],
      evidenceMap: [],
      differentialDiagnosis: [],
      contradictions: [],
      missingInformation: [],
      suggestedInvestigations: ["Bitewing radiograph to assess caries depth"],
      treatmentConsiderations: ["Conservative caries excavation"],
      redFlags: [],
      uncertainty: ["Radiographic depth of caries unconfirmed"],
      decisionChangingEvidence: ["Prolonged lingering cold response > 30s"],
      safetyNotes: ["A licensed dentist must verify all findings."],
    };

    const validResult = ClinicalAnalysis.safeParse(validData);
    expect(validResult.success).toBe(true);

    // Invalid: negative rank
    const invalidRank = {
      ...validData,
      possibleDiagnoses: [
        {
          ...validData.possibleDiagnoses[0],
          rank: -1,
        },
      ],
    };
    const invalidRankResult = ClinicalAnalysis.safeParse(invalidRank);
    expect(invalidRankResult.success).toBe(false);

    // Invalid: invalid diagnostic category
    const invalidCategory = {
      ...validData,
      possibleDiagnoses: [
        {
          ...validData.possibleDiagnoses[0],
          diagnosticCategory: "non_existent_category",
        },
      ],
    };
    const invalidCategoryResult = ClinicalAnalysis.safeParse(invalidCategory);
    expect(invalidCategoryResult.success).toBe(false);
  });
});
