import { describe, expect, it } from "vitest";
import {
  ClinicalAnalysis,
  PossibleDiagnosisSchema,
  ContradictionSchema,
  MissingInformationItemSchema,
} from "./clinical-analysis";

const validAnalysis = {
  summary: "A 34-year-old female presents with cold sensitivity and pain on tooth 36.",
  reportedInformation: [
    "Patient reports sensitivity to cold for 3 days",
    "Pain on lower left quadrant when drinking cold liquids",
  ],
  observedFindings: [
    "Deep carious lesion on tooth 36",
    "Tender on percussion (+)",
    "Cold testing elicits lingering response >45s",
  ],
  inferredFindings: [
    "Symptoms indicate pulpal inflammation with potential extension to periapical tissues",
  ],
  problemList: [
    "Cold sensitivity on tooth 36",
    "Deep caries on tooth 36",
    "Tenderness to percussion",
  ],
  possibleDiagnoses: [
    {
      diagnosis: "Symptomatic Irreversible Pulpitis",
      diagnosticCategory: "pulpal" as const,
      likelihood: "high" as const,
      confidenceReason:
        "Multiple concordant clinical findings including prolonged thermal response and deep caries, pending radiographic confirmation.",
      rank: 1,
      whyRanksHighest:
        "Lingering exaggerated pain >45s combined with deep caries is the classic presentation of irreversible pulpitis over reversible conditions.",
      supportingFindings: ["Lingering cold response >45s", "Deep carious lesion"],
      contradictingFindings: [],
      evidenceType: "vitality testing + examination",
      reasoning:
        "Lingering exaggerated cold response in presence of deep caries indicates irreversible pulpal inflammation.",
      evidenceMap: [
        {
          finding: "Cold response lingers for 45 seconds",
          interpretation: "Prolonged thermal response",
          diagnosticRelevance: "Supports significant pulpal inflammation",
        },
      ],
    },
    {
      diagnosis: "Symptomatic Apical Periodontitis",
      diagnosticCategory: "apical" as const,
      likelihood: "moderate" as const,
      confidenceReason:
        "Tenderness to percussion indicates apical periodontal ligament inflammation secondary to pulpal pathosis.",
      rank: 2,
      supportingFindings: ["Tender on percussion (+)"],
      contradictingFindings: [],
      evidenceType: "percussion test",
      reasoning:
        "Positive percussion test indicates inflammatory mediator extension to the apical PDL.",
      evidenceMap: [],
    },
  ],
  evidenceMap: [
    {
      finding: "Cold response lingers for 45 seconds",
      interpretation: "Prolonged thermal response",
      diagnosticRelevance: "Supports significant pulpal inflammation",
    },
  ],
  differentialDiagnosis: [
    {
      diagnosis: "Reversible Pulpitis",
      whyConsidered: "Caries with cold sensitivity",
      supportingEvidence: ["Cold sensitivity present"],
      supportingFindings: ["Cold sensitivity present"],
      evidenceAgainst: ["Pain lingers for 45s rather than subsiding immediately upon removal of stimulus"],
      whatWouldChangeRanking: "If cold pain subsided immediately upon removal of stimulus",
      missingEvidence: ["Transient cold response pattern"],
    },
    {
      diagnosis: "Cracked Tooth Syndrome",
      whyConsidered: "Pain on chewing or biting",
      supportingEvidence: ["Lower molar location"],
      supportingFindings: ["Lower molar location"],
      evidenceAgainst: ["Obvious deep caries accounts for pulpal symptoms"],
      whatWouldChangeRanking: "Evidence of isolated deep probing or distinct cusp pain on Tooth Slooth",
      missingEvidence: ["Bite test with Tooth Slooth", "Transillumination findings"],
    },
  ],
  contradictions: [
    {
      finding: "Pain is described as spontaneous in history",
      expectedPattern: "Provoked pain only for early pulpitis",
      conflict: "History contains spontaneous pain but patient notes pain only with cold",
      clinicalImpact: "Clarification is required before finalizing pulpal vs apical staging",
    },
  ],
  missingInformation: [
    {
      item: "Periapical radiograph of tooth 36",
      importance: "critical" as const,
      whyItMatters: "Essential to assess proximity of caries to pulp chamber and rule out periapical radiolucency",
    },
    {
      item: "Electric pulp testing (EPT)",
      importance: "important" as const,
      whyItMatters: "Provides secondary confirmation of sensory nerve fiber responsiveness",
    },
    {
      item: "Bitewing radiograph",
      importance: "useful" as const,
      whyItMatters: "Evaluates coronal caries extent and alveolar crestal bone level",
    },
  ],
  suggestedInvestigations: [
    "Periapical radiograph of tooth 36",
    "Electric pulp testing (EPT)",
    "Periodontal probing depths around tooth 36",
  ],
  treatmentConsiderations: [
    "Confirm pulpal status with radiographic examination before definitive intervention",
    "Endodontic therapy or extraction if irreversible pulpitis is confirmed by clinician",
  ],
  redFlags: [],
  uncertainty: [
    "Definitive pulpal and periapical status requires radiographic confirmation",
    "Histologic state of the pulp cannot be directly established by sensory testing alone",
  ],
  decisionChangingEvidence: [
    "Periapical radiograph showing widened PDL space or periapical radiolucency",
    "Negative response on electric pulp testing suggesting partial necrosis",
    "Cuspal deflection pain on specialized bite testing",
  ],
  safetyNotes: [
    "DentAI provides decision support only; final diagnosis and treatment orders must be made by a licensed dentist.",
  ],
};

describe("ClinicalAnalysis schema", () => {
  it("accepts a complete structured analysis with taxonomy, ranking, evidence map, and prioritized missing info", () => {
    const result = ClinicalAnalysis.safeParse(validAnalysis);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reportedInformation).toHaveLength(2);
      expect(result.data.observedFindings).toHaveLength(3);
      expect(result.data.inferredFindings).toHaveLength(1);
      expect(result.data.possibleDiagnoses[0].diagnosticCategory).toBe("pulpal");
      expect(result.data.possibleDiagnoses[0].rank).toBe(1);
      expect(result.data.possibleDiagnoses[0].confidenceReason).toBeDefined();
      expect(result.data.evidenceMap[0].diagnosticRelevance).toBe("Supports significant pulpal inflammation");
      expect(result.data.contradictions[0].conflict).toContain("spontaneous pain");
      expect(result.data.missingInformation[0].importance).toBe("critical");
      expect(result.data.decisionChangingEvidence).toHaveLength(3);
    }
  });

  it("validates diagnostic taxonomy categories", () => {
    const categories = ["pulpal", "apical", "periodontal", "hard_tissue", "soft_tissue", "other"] as const;
    for (const cat of categories) {
      const diagnosis = {
        ...validAnalysis.possibleDiagnoses[0],
        diagnosticCategory: cat,
      };
      expect(PossibleDiagnosisSchema.safeParse(diagnosis).success).toBe(true);
    }
  });

  it("rejects invalid diagnostic category", () => {
    const invalid = {
      ...validAnalysis,
      possibleDiagnoses: [
        {
          ...validAnalysis.possibleDiagnoses[0],
          diagnosticCategory: "cardiac" as unknown as "pulpal",
        },
      ],
    };
    expect(ClinicalAnalysis.safeParse(invalid).success).toBe(false);
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

  it("rejects invalid rank values (non-positive or non-integer)", () => {
    const invalidRankZero = {
      ...validAnalysis.possibleDiagnoses[0],
      rank: 0,
    };
    expect(PossibleDiagnosisSchema.safeParse(invalidRankZero).success).toBe(false);

    const invalidRankNegative = {
      ...validAnalysis.possibleDiagnoses[0],
      rank: -1,
    };
    expect(PossibleDiagnosisSchema.safeParse(invalidRankNegative).success).toBe(false);
  });

  it("rejects malformed diagnosis object", () => {
    const malformed = {
      diagnosis: "Incomplete",
      // missing diagnosticCategory, likelihood, rank, confidenceReason, reasoning
    };
    expect(PossibleDiagnosisSchema.safeParse(malformed).success).toBe(false);
  });

  it("validates contradiction schema and rejects malformed contradiction", () => {
    const validContradiction = {
      finding: "Spontaneous pain",
      expectedPattern: "Provoked only",
      conflict: "Conflicting timeline",
      clinicalImpact: "Reduces confidence",
    };
    expect(ContradictionSchema.safeParse(validContradiction).success).toBe(true);

    const malformedContradiction = {
      finding: "Spontaneous pain",
      // missing conflict and clinicalImpact
    };
    expect(ContradictionSchema.safeParse(malformedContradiction).success).toBe(false);
  });

  it("validates missing information importance prioritization", () => {
    const validItem = {
      item: "Periapical radiograph",
      importance: "critical" as const,
      whyItMatters: "Evaluates periapical bone and lesion presence",
    };
    expect(MissingInformationItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("rejects invalid importance values in missing information", () => {
    const invalidImportance = {
      item: "Periapical radiograph",
      importance: "trivial" as unknown as "critical",
      whyItMatters: "Optional check",
    };
    expect(MissingInformationItemSchema.safeParse(invalidImportance).success).toBe(false);
  });

  it("rejects malformed missing-information item", () => {
    const malformed = {
      item: "Periapical radiograph",
      // missing importance and whyItMatters
    };
    expect(MissingInformationItemSchema.safeParse(malformed).success).toBe(false);
  });

  it("validates decision-changing evidence and evidence mapping", () => {
    const parsed = ClinicalAnalysis.safeParse(validAnalysis);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decisionChangingEvidence.length).toBeGreaterThan(0);
      expect(parsed.data.evidenceMap.length).toBeGreaterThan(0);
      expect(parsed.data.evidenceMap[0].finding).toBe("Cold response lingers for 45 seconds");
      expect(parsed.data.evidenceMap[0].interpretation).toBe("Prolonged thermal response");
    }
  });
});
