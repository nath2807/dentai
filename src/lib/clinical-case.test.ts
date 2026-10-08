import { describe, expect, it } from "vitest";
import { clinicalCaseSchema, normalizeClinicalCase, validateRadiograph } from "./clinical-case";

const validValues = {
  caseId: "CASE-001",
  age: "34",
  sex: "Female",
  complaint: "Sensitivity on the lower left",
  duration: "3 days",
  symptoms: "Cold sensitivity",
  region: "Tooth 36",
  pulpal: "Tender to cold",
};

function makeCase(overrides: Record<string, unknown> = {}) {
  const values = { ...validValues, ...overrides };
  return normalizeClinicalCase(values, null);
}

describe("clinical case validation", () => {
  it("accepts a valid case with basic fields (backward compatibility)", () => {
    expect(clinicalCaseSchema.safeParse(makeCase()).success).toBe(true);
  });

  it("requires a chief complaint", () => {
    expect(clinicalCaseSchema.safeParse(makeCase({ complaint: "" })).success).toBe(false);
  });

  it("requires age", () => {
    expect(clinicalCaseSchema.safeParse(makeCase({ age: NaN })).success).toBe(false);
  });

  it("requires a clinical finding", () => {
    expect(clinicalCaseSchema.safeParse(makeCase({ region: "", pulpal: "", toothNumber: "" })).success).toBe(false);
  });

  it("rejects invalid radiograph types and oversized radiographs", () => {
    expect(validateRadiograph({ name: "scan.gif", type: "image/gif", size: 100 })).toContain("PNG or JPEG");
    expect(validateRadiograph({ name: "scan.png", type: "image/png", size: 10 * 1024 * 1024 + 1 })).toContain("10 MB");
  });

  it("generates the structured ClinicalCase object with legacy and new fields", () => {
    const clinicalCase = makeCase({
      toothNumber: "36",
      arch: "mandibular",
      quadrant: "Lower Left (Q3)",
      coldTest: "Lingering >30s",
      percussion: "Tender / Positive (+)",
      probingDepth: "Within normal limits (<=3mm)",
      caries: "Deep carious lesion",
      systemicConditions: "Hypertension",
      relevantNegativeFindings: "No swelling",
    });
    expect(clinicalCase.caseInformation).toEqual({ caseId: "CASE-001", age: 34, sex: "Female" });
    expect(clinicalCase.historyOfPresentingComplaint.duration).toBe("3 days");
    expect(clinicalCase.clinicalExamination.toothOrRegion).toContain("36");
    expect(clinicalCase.toothAssessment?.arch).toBe("mandibular");
    expect(clinicalCase.pulpalAssessment?.coldTest).toBe("Lingering >30s");
    expect(clinicalCase.periapicalAssessment?.percussion).toBe("Tender / Positive (+)");
    expect(clinicalCase.relevantNegatives?.relevantNegativeFindings).toBe("No swelling");
  });

  it("allows all new structured assessment fields to be optional", () => {
    const minimal = makeCase();
    const parsed = clinicalCaseSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid enum values for structured fields like arch", () => {
    const base = makeCase();
    // @ts-expect-error testing invalid enum
    base.toothAssessment = { arch: "invalid-arch" };
    const parsed = clinicalCaseSchema.safeParse(base);
    expect(parsed.success).toBe(false);
  });
});
