import { describe, expect, it } from "vitest";
import { ClinicalAnalysis } from "./clinical-analysis";

const validAnalysis = {
  summary: "A 34-year-old female presents with cold sensitivity on tooth 36.",
  reportedInformation: [
    "Patient reports sensitivity to cold for 3 days",
    "Pain on lower left quadrant",
  ],
  observedFindings: [
    "Deep carious lesion on tooth 36",
    "Tender on percussion (+)",
    "Cold testing elicits lingering response >30s",
  ],
  inferredFindings: [
    "Symptoms suggest pulpal inflammation extending to periapical tissues",
  ],
  problemList: [
    "Cold sensitivity on tooth 36",
    "Deep caries on tooth 36",
    "Tenderness to percussion",
  ],
  possibleDiagnoses: [
    {
      diagnosis: "Symptomatic Irreversible Pulpitis",
      likelihood: "high" as const,
      supportingFindings: ["Lingering cold response >30s", "Deep carious lesion"],
      contradictingFindings: [],
      evidenceType: "vitality testing + examination",
      reasoning: "Lingering exaggerated cold response in presence of deep caries indicates irreversible pulpitis.",
    },
  ],
  differentialDiagnosis: [
    {
      diagnosis: "Reversible Pulpitis",
      whyConsidered: "Caries with cold sensitivity",
      supportingFindings: ["Cold sensitivity"],
      missingEvidence: ["Transient rather than lingering cold response would be required"],
    },
    {
      diagnosis: "Cracked Tooth Syndrome",
      whyConsidered: "Pain on chewing or stimulus",
      supportingFindings: ["Lower molar location"],
      missingEvidence: ["Bite test with Tooth Slooth", "Transillumination findings"],
    },
  ],
  missingInformation: [
    "Periapical radiograph to evaluate pulp proximity and periapical radiolucency",
    "Electric pulp testing",
    "Periodontal probing depths",
  ],
  suggestedInvestigations: [
    "Periapical radiograph of tooth 36",
    "Electric pulp testing (EPT)",
    "Circumferential periodontal probing",
  ],
  treatmentConsiderations: [
    "Confirm pulpal status with radiographic examination before definitive intervention",
    "Root canal therapy or extraction followed by definitive restoration if irreversible pulpitis confirmed",
    "Pain management advice",
  ],
  redFlags: [
    "Rapidly spreading vestibular or facial swelling",
    "Fever or systemic malaise",
  ],
  uncertainty: [
    "Definitive pulpal and periapical status requires radiographic confirmation",
    "Bone level and root anatomy are unverified without radiographic imaging",
  ],
  safetyNotes: [
    "DentAI provides decision support only; final diagnosis and treatment orders must be made by a licensed dentist.",
  ],
};

describe("ClinicalAnalysis schema", () => {
  it("accepts a complete structured analysis with reported, observed, and inferred separation", () => {
    const result = ClinicalAnalysis.safeParse(validAnalysis);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reportedInformation).toHaveLength(2);
      expect(result.data.observedFindings).toHaveLength(3);
      expect(result.data.inferredFindings).toHaveLength(1);
      expect(result.data.possibleDiagnoses[0].evidenceType).toBe("vitality testing + examination");
      expect(result.data.differentialDiagnosis[0].missingEvidence).toHaveLength(1);
    }
  });

  it("validates missing clinical information and uncertainty tracking", () => {
    const result = ClinicalAnalysis.safeParse(validAnalysis);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.missingInformation).toContain(
        "Periapical radiograph to evaluate pulp proximity and periapical radiolucency"
      );
      expect(result.data.uncertainty).toHaveLength(2);
    }
  });

  it("rejects invalid likelihood values", () => {
    const invalid = {
      ...validAnalysis,
      possibleDiagnoses: [
        {
          ...validAnalysis.possibleDiagnoses[0],
          likelihood: "certain" as unknown as "high",
        },
      ],
    };
    expect(ClinicalAnalysis.safeParse(invalid).success).toBe(false);
  });

  it("rejects missing required top-level arrays", () => {
    const invalid = { ...validAnalysis, reportedInformation: undefined };
    expect(ClinicalAnalysis.safeParse(invalid).success).toBe(false);
  });
});
