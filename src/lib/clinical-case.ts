import { z } from "zod";

export const radiographMimeTypes = ["image/png", "image/jpeg"] as const;
export const maxRadiographBytes = 10 * 1024 * 1024;

export type Radiograph = {
  fileName: string;
  mimeType: (typeof radiographMimeTypes)[number];
  size: number;
  dataUrl?: string;
};

export type ToothAssessment = {
  toothNumber?: string;
  arch?: "maxillary" | "mandibular" | "";
  quadrant?: string;
  region?: string;
  toothStatus?: string;
};

export type PainAssessment = {
  painPresent?: boolean | string;
  onset?: string;
  duration?: string;
  frequency?: string;
  character?: string;
  severity?: string;
  spontaneousPain?: boolean | string;
  provokedPain?: boolean | string;
  provokingFactors?: string;
  relievingFactors?: string;
  nocturnalPain?: boolean | string;
  lingeringPain?: boolean | string;
};

export type PulpalAssessment = {
  coldTest?: string;
  heatTest?: string;
  electricPulpTest?: string;
  pulpTestResponse?: string;
  lingeringDuration?: string;
};

export type PeriapicalAssessment = {
  percussion?: string;
  palpation?: string;
  biteTest?: string;
  mobility?: string;
  sinusTract?: string;
  swelling?: string;
};

export type PeriodontalAssessment = {
  probingDepth?: string;
  bleedingOnProbing?: string;
  recession?: string;
  attachmentLoss?: string;
  furcation?: string;
  periodontalMobility?: string;
};

export type HardTissueAssessment = {
  caries?: string;
  restoration?: string;
  fracture?: string;
  crack?: string;
  toothWear?: string;
  discoloration?: string;
};

export type SoftTissueAssessment = {
  mucosalFinding?: string;
  gingivalFinding?: string;
  ulcer?: string;
  swelling?: string;
  lesionDescription?: string;
};

export type StructuredMedicalHistory = {
  systemicConditions?: string;
  medications?: string;
  allergies?: string;
  relevantMedicalHistory?: string;
};

export type StructuredDentalHistory = {
  previousTreatment?: string;
  previousPain?: string;
  traumaHistory?: string;
  endodonticHistory?: string;
  periodontalHistory?: string;
  extractionHistory?: string;
};

export type Investigations = {
  investigationsPerformed?: string;
  investigationResults?: string;
  radiographAvailable?: boolean | string;
  radiographType?: string;
};

export type RelevantNegatives = {
  relevantNegativeFindings?: string;
};

export type ClinicianNotes = {
  additionalClinicalNotes?: string;
};

export type ClinicalCase = {
  caseInformation: {
    caseId: string;
    age: number;
    sex: string;
  };
  chiefComplaint: string;
  historyOfPresentingComplaint: {
    duration: string;
    onset: string;
    symptoms: string;
    aggravatingFactors: string;
    relievingFactors: string;
  };
  medicalHistory: {
    conditions: string;
    medications: string;
    allergies: string;
  };
  dentalHistory: {
    previousTreatment: string;
    previousExtractions: string;
    endodonticTreatment: string;
    prostheticTreatment: string;
    orthodonticTreatment: string;
    oralHygiene: string;
  };
  clinicalExamination: {
    toothOrRegion: string;
    extraoralFindings: string;
    intraoralFindings: string;
    hardTissueFindings: string;
    softTissueFindings: string;
    periodontalFindings: string;
    pulpalFindings: string;
    percussion: string;
    palpation: string;
    mobility: string;
    probing: string;
    vitalityTests: string;
  };
  // Structured dentistry assessments (optional for backward compatibility)
  toothAssessment?: ToothAssessment;
  painAssessment?: PainAssessment;
  pulpalAssessment?: PulpalAssessment;
  periapicalAssessment?: PeriapicalAssessment;
  periodontalAssessment?: PeriodontalAssessment;
  hardTissueAssessment?: HardTissueAssessment;
  softTissueAssessment?: SoftTissueAssessment;
  structuredMedicalHistory?: StructuredMedicalHistory;
  structuredDentalHistory?: StructuredDentalHistory;
  investigations?: Investigations;
  relevantNegatives?: RelevantNegatives;
  clinicianNotes?: ClinicianNotes;
  radiograph: Radiograph | null;
};

const text = z.string().trim();

export const toothAssessmentSchema = z
  .object({
    toothNumber: text.optional(),
    arch: z.enum(["maxillary", "mandibular", ""]).optional(),
    quadrant: text.optional(),
    region: text.optional(),
    toothStatus: text.optional(),
  })
  .optional();

export const painAssessmentSchema = z
  .object({
    painPresent: z.union([z.boolean(), text]).optional(),
    onset: text.optional(),
    duration: text.optional(),
    frequency: text.optional(),
    character: text.optional(),
    severity: text.optional(),
    spontaneousPain: z.union([z.boolean(), text]).optional(),
    provokedPain: z.union([z.boolean(), text]).optional(),
    provokingFactors: text.optional(),
    relievingFactors: text.optional(),
    nocturnalPain: z.union([z.boolean(), text]).optional(),
    lingeringPain: z.union([z.boolean(), text]).optional(),
  })
  .optional();

export const pulpalAssessmentSchema = z
  .object({
    coldTest: text.optional(),
    heatTest: text.optional(),
    electricPulpTest: text.optional(),
    pulpTestResponse: text.optional(),
    lingeringDuration: text.optional(),
  })
  .optional();

export const periapicalAssessmentSchema = z
  .object({
    percussion: text.optional(),
    palpation: text.optional(),
    biteTest: text.optional(),
    mobility: text.optional(),
    sinusTract: text.optional(),
    swelling: text.optional(),
  })
  .optional();

export const periodontalAssessmentSchema = z
  .object({
    probingDepth: text.optional(),
    bleedingOnProbing: text.optional(),
    recession: text.optional(),
    attachmentLoss: text.optional(),
    furcation: text.optional(),
    periodontalMobility: text.optional(),
  })
  .optional();

export const hardTissueAssessmentSchema = z
  .object({
    caries: text.optional(),
    restoration: text.optional(),
    fracture: text.optional(),
    crack: text.optional(),
    toothWear: text.optional(),
    discoloration: text.optional(),
  })
  .optional();

export const softTissueAssessmentSchema = z
  .object({
    mucosalFinding: text.optional(),
    gingivalFinding: text.optional(),
    ulcer: text.optional(),
    swelling: text.optional(),
    lesionDescription: text.optional(),
  })
  .optional();

export const structuredMedicalHistorySchema = z
  .object({
    systemicConditions: text.optional(),
    medications: text.optional(),
    allergies: text.optional(),
    relevantMedicalHistory: text.optional(),
  })
  .optional();

export const structuredDentalHistorySchema = z
  .object({
    previousTreatment: text.optional(),
    previousPain: text.optional(),
    traumaHistory: text.optional(),
    endodonticHistory: text.optional(),
    periodontalHistory: text.optional(),
    extractionHistory: text.optional(),
  })
  .optional();

export const investigationsSchema = z
  .object({
    investigationsPerformed: text.optional(),
    investigationResults: text.optional(),
    radiographAvailable: z.union([z.boolean(), text]).optional(),
    radiographType: text.optional(),
  })
  .optional();

export const relevantNegativesSchema = z
  .object({
    relevantNegativeFindings: text.optional(),
  })
  .optional();

export const clinicianNotesSchema = z
  .object({
    additionalClinicalNotes: text.optional(),
  })
  .optional();

export const clinicalCaseSchema = z.object({
  caseInformation: z.object({
    caseId: text.min(1, "Case ID is required."),
    age: z
      .number({ error: "Age is required." })
      .int("Age must be a whole number.")
      .min(0, "Age must be 0 or older."),
    sex: text.min(1, "Sex is required."),
  }),
  chiefComplaint: text.min(1, "Chief complaint is required."),
  historyOfPresentingComplaint: z.object({
    duration: text.min(1, "Duration is required."),
    onset: text,
    symptoms: text.min(1, "Symptoms are required."),
    aggravatingFactors: text,
    relievingFactors: text,
  }),
  medicalHistory: z.record(z.string(), text),
  dentalHistory: z.record(z.string(), text),
  clinicalExamination: z
    .object({
      toothOrRegion: text,
      extraoralFindings: text,
      intraoralFindings: text,
      hardTissueFindings: text,
      softTissueFindings: text,
      periodontalFindings: text,
      pulpalFindings: text,
      percussion: text,
      palpation: text,
      mobility: text,
      probing: text,
      vitalityTests: text,
    })
    .superRefine((examination, context) => {
      const hasFinding = Object.values(examination).some((value) => value.length > 0);
      if (!hasFinding) {
        context.addIssue({
          code: "custom",
          path: ["toothOrRegion"],
          message: "Add a tooth/region or at least one clinical examination finding.",
        });
      }
    }),
  toothAssessment: toothAssessmentSchema,
  painAssessment: painAssessmentSchema,
  pulpalAssessment: pulpalAssessmentSchema,
  periapicalAssessment: periapicalAssessmentSchema,
  periodontalAssessment: periodontalAssessmentSchema,
  hardTissueAssessment: hardTissueAssessmentSchema,
  softTissueAssessment: softTissueAssessmentSchema,
  structuredMedicalHistory: structuredMedicalHistorySchema,
  structuredDentalHistory: structuredDentalHistorySchema,
  investigations: investigationsSchema,
  relevantNegatives: relevantNegativesSchema,
  clinicianNotes: clinicianNotesSchema,
  radiograph: z
    .object({
      fileName: text,
      mimeType: z.enum(radiographMimeTypes),
      size: z.number().max(maxRadiographBytes, "Radiograph must be 10 MB or smaller."),
      dataUrl: text.optional(),
    })
    .nullable(),
});

export type FormValues = Record<string, string>;

export function normalizeClinicalCase(
  values: FormValues,
  radiograph: Radiograph | null
): ClinicalCase {
  const toothNumber = values.toothNumber?.trim() ?? "";
  const region = values.region?.trim() ?? "";
  const toothOrRegion = toothNumber
    ? region
      ? `${toothNumber} (${region})`
      : toothNumber
    : region;

  const painDuration = values.painDuration?.trim() || values.duration?.trim() || "";
  const painOnset = values.painOnset?.trim() || values.onset?.trim() || "";
  const painSymptoms = values.symptoms?.trim() || values.character?.trim() || "";
  const provokingFactors = values.provokingFactors?.trim() || values.aggravating?.trim() || "";
  const relievingFactors = values.relievingFactors?.trim() || values.relieving?.trim() || "";

  return {
    caseInformation: {
      caseId: values.caseId?.trim() ?? "",
      age: Number(values.age),
      sex: values.sex?.trim() ?? "",
    },
    chiefComplaint: values.complaint?.trim() ?? "",
    historyOfPresentingComplaint: {
      duration: painDuration,
      onset: painOnset,
      symptoms: painSymptoms,
      aggravatingFactors: provokingFactors,
      relievingFactors: relievingFactors,
    },
    medicalHistory: {
      conditions: values.systemicConditions?.trim() || values.conditions?.trim() || "",
      medications: values.medications?.trim() ?? "",
      allergies: values.allergies?.trim() ?? "",
    },
    dentalHistory: {
      previousTreatment: values.previousTreatment?.trim() ?? "",
      previousExtractions: values.extractionHistory?.trim() || values.extractions?.trim() || "",
      endodonticTreatment: values.endodonticHistory?.trim() || values.endo?.trim() || "",
      prostheticTreatment: values.prosthetic?.trim() ?? "",
      orthodonticTreatment: values.ortho?.trim() ?? "",
      oralHygiene: values.hygiene?.trim() ?? "",
    },
    clinicalExamination: {
      toothOrRegion,
      extraoralFindings: values.extraoral?.trim() ?? "",
      intraoralFindings: values.intraoral?.trim() ?? "",
      hardTissueFindings:
        values.caries?.trim() ||
        values.restoration?.trim() ||
        values.fracture?.trim() ||
        values.crack?.trim() ||
        values.hardTissue?.trim() ||
        "",
      softTissueFindings:
        values.gingivalFinding?.trim() ||
        values.mucosalFinding?.trim() ||
        values.ulcer?.trim() ||
        values.softTissue?.trim() ||
        "",
      periodontalFindings:
        values.probingDepth?.trim() ||
        values.bleedingOnProbing?.trim() ||
        values.periodontal?.trim() ||
        "",
      pulpalFindings: values.pulpTestResponse?.trim() || values.pulpal?.trim() || "",
      percussion: values.percussion?.trim() ?? "",
      palpation: values.palpation?.trim() ?? "",
      mobility: values.mobility?.trim() || values.periodontalMobility?.trim() || "",
      probing: values.probingDepth?.trim() || values.probing?.trim() || "",
      vitalityTests:
        values.coldTest?.trim() ||
        values.heatTest?.trim() ||
        values.electricPulpTest?.trim() ||
        values.vitality?.trim() ||
        "",
    },
    toothAssessment: {
      toothNumber,
      arch: (values.arch?.trim() as "maxillary" | "mandibular" | "") || "",
      quadrant: values.quadrant?.trim() ?? "",
      region,
      toothStatus: values.toothStatus?.trim() ?? "",
    },
    painAssessment: {
      painPresent: values.painPresent?.trim() ?? "",
      onset: painOnset,
      duration: painDuration,
      frequency: values.frequency?.trim() ?? "",
      character: values.character?.trim() ?? "",
      severity: values.severity?.trim() ?? "",
      spontaneousPain: values.spontaneousPain?.trim() ?? "",
      provokedPain: values.provokedPain?.trim() ?? "",
      provokingFactors,
      relievingFactors,
      nocturnalPain: values.nocturnalPain?.trim() ?? "",
      lingeringPain: values.lingeringPain?.trim() ?? "",
    },
    pulpalAssessment: {
      coldTest: values.coldTest?.trim() ?? "",
      heatTest: values.heatTest?.trim() ?? "",
      electricPulpTest: values.electricPulpTest?.trim() ?? "",
      pulpTestResponse: values.pulpTestResponse?.trim() ?? "",
      lingeringDuration: values.lingeringDuration?.trim() ?? "",
    },
    periapicalAssessment: {
      percussion: values.percussion?.trim() ?? "",
      palpation: values.palpation?.trim() ?? "",
      biteTest: values.biteTest?.trim() ?? "",
      mobility: values.mobility?.trim() ?? "",
      sinusTract: values.sinusTract?.trim() ?? "",
      swelling: values.swelling?.trim() ?? "",
    },
    periodontalAssessment: {
      probingDepth: values.probingDepth?.trim() ?? "",
      bleedingOnProbing: values.bleedingOnProbing?.trim() ?? "",
      recession: values.recession?.trim() ?? "",
      attachmentLoss: values.attachmentLoss?.trim() ?? "",
      furcation: values.furcation?.trim() ?? "",
      periodontalMobility: values.periodontalMobility?.trim() ?? "",
    },
    hardTissueAssessment: {
      caries: values.caries?.trim() ?? "",
      restoration: values.restoration?.trim() ?? "",
      fracture: values.fracture?.trim() ?? "",
      crack: values.crack?.trim() ?? "",
      toothWear: values.toothWear?.trim() ?? "",
      discoloration: values.discoloration?.trim() ?? "",
    },
    softTissueAssessment: {
      mucosalFinding: values.mucosalFinding?.trim() ?? "",
      gingivalFinding: values.gingivalFinding?.trim() ?? "",
      ulcer: values.ulcer?.trim() ?? "",
      swelling: values.softTissueSwelling?.trim() || values.swelling?.trim() || "",
      lesionDescription: values.lesionDescription?.trim() ?? "",
    },
    structuredMedicalHistory: {
      systemicConditions: values.systemicConditions?.trim() || values.conditions?.trim() || "",
      medications: values.medications?.trim() ?? "",
      allergies: values.allergies?.trim() ?? "",
      relevantMedicalHistory: values.relevantMedicalHistory?.trim() ?? "",
    },
    structuredDentalHistory: {
      previousTreatment: values.previousTreatment?.trim() ?? "",
      previousPain: values.previousPain?.trim() ?? "",
      traumaHistory: values.traumaHistory?.trim() ?? "",
      endodonticHistory: values.endodonticHistory?.trim() || values.endo?.trim() || "",
      periodontalHistory: values.periodontalHistory?.trim() ?? "",
      extractionHistory: values.extractionHistory?.trim() || values.extractions?.trim() || "",
    },
    investigations: {
      investigationsPerformed: values.investigationsPerformed?.trim() ?? "",
      investigationResults: values.investigationResults?.trim() ?? "",
      radiographAvailable: values.radiographAvailable?.trim() ?? "",
      radiographType: values.radiographType?.trim() ?? "",
    },
    relevantNegatives: {
      relevantNegativeFindings: values.relevantNegativeFindings?.trim() ?? "",
    },
    clinicianNotes: {
      additionalClinicalNotes: values.additionalClinicalNotes?.trim() ?? "",
    },
    radiograph,
  };
}

export function validateRadiograph(file: Pick<File, "type" | "size" | "name">): string | null {
  if (!radiographMimeTypes.includes(file.type as (typeof radiographMimeTypes)[number])) {
    return "Radiograph must be a PNG or JPEG image.";
  }
  if (file.size > maxRadiographBytes) {
    return "Radiograph must be 10 MB or smaller.";
  }
  return null;
}
