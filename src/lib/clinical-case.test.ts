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
  it("accepts a valid case", () => {
    expect(clinicalCaseSchema.safeParse(makeCase()).success).toBe(true);
  });

  it("requires a chief complaint", () => {
    expect(clinicalCaseSchema.safeParse(makeCase({ complaint: "" })).success).toBe(false);
  });

  it("requires age", () => {
    expect(clinicalCaseSchema.safeParse(makeCase({ age: NaN })).success).toBe(false);
  });

  it("requires a clinical finding", () => {
    expect(clinicalCaseSchema.safeParse(makeCase({ region: "", pulpal: "" })).success).toBe(false);
  });

  it("rejects invalid radiograph types and oversized radiographs", () => {
    expect(validateRadiograph({ name: "scan.gif", type: "image/gif", size: 100 })).toContain("PNG or JPEG");
    expect(validateRadiograph({ name: "scan.png", type: "image/png", size: 10 * 1024 * 1024 + 1 })).toContain("10 MB");
  });

  it("generates the structured ClinicalCase object", () => {
    const clinicalCase = makeCase();
    expect(clinicalCase.caseInformation).toEqual({ caseId: "CASE-001", age: 34, sex: "Female" });
    expect(clinicalCase.historyOfPresentingComplaint.duration).toBe("3 days");
    expect(clinicalCase.clinicalExamination.toothOrRegion).toBe("Tooth 36");
  });
});
