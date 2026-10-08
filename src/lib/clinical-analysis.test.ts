import { describe, expect, it } from "vitest";
import { ClinicalAnalysis } from "./clinical-analysis";

const validAnalysis = {
  summary: "Findings suggest a localized pulpal process.",
  problemList: ["Cold sensitivity", "Tooth 36 tenderness"],
  possibleDiagnoses: [{
    diagnosis: "Reversible pulpitis",
    likelihood: "moderate" as const,
    supportingFindings: ["Cold sensitivity", "Short duration"],
  }],
  differentialDiagnosis: ["Dentin hypersensitivity"],
  missingInformation: ["Duration of pain after stimulus"],
  suggestedInvestigations: ["Complete pulp vitality testing"],
  treatmentConsiderations: ["Review the caries/restoration status before treatment planning"],
  redFlags: [],
  uncertainty: "The supplied findings are limited and do not establish a diagnosis.",
};

describe("ClinicalAnalysis schema", () => {
  it("accepts a complete structured analysis", () => {
    expect(ClinicalAnalysis.safeParse(validAnalysis).success).toBe(true);
  });

  it("rejects invalid likelihood values and missing fields", () => {
    expect(ClinicalAnalysis.safeParse({ ...validAnalysis, uncertainty: 42 }).success).toBe(false);
    expect(ClinicalAnalysis.safeParse({ ...validAnalysis, possibleDiagnoses: [{ ...validAnalysis.possibleDiagnoses[0], likelihood: "certain" }] }).success).toBe(false);
  });
});
