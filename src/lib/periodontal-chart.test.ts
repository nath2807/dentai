import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateCAL,
  calculatePeriodontalSummary,
  createEmptyPeriodontalChart,
  createEmptyToothPerioRecord,
  formatCAL,
  formatGM,
  formatPD,
  getSiteRiskSeverity,
  isMultiRootedTooth,
  periodontalChartSchema,
  siteMeasurementSchema,
  type PeriodontalChartData,
  PERIO_SITE_KEYS,
  BUCCAL_SITE_KEYS,
  LINGUAL_SITE_KEYS,
} from "./periodontal-types";
import {
  clinicalCaseSchema,
  normalizeClinicalCase,
  type ClinicalCase,
} from "./clinical-case";
import {
  saveCase,
  getCase,
  clearCases,
  exportCases,
  importCasesSafely,
} from "./case-storage";
import { PERMANENT_TEETH, universalToFdi, fdiToUniversal } from "./tooth-numbering";

class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  get length(): number {
    return this.store.size;
  }
}

describe("Sprint 3: Advanced Periodontal Charting & Clinical Data Visualization", () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: mockStorage as unknown as Storage,
    };
    clearCases();
  });

  describe("1. Six-Site Probing Mapping & Anatomy", () => {
    it("defines all six standard anatomical probing sites per tooth", () => {
      expect(PERIO_SITE_KEYS).toHaveLength(6);
      expect(BUCCAL_SITE_KEYS).toEqual(["distobuccal", "midbuccal", "mesiobuccal"]);
      expect(LINGUAL_SITE_KEYS).toEqual(["distolingual", "midlingual", "mesiolingual"]);
    });

    it("identifies multi-rooted teeth with potential anatomical furcation involvement", () => {
      // Maxillary molars (1, 2, 3, 14, 15, 16) are multi-rooted (trifurcated)
      expect(isMultiRootedTooth("3")).toBe(true);
      expect(isMultiRootedTooth("14")).toBe(true);
      // Mandibular molars (18, 19, 30, 31) are multi-rooted (bifurcated)
      expect(isMultiRootedTooth("19")).toBe(true);
      expect(isMultiRootedTooth("30")).toBe(true);
      // Maxillary 1st premolars (5, 12) have bifurcated roots
      expect(isMultiRootedTooth("5")).toBe(true);
      expect(isMultiRootedTooth("12")).toBe(true);
      // Anterior single-rooted teeth do not have furcations
      expect(isMultiRootedTooth("8")).toBe(false);
      expect(isMultiRootedTooth("24")).toBe(false);
    });

    it("maps Universal and FDI tooth numbers consistently across all 32 permanent teeth", () => {
      expect(PERMANENT_TEETH).toHaveLength(32);
      for (const tooth of PERMANENT_TEETH) {
        expect(universalToFdi(tooth.universal)).toBe(tooth.fdi);
        expect(fdiToUniversal(tooth.fdi)).toBe(tooth.universal);
      }
    });
  });

  describe("2. Measurement Range Validation & Schema Integrity", () => {
    it("validates full periodontal chart structure with periodontalChartSchema", () => {
      const chart = createEmptyPeriodontalChart();
      expect(periodontalChartSchema.safeParse(chart).success).toBe(true);
    });

    it("accepts valid probing depths between 0 and 15 mm", () => {
      expect(siteMeasurementSchema.safeParse({ probingDepth: 0 }).success).toBe(true);
      expect(siteMeasurementSchema.safeParse({ probingDepth: 3 }).success).toBe(true);
      expect(siteMeasurementSchema.safeParse({ probingDepth: 15 }).success).toBe(true);
    });

    it("rejects negative or impossible (>15 mm) probing depths", () => {
      expect(siteMeasurementSchema.safeParse({ probingDepth: -1 }).success).toBe(false);
      expect(siteMeasurementSchema.safeParse({ probingDepth: 16 }).success).toBe(false);
    });

    it("accepts gingival margin between -10 and +10 mm", () => {
      expect(siteMeasurementSchema.safeParse({ gingivalMargin: -10 }).success).toBe(true);
      expect(siteMeasurementSchema.safeParse({ gingivalMargin: 0 }).success).toBe(true);
      expect(siteMeasurementSchema.safeParse({ gingivalMargin: 5 }).success).toBe(true);
      expect(siteMeasurementSchema.safeParse({ gingivalMargin: 10 }).success).toBe(true);
    });

    it("rejects out-of-range gingival margin values (< -10 or > +10 mm)", () => {
      expect(siteMeasurementSchema.safeParse({ gingivalMargin: -15 }).success).toBe(false);
      expect(siteMeasurementSchema.safeParse({ gingivalMargin: 12 }).success).toBe(false);
    });

    it("validates site-level bleeding on probing and suppuration flags", () => {
      const valid = siteMeasurementSchema.safeParse({
        probingDepth: 5,
        gingivalMargin: 2,
        bleedingOnProbing: true,
        suppuration: true,
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("3. Clinical Attachment Level (CAL) Calculation & Sign Conventions", () => {
    it("calculates CAL correctly when GM is positive (recession / apical to CEJ)", () => {
      // CAL = PD + GM -> 4mm PD + 2mm recession = 6mm CAL
      expect(calculateCAL(4, 2)).toBe(6);
      expect(calculateCAL(6, 3)).toBe(9);
    });

    it("calculates CAL correctly when GM is zero (margin at CEJ)", () => {
      // CAL = PD + 0 -> 3mm PD + 0mm GM = 3mm CAL
      expect(calculateCAL(3, 0)).toBe(3);
      expect(calculateCAL(5, 0)).toBe(5);
    });

    it("calculates CAL correctly when GM is negative (gingival enlargement / pseudopocket)", () => {
      // CAL = PD + (-GM) -> 5mm PD + (-2mm enlargement) = 3mm CAL
      expect(calculateCAL(5, -2)).toBe(3);
      expect(calculateCAL(6, -3)).toBe(3);
    });

    it("returns null when either PD or GM is unrecorded (never default to zero)", () => {
      expect(calculateCAL(null, 2)).toBeNull();
      expect(calculateCAL(undefined, 2)).toBeNull();
      expect(calculateCAL(4, null)).toBeNull();
      expect(calculateCAL(4, undefined)).toBeNull();
      expect(calculateCAL(null, null)).toBeNull();
    });

    it("clamps CAL to zero if negative attachment loss is mathematically computed", () => {
      // E.g. 2mm sulcus with -3mm enlargement does not create negative attachment loss
      expect(calculateCAL(2, -3)).toBe(0);
    });

    it("formats display strings accurately distinguishing unrecorded from zero", () => {
      expect(formatPD(null)).toBe("—");
      expect(formatPD(0)).toBe("0 mm");
      expect(formatPD(4)).toBe("4 mm");

      expect(formatGM(null)).toBe("—");
      expect(formatGM(0)).toBe("0 mm (CEJ)");
      expect(formatGM(3)).toBe("+3 mm (REC)");
      expect(formatGM(-2)).toBe("-2 mm (COR)");

      expect(formatCAL(null)).toBe("—");
      expect(formatCAL(0)).toBe("0 mm");
      expect(formatCAL(5)).toBe("5 mm");
    });
  });

  describe("4. Missing Teeth and Excluded Sites Handling", () => {
    it("does not treat missing teeth as 0 mm probing depth", () => {
      const tooth = createEmptyToothPerioRecord("1");
      tooth.isMissing = true;

      const chart: PeriodontalChartData = {
        teeth: { "1": tooth },
      };

      const summary = calculatePeriodontalSummary(chart);
      expect(summary.totalTeethMissing).toBe(1);
      expect(summary.totalTeethPresent).toBe(0);
      expect(summary.totalProbedTeeth).toBe(0);
      expect(summary.totalRecordedSites).toBe(0);
      expect(summary.maxProbingDepthMm).toBeNull();
    });

    it("distinguishes unrecorded sites from 0mm probing measurements", () => {
      const tooth = createEmptyToothPerioRecord("19");
      // All 6 sites are unrecorded (probingDepth: null)
      const chart: PeriodontalChartData = {
        teeth: { "19": tooth },
      };
      const summary = calculatePeriodontalSummary(chart);
      expect(summary.totalRecordedSites).toBe(0);
      expect(summary.maxProbingDepthMm).toBeNull();

      // Now record one site with 0mm (valid sulcus measurement)
      tooth.sites.midbuccal = { probingDepth: 0, gingivalMargin: 0, clinicalAttachmentLevel: 0 };
      const summaryWithZero = calculatePeriodontalSummary(chart);
      expect(summaryWithZero.totalRecordedSites).toBe(1);
      expect(summaryWithZero.maxProbingDepthMm).toBe(0);
    });
  });

  describe("5. AAP/EFP 2018 Staging Thresholds and Summary Metrics", () => {
    it("categorizes probing depths into normal, mild pocket (4-5mm), and deep pocket (>=6mm)", () => {
      expect(getSiteRiskSeverity(null)).toBe("unrecorded");
      expect(getSiteRiskSeverity(2)).toBe("normal");
      expect(getSiteRiskSeverity(3)).toBe("normal");
      expect(getSiteRiskSeverity(4)).toBe("mild_pocket");
      expect(getSiteRiskSeverity(5)).toBe("mild_pocket");
      expect(getSiteRiskSeverity(6)).toBe("deep_pocket");
      expect(getSiteRiskSeverity(9)).toBe("deep_pocket");
    });

    it("computes full-mouth BOP score and flags clinical gingival inflammation (>=10%)", () => {
      const chart = createEmptyPeriodontalChart();
      // Record tooth 19 with 6 sites, 3 of which bleed
      chart.teeth["19"] = {
        ...chart.teeth["19"],
        sites: {
          distobuccal: { probingDepth: 3, bleedingOnProbing: true },
          midbuccal: { probingDepth: 2, bleedingOnProbing: false },
          mesiobuccal: { probingDepth: 3, bleedingOnProbing: true },
          distolingual: { probingDepth: 3, bleedingOnProbing: false },
          midlingual: { probingDepth: 2, bleedingOnProbing: false },
          mesiolingual: { probingDepth: 3, bleedingOnProbing: true },
        },
      };

      const summary = calculatePeriodontalSummary(chart);
      expect(summary.totalRecordedSites).toBe(6);
      expect(summary.totalBleedingSites).toBe(3);
      // 3 / 6 = 50%
      expect(summary.bleedingOnProbingPercentage).toBe(50);
    });

    it("evaluates examination completeness flag (requires >= 24 teeth probed)", () => {
      const chart = createEmptyPeriodontalChart();
      // Only 1 tooth probed
      chart.teeth["19"] = {
        ...chart.teeth["19"],
        sites: {
          distobuccal: { probingDepth: 3 },
          midbuccal: { probingDepth: 3 },
          mesiobuccal: { probingDepth: 3 },
          distolingual: { probingDepth: 3 },
          midlingual: { probingDepth: 3 },
          mesiolingual: { probingDepth: 3 },
        },
      };
      expect(calculatePeriodontalSummary(chart).isCompleteExamination).toBe(false);

      // Probe all 32 teeth with 6 sites
      for (const t of PERMANENT_TEETH) {
        chart.teeth[t.universal] = {
          ...chart.teeth[t.universal],
          sites: {
            distobuccal: { probingDepth: 2 },
            midbuccal: { probingDepth: 2 },
            mesiobuccal: { probingDepth: 2 },
            distolingual: { probingDepth: 2 },
            midlingual: { probingDepth: 2 },
            mesiolingual: { probingDepth: 2 },
          },
        };
      }
      expect(calculatePeriodontalSummary(chart).isCompleteExamination).toBe(true);
    });
  });

  describe("6. Backward Compatibility with Existing Cases & Schemas", () => {
    it("validates existing cases without periodontalChart successfully (100% backward compatible)", () => {
      const legacyCase: ClinicalCase = {
        caseInformation: { caseId: "CASE-LEGACY-01", age: 45, sex: "Female" },
        chiefComplaint: "Tooth sensitivity",
        historyOfPresentingComplaint: {
          duration: "2 weeks",
          onset: "Gradual",
          symptoms: "Mild discomfort",
          aggravatingFactors: "Cold drinks",
          relievingFactors: "None",
        },
        medicalHistory: { conditions: "", medications: "", allergies: "" },
        dentalHistory: {
          previousTreatment: "",
          previousExtractions: "",
          endodonticTreatment: "",
          prostheticTreatment: "",
          orthodonticTreatment: "",
          oralHygiene: "",
        },
        clinicalExamination: {
          toothOrRegion: "#19",
          extraoralFindings: "",
          intraoralFindings: "",
          hardTissueFindings: "",
          softTissueFindings: "",
          periodontalFindings: "3mm probing depths, no bleeding",
          pulpalFindings: "",
          percussion: "Negative",
          palpation: "Negative",
          mobility: "Grade 0",
          probing: "2-3 mm",
          vitalityTests: "Positive",
        },
        periodontalAssessment: {
          probingDepth: "Within normal limits (<=3mm)",
          bleedingOnProbing: "Absent",
        },
        radiograph: null,
      };

      const result = clinicalCaseSchema.safeParse(legacyCase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.periodontalChart).toBeUndefined();
      }
    });

    it("auto-synchronizes derived summary findings from structured periodontalChart in normalizeClinicalCase", () => {
      const chart = createEmptyPeriodontalChart();
      chart.teeth["19"] = {
        toothNumber: "19",
        fdiNumber: "36",
        mobility: "I",
        furcation: "II",
        sites: {
          distobuccal: { probingDepth: 6, gingivalMargin: 2, clinicalAttachmentLevel: 8, bleedingOnProbing: true },
          midbuccal: { probingDepth: 3, gingivalMargin: 0, clinicalAttachmentLevel: 3, bleedingOnProbing: false },
          mesiobuccal: { probingDepth: 4, gingivalMargin: 1, clinicalAttachmentLevel: 5, bleedingOnProbing: true },
          distolingual: { probingDepth: 5, gingivalMargin: 0, clinicalAttachmentLevel: 5, bleedingOnProbing: false },
          midlingual: { probingDepth: 3, gingivalMargin: 0, clinicalAttachmentLevel: 3, bleedingOnProbing: false },
          mesiolingual: { probingDepth: 4, gingivalMargin: 0, clinicalAttachmentLevel: 4, bleedingOnProbing: true },
        },
      };

      const normalized = normalizeClinicalCase(
        {
          caseId: "CASE-PERIO-01",
          age: "52",
          sex: "Male",
          complaint: "Bleeding gums and mobility on lower left molar",
          duration: "3 months",
          symptoms: "Bleeding when brushing",
          toothNumber: "19",
        },
        null,
        chart
      );

      expect(normalized.periodontalChart).toBeDefined();
      expect(normalized.periodontalAssessment?.probingDepth).toContain("Deep pocketing");
      expect(normalized.periodontalAssessment?.probingDepth).toContain("max 6mm");
      expect(normalized.periodontalAssessment?.bleedingOnProbing).toContain("50% BOP");
      expect(normalized.periodontalAssessment?.attachmentLoss).toContain("Max CAL 8mm");
      expect(normalized.periodontalAssessment?.furcation).toContain("#19");
      expect(normalized.periodontalAssessment?.periodontalMobility).toContain("#19");
    });
  });

  describe("7. Storage, Export, and Import Round-Trip Preservation", () => {
    it("persists and retrieves structured periodontalChart in local storage", () => {
      const chart = createEmptyPeriodontalChart();
      chart.teeth["30"] = {
        toothNumber: "30",
        fdiNumber: "46",
        mobility: "0",
        furcation: "0",
        sites: {
          distobuccal: { probingDepth: 4, gingivalMargin: 1, clinicalAttachmentLevel: 5, bleedingOnProbing: true },
          midbuccal: { probingDepth: 3, gingivalMargin: 0, clinicalAttachmentLevel: 3, bleedingOnProbing: false },
          mesiobuccal: { probingDepth: 3, gingivalMargin: 0, clinicalAttachmentLevel: 3, bleedingOnProbing: false },
          distolingual: { probingDepth: 3, gingivalMargin: 0, clinicalAttachmentLevel: 3, bleedingOnProbing: false },
          midlingual: { probingDepth: 2, gingivalMargin: 0, clinicalAttachmentLevel: 2, bleedingOnProbing: false },
          mesiolingual: { probingDepth: 3, gingivalMargin: 0, clinicalAttachmentLevel: 3, bleedingOnProbing: false },
        },
      };

      const caseData = normalizeClinicalCase(
        {
          caseId: "CASE-STORAGE-PERIO",
          age: "40",
          sex: "Female",
          complaint: "Routine checkup",
          duration: "1 week",
          symptoms: "None",
          toothNumber: "30",
        },
        null,
        chart
      );

      const saved = saveCase({
        id: "CASE-STORAGE-PERIO",
        caseData,
        status: "draft",
      });

      expect(saved.caseData.periodontalChart).toBeDefined();
      expect(saved.caseData.periodontalChart?.teeth["30"]?.sites?.distobuccal?.probingDepth).toBe(4);

      const retrieved = getCase("CASE-STORAGE-PERIO");
      expect(retrieved).not.toBeNull();
      expect(retrieved?.caseData.periodontalChart?.teeth["30"]?.sites?.distobuccal?.clinicalAttachmentLevel).toBe(5);
    });

    it("exports and imports periodontal charting in JSON backup bundles preserving measurements", () => {
      const chart = createEmptyPeriodontalChart();
      chart.teeth["14"] = {
        toothNumber: "14",
        fdiNumber: "26",
        furcation: "I",
        sites: {
          distobuccal: { probingDepth: 5, gingivalMargin: 2, clinicalAttachmentLevel: 7, bleedingOnProbing: true },
          midbuccal: { probingDepth: 3, gingivalMargin: 0, clinicalAttachmentLevel: 3, bleedingOnProbing: false },
          mesiobuccal: { probingDepth: 4, gingivalMargin: 0, clinicalAttachmentLevel: 4, bleedingOnProbing: false },
          distolingual: { probingDepth: 4, gingivalMargin: 0, clinicalAttachmentLevel: 4, bleedingOnProbing: false },
          midlingual: { probingDepth: 3, gingivalMargin: 0, clinicalAttachmentLevel: 3, bleedingOnProbing: false },
          mesiolingual: { probingDepth: 4, gingivalMargin: 0, clinicalAttachmentLevel: 4, bleedingOnProbing: true },
        },
      };

      const originalCase = normalizeClinicalCase(
        {
          caseId: "CASE-BACKUP-TEST",
          age: "60",
          sex: "Male",
          complaint: "Upper molar pocketing",
          duration: "6 months",
          symptoms: "Food impaction",
          toothNumber: "14",
        },
        null,
        chart
      );

      saveCase({
        id: "CASE-BACKUP-TEST",
        caseData: originalCase,
        status: "draft",
      });

      const exportBundle = exportCases(["CASE-BACKUP-TEST"]);
      expect(exportBundle).toContain("CASE-BACKUP-TEST");
      expect(exportBundle).toContain("distobuccal");

      // Clear storage
      clearCases();
      expect(getCase("CASE-BACKUP-TEST")).toBeNull();

      // Import back
      const importResult = importCasesSafely(exportBundle);
      expect(importResult.success).toBe(true);
      expect(importResult.importedCount).toBe(1);

      const restored = getCase("CASE-BACKUP-TEST");
      expect(restored).not.toBeNull();
      expect(restored?.caseData.periodontalChart?.teeth["14"]?.sites?.distobuccal?.probingDepth).toBe(5);
      expect(restored?.caseData.periodontalChart?.teeth["14"]?.furcation).toBe("I");
    });

    it("rejects corrupted or out-of-range periodontal data during import to prevent database corruption", () => {
      const malformedJson = JSON.stringify([
        {
          id: "CASE-CORRUPT-PERIO",
          caseData: {
            caseInformation: { caseId: "CASE-CORRUPT-PERIO", age: 30, sex: "Male" },
            chiefComplaint: "Pain",
            historyOfPresentingComplaint: { duration: "1 day", onset: "acute", symptoms: "sharp", aggravatingFactors: "", relievingFactors: "" },
            clinicalExamination: { toothOrRegion: "19", extraoralFindings: "", intraoralFindings: "", hardTissueFindings: "", softTissueFindings: "", periodontalFindings: "", pulpalFindings: "", percussion: "", palpation: "", mobility: "", probing: "", vitalityTests: "" },
            medicalHistory: {},
            dentalHistory: {},
            radiograph: null,
            periodontalChart: {
              teeth: {
                "19": {
                  toothNumber: "19",
                  sites: {
                    distobuccal: { probingDepth: 99 }, // IMPOSSIBLE PROBING DEPTH (>15)
                  },
                },
              },
            },
          },
        },
      ]);

      const res = importCasesSafely(malformedJson);
      expect(res.skippedCount).toBe(1);
      expect(res.errors[0].toLowerCase()).toContain("invalid periodontal charting data");
      expect(getCase("CASE-CORRUPT-PERIO")).toBeNull();
    });
  });
});
