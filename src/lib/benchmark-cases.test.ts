import { describe, expect, it } from "vitest";
import {
  BENCHMARK_CASES,
  BENCHMARK_CASE_PULPITIS,
  BENCHMARK_CASE_REVERSIBLE,
  BENCHMARK_CASE_NECROSIS,
} from "./benchmark-cases";
import { clinicalCaseSchema } from "./clinical-case";
import { ClinicalAnalysis } from "./clinical-analysis";

describe("Benchmark Cases Clinical Integrity", () => {
  it("contains 3 distinct reference archetypes", () => {
    expect(BENCHMARK_CASES).toHaveLength(3);
    const ids = BENCHMARK_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("validates that all benchmark clinical findings pass clinicalCaseSchema", () => {
    for (const benchmark of BENCHMARK_CASES) {
      const parseResult = clinicalCaseSchema.safeParse(benchmark.caseData);
      expect(
        parseResult.success,
        `Benchmark case ${benchmark.id} failed schema validation: ${
          !parseResult.success ? JSON.stringify(parseResult.error.issues) : ""
        }`
      ).toBe(true);
    }
  });

  it("validates that all benchmark AI analyses pass ClinicalAnalysis schema", () => {
    for (const benchmark of BENCHMARK_CASES) {
      expect(benchmark.analysis).not.toBeNull();
      if (!benchmark.analysis) continue;

      const parseResult = ClinicalAnalysis.safeParse(benchmark.analysis);
      expect(
        parseResult.success,
        `Benchmark analysis for ${benchmark.id} failed validation: ${
          !parseResult.success ? JSON.stringify(parseResult.error.issues) : ""
        }`
      ).toBe(true);
    }
  });

  it("verifies CASE-BENCH-001 (Symptomatic Irreversible Pulpitis) clinical fidelity", () => {
    const c = BENCHMARK_CASE_PULPITIS;
    expect(c.id).toBe("CASE-BENCH-001");
    expect(c.status).toBe("reviewed");
    expect(c.reviewStatus).toBe("reviewed");
    expect(c.caseData.toothAssessment?.toothNumber).toBe("30");
    expect(c.caseData.pulpalAssessment?.lingeringDuration).toContain("35 seconds");

    const leadingDiag = c.analysis?.possibleDiagnoses.find((d) => d.rank === 1);
    expect(leadingDiag?.diagnosis).toBe("Symptomatic Irreversible Pulpitis");
    expect(leadingDiag?.supportingFindings.length).toBeGreaterThanOrEqual(3);

    expect(c.review?.status).toBe("reviewed");
    expect(c.review?.reviewedBy).toContain("Simulated Educational Reviewer");
    expect(c.review?.reviewedBy).not.toContain("Dr.");
    expect(c.review?.notes).toContain("[SYNTHETIC EDUCATIONAL CASE]");
    expect(c.review?.corrections?.agreedWithAiDiagnosis).toBe(true);
  });

  it("verifies CASE-BENCH-002 (Reversible Pulpitis) clinical fidelity", () => {
    const c = BENCHMARK_CASE_REVERSIBLE;
    expect(c.id).toBe("CASE-BENCH-002");
    expect(c.status).toBe("reviewed");
    expect(c.caseData.toothAssessment?.toothNumber).toBe("14");
    expect(c.caseData.pulpalAssessment?.lingeringDuration).toContain("1-2 seconds");

    const leadingDiag = c.analysis?.possibleDiagnoses.find((d) => d.rank === 1);
    expect(leadingDiag?.diagnosis).toContain("Reversible Pulpitis");

    expect(c.review?.status).toBe("reviewed");
    expect(c.review?.reviewedBy).toContain("Simulated Educational Reviewer");
    expect(c.review?.reviewedBy).not.toContain("Dr.");
    expect(c.review?.notes).toContain("[SYNTHETIC EDUCATIONAL CASE]");
  });

  it("verifies CASE-BENCH-003 (Pulpal Necrosis) clinical fidelity", () => {
    const c = BENCHMARK_CASE_NECROSIS;
    expect(c.id).toBe("CASE-BENCH-003");
    expect(c.reviewStatus).toBe("needs_review");
    expect(c.caseData.toothAssessment?.toothNumber).toBe("8");
    expect(c.caseData.periapicalAssessment?.sinusTract).toContain("Active sinus tract");

    const leadingDiag = c.analysis?.possibleDiagnoses.find((d) => d.rank === 1);
    expect(leadingDiag?.diagnosis).toContain("Pulpal Necrosis");
    expect(c.review).toBeNull();
  });

  it("ensures all benchmark cases contain explicit synthetic educational disclaimers and no real clinician claims", () => {
    for (const b of BENCHMARK_CASES) {
      expect(b.caseData.clinicianNotes?.additionalClinicalNotes).toContain(
        "SYNTHETIC EDUCATIONAL CASE"
      );
      if (b.review) {
        expect(b.review.reviewedBy).toContain("Simulated Educational Reviewer");
        expect(b.review.reviewedBy).not.toMatch(/\bDr\.\b/);
        expect(b.review.reviewedBy).not.toMatch(/\bLic #\b/);
        expect(b.review.notes).toContain("SYNTHETIC EDUCATIONAL CASE");
      }
    }
  });
});
