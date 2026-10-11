/**
 * Tooth Numbering Systems Utility
 *
 * Supports:
 * - Universal Numbering System (UNS): 1-32 (permanent), A-T (deciduous)
 * - FDI World Dental Federation Two-Digit System (ISO 3950): 11-48 (permanent), 51-85 (deciduous)
 * - Clinical anatomical tooth names, arch, quadrant, and region classification.
 */

export type ToothArch = "maxillary" | "mandibular";
export type ToothQuadrant = "upper_right" | "upper_left" | "lower_left" | "lower_right";
export type ToothRegion = "anterior" | "premolar" | "molar";

export interface ToothInfo {
  universal: string;
  fdi: string;
  palmer: string;
  name: string;
  arch: ToothArch;
  quadrant: ToothQuadrant;
  region: ToothRegion;
  quadrantLabel: string;
  isPrimary: boolean;
}

// Complete permanent adult dentition (32 teeth)
export const PERMANENT_TEETH: ToothInfo[] = [
  // Upper Right (Quadrant 1 in FDI, teeth 1-8 in Universal)
  { universal: "1", fdi: "18", palmer: "8┘", name: "Maxillary Right 3rd Molar (Wisdom)", arch: "maxillary", quadrant: "upper_right", region: "molar", quadrantLabel: "Upper Right (Maxillary)", isPrimary: false },
  { universal: "2", fdi: "17", palmer: "7┘", name: "Maxillary Right 2nd Molar", arch: "maxillary", quadrant: "upper_right", region: "molar", quadrantLabel: "Upper Right (Maxillary)", isPrimary: false },
  { universal: "3", fdi: "16", palmer: "6┘", name: "Maxillary Right 1st Molar", arch: "maxillary", quadrant: "upper_right", region: "molar", quadrantLabel: "Upper Right (Maxillary)", isPrimary: false },
  { universal: "4", fdi: "15", palmer: "5┘", name: "Maxillary Right 2nd Premolar", arch: "maxillary", quadrant: "upper_right", region: "premolar", quadrantLabel: "Upper Right (Maxillary)", isPrimary: false },
  { universal: "5", fdi: "14", palmer: "4┘", name: "Maxillary Right 1st Premolar", arch: "maxillary", quadrant: "upper_right", region: "premolar", quadrantLabel: "Upper Right (Maxillary)", isPrimary: false },
  { universal: "6", fdi: "13", palmer: "3┘", name: "Maxillary Right Canine (Cuspid)", arch: "maxillary", quadrant: "upper_right", region: "anterior", quadrantLabel: "Upper Right (Maxillary)", isPrimary: false },
  { universal: "7", fdi: "12", palmer: "2┘", name: "Maxillary Right Lateral Incisor", arch: "maxillary", quadrant: "upper_right", region: "anterior", quadrantLabel: "Upper Right (Maxillary)", isPrimary: false },
  { universal: "8", fdi: "11", palmer: "1┘", name: "Maxillary Right Central Incisor", arch: "maxillary", quadrant: "upper_right", region: "anterior", quadrantLabel: "Upper Right (Maxillary)", isPrimary: false },

  // Upper Left (Quadrant 2 in FDI, teeth 9-16 in Universal)
  { universal: "9", fdi: "21", palmer: "└1", name: "Maxillary Left Central Incisor", arch: "maxillary", quadrant: "upper_left", region: "anterior", quadrantLabel: "Upper Left (Maxillary)", isPrimary: false },
  { universal: "10", fdi: "22", palmer: "└2", name: "Maxillary Left Lateral Incisor", arch: "maxillary", quadrant: "upper_left", region: "anterior", quadrantLabel: "Upper Left (Maxillary)", isPrimary: false },
  { universal: "11", fdi: "23", palmer: "└3", name: "Maxillary Left Canine (Cuspid)", arch: "maxillary", quadrant: "upper_left", region: "anterior", quadrantLabel: "Upper Left (Maxillary)", isPrimary: false },
  { universal: "12", fdi: "24", palmer: "└4", name: "Maxillary Left 1st Premolar", arch: "maxillary", quadrant: "upper_left", region: "premolar", quadrantLabel: "Upper Left (Maxillary)", isPrimary: false },
  { universal: "13", fdi: "25", palmer: "└5", name: "Maxillary Left 2nd Premolar", arch: "maxillary", quadrant: "upper_left", region: "premolar", quadrantLabel: "Upper Left (Maxillary)", isPrimary: false },
  { universal: "14", fdi: "26", palmer: "└6", name: "Maxillary Left 1st Molar", arch: "maxillary", quadrant: "upper_left", region: "molar", quadrantLabel: "Upper Left (Maxillary)", isPrimary: false },
  { universal: "15", fdi: "27", palmer: "└7", name: "Maxillary Left 2nd Molar", arch: "maxillary", quadrant: "upper_left", region: "molar", quadrantLabel: "Upper Left (Maxillary)", isPrimary: false },
  { universal: "16", fdi: "28", palmer: "└8", name: "Maxillary Left 3rd Molar (Wisdom)", arch: "maxillary", quadrant: "upper_left", region: "molar", quadrantLabel: "Upper Left (Maxillary)", isPrimary: false },

  // Lower Left (Quadrant 3 in FDI, teeth 17-24 in Universal)
  { universal: "17", fdi: "38", palmer: "┌8", name: "Mandibular Left 3rd Molar (Wisdom)", arch: "mandibular", quadrant: "lower_left", region: "molar", quadrantLabel: "Lower Left (Mandibular)", isPrimary: false },
  { universal: "18", fdi: "37", palmer: "┌7", name: "Mandibular Left 2nd Molar", arch: "mandibular", quadrant: "lower_left", region: "molar", quadrantLabel: "Lower Left (Mandibular)", isPrimary: false },
  { universal: "19", fdi: "36", palmer: "┌6", name: "Mandibular Left 1st Molar", arch: "mandibular", quadrant: "lower_left", region: "molar", quadrantLabel: "Lower Left (Mandibular)", isPrimary: false },
  { universal: "20", fdi: "35", palmer: "┌5", name: "Mandibular Left 2nd Premolar", arch: "mandibular", quadrant: "lower_left", region: "premolar", quadrantLabel: "Lower Left (Mandibular)", isPrimary: false },
  { universal: "21", fdi: "34", palmer: "┌4", name: "Mandibular Left 1st Premolar", arch: "mandibular", quadrant: "lower_left", region: "premolar", quadrantLabel: "Lower Left (Mandibular)", isPrimary: false },
  { universal: "22", fdi: "33", palmer: "┌3", name: "Mandibular Left Canine (Cuspid)", arch: "mandibular", quadrant: "lower_left", region: "anterior", quadrantLabel: "Lower Left (Mandibular)", isPrimary: false },
  { universal: "23", fdi: "32", palmer: "┌2", name: "Mandibular Left Lateral Incisor", arch: "mandibular", quadrant: "lower_left", region: "anterior", quadrantLabel: "Lower Left (Mandibular)", isPrimary: false },
  { universal: "24", fdi: "31", palmer: "┌1", name: "Mandibular Left Central Incisor", arch: "mandibular", quadrant: "lower_left", region: "anterior", quadrantLabel: "Lower Left (Mandibular)", isPrimary: false },

  // Lower Right (Quadrant 4 in FDI, teeth 25-32 in Universal)
  { universal: "25", fdi: "41", palmer: "1┐", name: "Mandibular Right Central Incisor", arch: "mandibular", quadrant: "lower_right", region: "anterior", quadrantLabel: "Lower Right (Mandibular)", isPrimary: false },
  { universal: "26", fdi: "42", palmer: "2┐", name: "Mandibular Right Lateral Incisor", arch: "mandibular", quadrant: "lower_right", region: "anterior", quadrantLabel: "Lower Right (Mandibular)", isPrimary: false },
  { universal: "27", fdi: "43", palmer: "3┐", name: "Mandibular Right Canine (Cuspid)", arch: "mandibular", quadrant: "lower_right", region: "anterior", quadrantLabel: "Lower Right (Mandibular)", isPrimary: false },
  { universal: "28", fdi: "44", palmer: "4┐", name: "Mandibular Right 1st Premolar", arch: "mandibular", quadrant: "lower_right", region: "premolar", quadrantLabel: "Lower Right (Mandibular)", isPrimary: false },
  { universal: "29", fdi: "45", palmer: "5┐", name: "Mandibular Right 2nd Premolar", arch: "mandibular", quadrant: "lower_right", region: "premolar", quadrantLabel: "Lower Right (Mandibular)", isPrimary: false },
  { universal: "30", fdi: "46", palmer: "6┐", name: "Mandibular Right 1st Molar", arch: "mandibular", quadrant: "lower_right", region: "molar", quadrantLabel: "Lower Right (Mandibular)", isPrimary: false },
  { universal: "31", fdi: "47", palmer: "7┐", name: "Mandibular Right 2nd Molar", arch: "mandibular", quadrant: "lower_right", region: "molar", quadrantLabel: "Lower Right (Mandibular)", isPrimary: false },
  { universal: "32", fdi: "48", palmer: "8┐", name: "Mandibular Right 3rd Molar (Wisdom)", arch: "mandibular", quadrant: "lower_right", region: "molar", quadrantLabel: "Lower Right (Mandibular)", isPrimary: false },
];

/**
 * Clean a tooth input string (e.g. "#19", "Tooth 19", "19", "T-19", "FDI 36")
 */
export function sanitizeToothInput(input: string): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/^#+/, "")
    .replace(/^tooth\s*/i, "")
    .replace(/^fdi\s*/i, "")
    .replace(/^uns\s*/i, "")
    .trim();
}

/**
 * Resolve a tooth query by either Universal, FDI, or name
 */
export function findTooth(query: string): ToothInfo | null {
  const cleaned = sanitizeToothInput(query);
  if (!cleaned) return null;

  // Direct match Universal
  const byUniversal = PERMANENT_TEETH.find((t) => t.universal === cleaned);
  if (byUniversal) return byUniversal;

  // Direct match FDI
  const byFdi = PERMANENT_TEETH.find((t) => t.fdi === cleaned);
  if (byFdi) return byFdi;

  // Case-insensitive name match
  const lower = cleaned.toLowerCase();
  const byName = PERMANENT_TEETH.find((t) => t.name.toLowerCase().includes(lower));
  if (byName) return byName;

  return null;
}

/**
 * Format a tooth with both Universal and FDI notations
 * e.g. "#19 (FDI 36) - Mandibular Left 1st Molar"
 */
export function formatToothWithSystem(toothInput: string): string {
  const tooth = findTooth(toothInput);
  if (!tooth) return toothInput ? `Tooth ${toothInput}` : "Not specified";
  return `#${tooth.universal} (FDI ${tooth.fdi}) — ${tooth.name}`;
}

/**
 * Convert Universal to FDI
 */
export function universalToFdi(universal: string): string | null {
  const tooth = PERMANENT_TEETH.find((t) => t.universal === sanitizeToothInput(universal));
  return tooth ? tooth.fdi : null;
}

/**
 * Convert FDI to Universal
 */
export function fdiToUniversal(fdi: string): string | null {
  const tooth = PERMANENT_TEETH.find((t) => t.fdi === sanitizeToothInput(fdi));
  return tooth ? tooth.universal : null;
}

/**
 * Group teeth by dental arch for interactive tooth chart display
 */
export function getTeethByArch(): {
  maxillary: ToothInfo[];
  mandibular: ToothInfo[];
} {
  return {
    maxillary: PERMANENT_TEETH.filter((t) => t.arch === "maxillary"),
    mandibular: PERMANENT_TEETH.filter((t) => t.arch === "mandibular"),
  };
}
