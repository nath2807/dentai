import { z } from "zod";

export const DiagnosticCategoryEnum = z.enum([
  "pulpal",
  "apical",
  "periodontal",
  "hard_tissue",
  "soft_tissue",
  "other",
]);
export type DiagnosticCategory = z.infer<typeof DiagnosticCategoryEnum>;

export const LikelihoodEnum = z.enum(["high", "moderate", "low"]);
export type Likelihood = z.infer<typeof LikelihoodEnum>;

export const EvidenceMapItemSchema = z.object({
  finding: z.string().min(1),
  interpretation: z.string().min(1),
  diagnosticRelevance: z.string().min(1),
});
export type EvidenceMapItem = z.infer<typeof EvidenceMapItemSchema>;

export const PossibleDiagnosisSchema = z.object({
  diagnosis: z.string().min(1),
  diagnosticCategory: DiagnosticCategoryEnum,
  likelihood: LikelihoodEnum,
  confidenceReason: z.string().min(1),
  rank: z.number().int().positive(),
  supportingFindings: z.array(z.string()),
  contradictingFindings: z.array(z.string()).default([]),
  evidenceType: z.string(),
  reasoning: z.string().min(1),
  evidenceMap: z.array(EvidenceMapItemSchema).default([]),
  whyRanksHighest: z.string().optional().default(""),
});
export type PossibleDiagnosis = z.infer<typeof PossibleDiagnosisSchema>;

export const DifferentialDiagnosisSchema = z.object({
  diagnosis: z.string().min(1),
  whyConsidered: z.string().min(1),
  supportingEvidence: z.array(z.string()).default([]),
  supportingFindings: z.array(z.string()).default([]),
  evidenceAgainst: z.array(z.string()).default([]),
  whatWouldChangeRanking: z.string().default(""),
  missingEvidence: z.array(z.string()).default([]),
});
export type DifferentialDiagnosisItem = z.infer<typeof DifferentialDiagnosisSchema>;

export const ContradictionSchema = z.object({
  finding: z.string().min(1),
  expectedPattern: z.string().min(1),
  conflict: z.string().min(1),
  clinicalImpact: z.string().min(1),
});
export type Contradiction = z.infer<typeof ContradictionSchema>;

export const MissingInformationImportanceEnum = z.enum([
  "critical",
  "important",
  "useful",
]);
export type MissingInformationImportance = z.infer<
  typeof MissingInformationImportanceEnum
>;

export const MissingInformationItemSchema = z.object({
  item: z.string().min(1),
  importance: MissingInformationImportanceEnum,
  whyItMatters: z.string().min(1),
});
export type MissingInformationItem = z.infer<typeof MissingInformationItemSchema>;

export const ClinicalAnalysis = z.object({
  summary: z.string(),
  reportedInformation: z.array(z.string()),
  observedFindings: z.array(z.string()),
  inferredFindings: z.array(z.string()),
  problemList: z.array(z.string()),
  possibleDiagnoses: z.array(PossibleDiagnosisSchema),
  evidenceMap: z.array(EvidenceMapItemSchema).default([]),
  differentialDiagnosis: z.array(DifferentialDiagnosisSchema).default([]),
  contradictions: z.array(ContradictionSchema).default([]),
  missingInformation: z.array(MissingInformationItemSchema),
  suggestedInvestigations: z.array(z.string()),
  treatmentConsiderations: z.array(z.string()),
  redFlags: z.array(z.string()),
  uncertainty: z.array(z.string()),
  decisionChangingEvidence: z.array(z.string()).default([]),
  safetyNotes: z.array(z.string()),
});
export type ClinicalAnalysis = z.infer<typeof ClinicalAnalysis>;