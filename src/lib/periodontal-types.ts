import { z } from "zod";
import { PERMANENT_TEETH, findTooth, universalToFdi } from "./tooth-numbering";

/**
 * Periodontal Probing Sites:
 * Six standard clinical probing locations per tooth:
 * - Buccal / Facial aspect:
 *   - DB: Distobuccal
 *   - B:  Mid-buccal
 *   - MB: Mesiobuccal
 * - Lingual / Palatal aspect:
 *   - DL: Distolingual (or Distopalatal in maxilla)
 *   - L:  Mid-lingual (or Mid-palatal in maxilla)
 *   - ML: Mesiolingual (or Mesiopalatal in maxilla)
 */
export const PERIO_SITE_CODES = ["DB", "B", "MB", "DL", "L", "ML"] as const;
export type PerioSiteCode = (typeof PERIO_SITE_CODES)[number];

export const PERIO_SITE_KEYS = [
  "distobuccal",
  "midbuccal",
  "mesiobuccal",
  "distolingual",
  "midlingual",
  "mesiolingual",
] as const;
export type PerioSiteKey = (typeof PERIO_SITE_KEYS)[number];

export const BUCCAL_SITE_KEYS: PerioSiteKey[] = ["distobuccal", "midbuccal", "mesiobuccal"];
export const LINGUAL_SITE_KEYS: PerioSiteKey[] = ["distolingual", "midlingual", "mesiolingual"];

export const SITE_LABELS: Record<PerioSiteKey, { short: PerioSiteCode; name: string; palatalName: string }> = {
  distobuccal: { short: "DB", name: "Distobuccal", palatalName: "Distobuccal" },
  midbuccal: { short: "B", name: "Mid-buccal", palatalName: "Mid-buccal" },
  mesiobuccal: { short: "MB", name: "Mesiobuccal", palatalName: "Mesiobuccal" },
  distolingual: { short: "DL", name: "Distolingual", palatalName: "Distopalatal" },
  midlingual: { short: "L", name: "Mid-lingual", palatalName: "Mid-palatal" },
  mesiolingual: { short: "ML", name: "Mesiolingual", palatalName: "Mesiopalatal" },
};

/**
 * Valid Clinical Measurement Ranges:
 * - Probing Depth (PD): 0 to 15 mm. Depths > 15 mm are out-of-range / unmeasurable with standard probe.
 * - Gingival Margin (GM): -10 to +10 mm relative to CEJ.
 *   Sign convention:
 *   - Positive (+) = Margin is APICAL to CEJ (clinical gingival recession).
 *   - Zero (0)     = Margin is at the CEJ.
 *   - Negative (-) = Margin is CORONAL to CEJ (gingival margin enlargement / pseudopocket).
 * - Clinical Attachment Level (CAL):
 *   CAL = PD + GM (when GM is positive recession: e.g. 4mm PD + 2mm REC = 6mm CAL).
 *   CAL = PD - |GM| (when GM is negative overgrowth: e.g. 5mm PD + (-2mm) = 3mm CAL).
 */
export const MIN_PROBING_DEPTH_MM = 0;
export const MAX_PROBING_DEPTH_MM = 15;
export const MIN_GINGIVAL_MARGIN_MM = -10;
export const MAX_GINGIVAL_MARGIN_MM = 10;
export const POCKET_MILD_THRESHOLD_MM = 4; // AAP/EFP 2018: 4-5 mm pocketing
export const POCKET_DEEP_THRESHOLD_MM = 6; // AAP/EFP 2018: >= 6 mm severe pocketing

export const MobilityGradeEnum = z.enum(["0", "I", "II", "III"]);
export type MobilityGrade = z.infer<typeof MobilityGradeEnum>;

export const FurcationClassEnum = z.enum(["0", "I", "II", "III"]);
export type FurcationClass = z.infer<typeof FurcationClassEnum>;

/**
 * Site measurement Zod Schema
 */
export const siteMeasurementSchema = z.object({
  probingDepth: z
    .number()
    .min(MIN_PROBING_DEPTH_MM, `Probing depth cannot be less than ${MIN_PROBING_DEPTH_MM} mm.`)
    .max(MAX_PROBING_DEPTH_MM, `Probing depth cannot exceed ${MAX_PROBING_DEPTH_MM} mm.`)
    .nullable()
    .optional(),
  gingivalMargin: z
    .number()
    .min(MIN_GINGIVAL_MARGIN_MM, `Gingival margin cannot be less than ${MIN_GINGIVAL_MARGIN_MM} mm.`)
    .max(MAX_GINGIVAL_MARGIN_MM, `Gingival margin cannot exceed ${MAX_GINGIVAL_MARGIN_MM} mm.`)
    .nullable()
    .optional(),
  clinicalAttachmentLevel: z.number().nullable().optional(),
  bleedingOnProbing: z.boolean().optional(),
  suppuration: z.boolean().optional(),
});
export type SiteMeasurement = z.infer<typeof siteMeasurementSchema>;

/**
 * Tooth Periodontal Record Zod Schema
 */
export const toothPerioRecordSchema = z.object({
  toothNumber: z.string().min(1, "Tooth number is required."),
  fdiNumber: z.string().optional(),
  isMissing: z.boolean().optional(),
  isExcluded: z.boolean().optional(),
  exclusionReason: z.string().optional(),
  mobility: MobilityGradeEnum.optional(),
  furcation: FurcationClassEnum.optional(),
  sites: z.object({
    distobuccal: siteMeasurementSchema.optional(),
    midbuccal: siteMeasurementSchema.optional(),
    mesiobuccal: siteMeasurementSchema.optional(),
    distolingual: siteMeasurementSchema.optional(),
    midlingual: siteMeasurementSchema.optional(),
    mesiolingual: siteMeasurementSchema.optional(),
  }),
});
export type ToothPerioRecord = z.infer<typeof toothPerioRecordSchema>;

/**
 * Summary Metrics for the entire Periodontal Examination
 */
export interface PeriodontalSummaryMetrics {
  totalTeethPresent: number;
  totalTeethMissing: number;
  totalProbedTeeth: number;
  totalRecordedSites: number;
  totalBleedingSites: number;
  bleedingOnProbingPercentage: number;
  totalSuppuratingSites: number;
  sitesWithPockets4to5mm: number;
  sitesWithPockets6mmOrMore: number;
  maxProbingDepthMm: number | null;
  maxAttachmentLossMm: number | null;
  teethWithFurcation: string[];
  teethWithMobility: string[];
  isCompleteExamination: boolean; // At least 24 teeth probed with 6 sites each
}

/**
 * Full Periodontal Chart Data Schema
 */
export const periodontalChartSchema = z.object({
  examDate: z.string().optional(),
  examiner: z.string().optional(),
  notes: z.string().optional(),
  teeth: z.record(z.string(), toothPerioRecordSchema),
});
export type PeriodontalChartData = z.infer<typeof periodontalChartSchema>;

// ============================================================================
// Clinical Calculation and Helper Utilities
// ============================================================================

/**
 * Calculate Clinical Attachment Level (CAL) strictly following clinical sign conventions.
 * CAL = Probing Depth (PD) + Gingival Margin (GM).
 *
 * Examples:
 * - PD = 4 mm, GM = +2 mm (recession)    -> CAL = 6 mm.
 * - PD = 5 mm, GM = -2 mm (hyperplasia)    -> CAL = 3 mm.
 * - PD = 3 mm, GM = 0 mm (at CEJ)        -> CAL = 3 mm.
 * - If either PD or GM is undefined/null, CAL is undefined/null (never defaulted to 0).
 */
export function calculateCAL(
  probingDepth: number | null | undefined,
  gingivalMargin: number | null | undefined
): number | null {
  if (
    probingDepth === null ||
    probingDepth === undefined ||
    isNaN(probingDepth) ||
    probingDepth < MIN_PROBING_DEPTH_MM ||
    probingDepth > MAX_PROBING_DEPTH_MM
  ) {
    return null;
  }

  // If gingival margin is unrecorded, CAL cannot be determined with mathematical certainty
  if (
    gingivalMargin === null ||
    gingivalMargin === undefined ||
    isNaN(gingivalMargin) ||
    gingivalMargin < MIN_GINGIVAL_MARGIN_MM ||
    gingivalMargin > MAX_GINGIVAL_MARGIN_MM
  ) {
    return null;
  }

  const cal = probingDepth + gingivalMargin;
  // Clinical attachment loss cannot be negative (re-attachment beyond normal anatomical margin is 0)
  return Math.max(0, Math.round(cal * 10) / 10);
}

/**
 * Create an empty site measurement with unrecorded values.
 */
export function createEmptySiteMeasurement(): SiteMeasurement {
  return {
    probingDepth: null,
    gingivalMargin: null,
    clinicalAttachmentLevel: null,
    bleedingOnProbing: false,
    suppuration: false,
  };
}

/**
 * Create a fresh default record for a tooth with all 6 sites initialized to unrecorded.
 */
export function createEmptyToothPerioRecord(toothNumber: string): ToothPerioRecord {
  const fdi = universalToFdi(toothNumber) || undefined;
  return {
    toothNumber,
    fdiNumber: fdi,
    isMissing: false,
    isExcluded: false,
    exclusionReason: "",
    mobility: "0",
    furcation: "0",
    sites: {
      distobuccal: createEmptySiteMeasurement(),
      midbuccal: createEmptySiteMeasurement(),
      mesiobuccal: createEmptySiteMeasurement(),
      distolingual: createEmptySiteMeasurement(),
      midlingual: createEmptySiteMeasurement(),
      mesiolingual: createEmptySiteMeasurement(),
    },
  };
}

/**
 * Create an empty 32-tooth permanent dentition periodontal chart.
 */
export function createEmptyPeriodontalChart(): PeriodontalChartData {
  const teeth: Record<string, ToothPerioRecord> = {};
  for (const tooth of PERMANENT_TEETH) {
    teeth[tooth.universal] = createEmptyToothPerioRecord(tooth.universal);
  }
  return {
    examDate: new Date().toISOString().split("T")[0],
    examiner: "",
    notes: "",
    teeth,
  };
}

/**
 * Compute clinical summary metrics from a periodontal chart data model.
 */
export function calculatePeriodontalSummary(
  chart?: PeriodontalChartData | null
): PeriodontalSummaryMetrics {
  const defaultSummary: PeriodontalSummaryMetrics = {
    totalTeethPresent: 32,
    totalTeethMissing: 0,
    totalProbedTeeth: 0,
    totalRecordedSites: 0,
    totalBleedingSites: 0,
    bleedingOnProbingPercentage: 0,
    totalSuppuratingSites: 0,
    sitesWithPockets4to5mm: 0,
    sitesWithPockets6mmOrMore: 0,
    maxProbingDepthMm: null,
    maxAttachmentLossMm: null,
    teethWithFurcation: [],
    teethWithMobility: [],
    isCompleteExamination: false,
  };

  if (!chart || !chart.teeth) {
    return defaultSummary;
  }

  let totalTeethPresent = 0;
  let totalTeethMissing = 0;
  let totalProbedTeeth = 0;
  let totalRecordedSites = 0;
  let totalBleedingSites = 0;
  let totalSuppuratingSites = 0;
  let sitesWithPockets4to5mm = 0;
  let sitesWithPockets6mmOrMore = 0;
  let maxProbingDepthMm: number | null = null;
  let maxAttachmentLossMm: number | null = null;
  const teethWithFurcation: string[] = [];
  const teethWithMobility: string[] = [];

  for (const [toothNum, record] of Object.entries(chart.teeth)) {
    if (record.isMissing) {
      totalTeethMissing++;
      continue;
    }
    totalTeethPresent++;

    if (record.mobility && record.mobility !== "0") {
      teethWithMobility.push(toothNum);
    }
    if (record.furcation && record.furcation !== "0") {
      teethWithFurcation.push(toothNum);
    }

    if (record.isExcluded || !record.sites) {
      continue;
    }

    let toothHasRecordedSite = false;
    for (const siteKey of PERIO_SITE_KEYS) {
      const site = record.sites[siteKey];
      if (!site) continue;

      const hasPd = site.probingDepth !== null && site.probingDepth !== undefined;
      const hasGm = site.gingivalMargin !== null && site.gingivalMargin !== undefined;
      const hasBop = Boolean(site.bleedingOnProbing);
      const hasSup = Boolean(site.suppuration);

      if (hasPd || hasGm || hasBop || hasSup) {
        toothHasRecordedSite = true;
      }

      if (hasPd) {
        totalRecordedSites++;
        const pd = site.probingDepth!;

        if (maxProbingDepthMm === null || pd > maxProbingDepthMm) {
          maxProbingDepthMm = pd;
        }

        if (pd >= POCKET_DEEP_THRESHOLD_MM) {
          sitesWithPockets6mmOrMore++;
        } else if (pd >= POCKET_MILD_THRESHOLD_MM) {
          sitesWithPockets4to5mm++;
        }
      }

      if (hasBop) {
        totalBleedingSites++;
      }
      if (hasSup) {
        totalSuppuratingSites++;
      }

      const cal =
        site.clinicalAttachmentLevel !== null && site.clinicalAttachmentLevel !== undefined
          ? site.clinicalAttachmentLevel
          : calculateCAL(site.probingDepth, site.gingivalMargin);

      if (cal !== null && cal !== undefined) {
        if (maxAttachmentLossMm === null || cal > maxAttachmentLossMm) {
          maxAttachmentLossMm = cal;
        }
      }
    }

    if (toothHasRecordedSite) {
      totalProbedTeeth++;
    }
  }

  const bleedingOnProbingPercentage =
    totalRecordedSites > 0
      ? Math.round((totalBleedingSites / totalRecordedSites) * 1000) / 10
      : 0;

  // A complete full-mouth periodontal examination has >= 24 teeth probed with at least 144 sites
  const isCompleteExamination = totalProbedTeeth >= 24 && totalRecordedSites >= 144;

  return {
    totalTeethPresent,
    totalTeethMissing,
    totalProbedTeeth,
    totalRecordedSites,
    totalBleedingSites,
    bleedingOnProbingPercentage,
    totalSuppuratingSites,
    sitesWithPockets4to5mm,
    sitesWithPockets6mmOrMore,
    maxProbingDepthMm,
    maxAttachmentLossMm,
    teethWithFurcation,
    teethWithMobility,
    isCompleteExamination,
  };
}

/**
 * Check if a tooth is multi-rooted (can have anatomical furcation involvement):
 * - Maxillary molars (1, 2, 3, 14, 15, 16): Trifurcated (buccal, mesiopalatal, distopalatal)
 * - Mandibular molars (17, 18, 19, 30, 31, 32): Bifurcated (buccal, lingual)
 * - Maxillary 1st premolars (5, 12): Bifurcated (buccal, palatal)
 */
export function isMultiRootedTooth(toothNumber: string): boolean {
  const tooth = findTooth(toothNumber);
  if (!tooth) return false;
  const num = parseInt(tooth.universal, 10);
  if (isNaN(num)) return false;

  // Maxillary molars
  if ([1, 2, 3, 14, 15, 16].includes(num)) return true;
  // Mandibular molars
  if ([17, 18, 19, 30, 31, 32].includes(num)) return true;
  // Maxillary 1st premolars
  if ([5, 12].includes(num)) return true;

  return false;
}

/**
 * Format Probing Depth for display (distinguishing unrecorded from 0 mm)
 */
export function formatPD(pd: number | null | undefined): string {
  if (pd === null || pd === undefined || isNaN(pd)) return "—";
  return `${pd} mm`;
}

/**
 * Format Gingival Margin for display (+ for recession, - for overgrowth, 0 for CEJ)
 */
export function formatGM(gm: number | null | undefined): string {
  if (gm === null || gm === undefined || isNaN(gm)) return "—";
  if (gm > 0) return `+${gm} mm (REC)`;
  if (gm < 0) return `${gm} mm (COR)`;
  return "0 mm (CEJ)";
}

/**
 * Format Clinical Attachment Level for display
 */
export function formatCAL(cal: number | null | undefined): string {
  if (cal === null || cal === undefined || isNaN(cal)) return "—";
  return `${cal} mm`;
}

/**
 * Get clinical risk severity class based on AAP/EFP 2018 thresholds:
 * - normal: PD <= 3 mm
 * - mild_pocket: PD 4-5 mm
 * - deep_pocket: PD >= 6 mm
 */
export function getSiteRiskSeverity(
  probingDepth: number | null | undefined
): "unrecorded" | "normal" | "mild_pocket" | "deep_pocket" {
  if (probingDepth === null || probingDepth === undefined || isNaN(probingDepth)) {
    return "unrecorded";
  }
  if (probingDepth >= POCKET_DEEP_THRESHOLD_MM) {
    return "deep_pocket";
  }
  if (probingDepth >= POCKET_MILD_THRESHOLD_MM) {
    return "mild_pocket";
  }
  return "normal";
}
