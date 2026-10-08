import { z } from "zod";

export const PossibleDiagnosisSchema = z.object({
  diagnosis: z.string(),
  likelihood: z.enum(["high", "moderate", "low"]),
  supportingFindings: z.array(z.string()),
  contradictingFindings: z.array(z.string()),
  evidenceType: z.string(),
  reasoning: z.string(),
});

export type PossibleDiagnosis = z.infer<typeof PossibleDiagnosisSchema>;

export const DifferentialDiagnosisSchema = z.object({
  diagnosis: z.string(),
  whyConsidered: z.string(),
  supportingFindings: z.array(z.string()),
  missingEvidence: z.array(z.string()),
});

export type DifferentialDiagnosisItem = z.infer<typeof DifferentialDiagnosisSchema>;

export const ClinicalAnalysis = z.object({
  summary: z.string(),
  reportedInformation: z.array(z.string()),
  observedFindings: z.array(z.string()),
  inferredFindings: z.array(z.string()),
  problemList: z.array(z.string()),
  possibleDiagnoses: z.array(PossibleDiagnosisSchema),
  differentialDiagnosis: z.array(DifferentialDiagnosisSchema),
  missingInformation: z.array(z.string()),
  suggestedInvestigations: z.array(z.string()),
  treatmentConsiderations: z.array(z.string()),
  redFlags: z.array(z.string()),
  uncertainty: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

export type ClinicalAnalysis = z.infer<typeof ClinicalAnalysis>;