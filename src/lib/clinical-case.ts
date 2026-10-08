import { z } from "zod";

export const radiographMimeTypes = ["image/png", "image/jpeg"] as const;
export const maxRadiographBytes = 10 * 1024 * 1024;

export type Radiograph = {
  fileName: string;
  mimeType: (typeof radiographMimeTypes)[number];
  size: number;
  dataUrl?: string;
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
  radiograph: Radiograph | null;
};

const text = z.string().trim();

export const clinicalCaseSchema = z
  .object({
    caseInformation: z.object({
      caseId: text.min(1, "Case ID is required."),
      age: z.number({ error: "Age is required." }).int("Age must be a whole number.").min(0, "Age must be 0 or older."),
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
    clinicalExamination: z.object({
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
    }).superRefine((examination, context) => {
      const hasFinding = Object.values(examination).some((value) => value.length > 0);
      if (!hasFinding) {
        context.addIssue({
          code: "custom",
          path: ["toothOrRegion"],
          message: "Add a tooth/region or at least one clinical examination finding.",
        });
      }
    }),
    radiograph: z.object({
      fileName: text,
      mimeType: z.enum(radiographMimeTypes),
      size: z.number().max(maxRadiographBytes, "Radiograph must be 10 MB or smaller."),
      dataUrl: text.optional(),
    }).nullable(),
  });

export type FormValues = Record<string, string>;

export function normalizeClinicalCase(values: FormValues, radiograph: Radiograph | null): ClinicalCase {
  return {
    caseInformation: {
      caseId: values.caseId?.trim() ?? "",
      age: Number(values.age),
      sex: values.sex?.trim() ?? "",
    },
    chiefComplaint: values.complaint?.trim() ?? "",
    historyOfPresentingComplaint: {
      duration: values.duration?.trim() ?? "",
      onset: values.onset?.trim() ?? "",
      symptoms: values.symptoms?.trim() ?? "",
      aggravatingFactors: values.aggravating?.trim() ?? "",
      relievingFactors: values.relieving?.trim() ?? "",
    },
    medicalHistory: {
      conditions: values.conditions?.trim() ?? "",
      medications: values.medications?.trim() ?? "",
      allergies: values.allergies?.trim() ?? "",
    },
    dentalHistory: {
      previousTreatment: values.previousTreatment?.trim() ?? "",
      previousExtractions: values.extractions?.trim() ?? "",
      endodonticTreatment: values.endo?.trim() ?? "",
      prostheticTreatment: values.prosthetic?.trim() ?? "",
      orthodonticTreatment: values.ortho?.trim() ?? "",
      oralHygiene: values.hygiene?.trim() ?? "",
    },
    clinicalExamination: {
      toothOrRegion: values.region?.trim() ?? "",
      extraoralFindings: values.extraoral?.trim() ?? "",
      intraoralFindings: values.intraoral?.trim() ?? "",
      hardTissueFindings: values.hardTissue?.trim() ?? "",
      softTissueFindings: values.softTissue?.trim() ?? "",
      periodontalFindings: values.periodontal?.trim() ?? "",
      pulpalFindings: values.pulpal?.trim() ?? "",
      percussion: values.percussion?.trim() ?? "",
      palpation: values.palpation?.trim() ?? "",
      mobility: values.mobility?.trim() ?? "",
      probing: values.probing?.trim() ?? "",
      vitalityTests: values.vitality?.trim() ?? "",
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
