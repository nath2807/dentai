import { z } from "zod";

export const ClinicalAnalysis = z.object({
  summary: z.string(),
  problemList: z.array(z.string()),
  possibleDiagnoses: z.array(z.object({
    diagnosis: z.string(),
    likelihood: z.enum(["high", "moderate", "low"]),
    supportingFindings: z.array(z.string()),
  })),
  differentialDiagnosis: z.array(z.string()),
  missingInformation: z.array(z.string()),
  suggestedInvestigations: z.array(z.string()),
  treatmentConsiderations: z.array(z.string()),
  redFlags: z.array(z.string()),
  uncertainty: z.string(),
});

export type ClinicalAnalysis = z.infer<typeof ClinicalAnalysis>;