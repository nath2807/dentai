import { describe, expect, it } from "vitest";
import {
  PERMANENT_TEETH,
  fdiToUniversal,
  findTooth,
  formatToothWithSystem,
  getTeethByArch,
  sanitizeToothInput,
  universalToFdi,
} from "./tooth-numbering";

describe("tooth-numbering library", () => {
  it("contains exactly 32 permanent teeth across two dental arches", () => {
    expect(PERMANENT_TEETH).toHaveLength(32);
    const { maxillary, mandibular } = getTeethByArch();
    expect(maxillary).toHaveLength(16);
    expect(mandibular).toHaveLength(16);
  });

  it("correctly converts Universal to FDI notation", () => {
    // Universal #19 (lower left first molar) -> FDI 36
    expect(universalToFdi("19")).toBe("36");
    expect(universalToFdi("#19")).toBe("36");
    expect(universalToFdi("Tooth 19")).toBe("36");

    // Universal #30 (lower right first molar) -> FDI 46
    expect(universalToFdi("30")).toBe("46");

    // Universal #8 (upper right central incisor) -> FDI 11
    expect(universalToFdi("8")).toBe("11");

    // Universal #9 (upper left central incisor) -> FDI 21
    expect(universalToFdi("9")).toBe("21");

    // Invalid tooth
    expect(universalToFdi("99")).toBeNull();
  });

  it("correctly converts FDI to Universal notation", () => {
    // FDI 36 -> Universal 19
    expect(fdiToUniversal("36")).toBe("19");
    expect(fdiToUniversal("FDI 36")).toBe("19");

    // FDI 46 -> Universal 30
    expect(fdiToUniversal("46")).toBe("30");

    // FDI 11 -> Universal 8
    expect(fdiToUniversal("11")).toBe("8");

    // FDI 21 -> Universal 9
    expect(fdiToUniversal("21")).toBe("9");

    // Invalid FDI
    expect(fdiToUniversal("99")).toBeNull();
  });

  it("resolves tooth details and anatomy from query", () => {
    const tooth19 = findTooth("19");
    expect(tooth19).not.toBeNull();
    expect(tooth19?.universal).toBe("19");
    expect(tooth19?.fdi).toBe("36");
    expect(tooth19?.arch).toBe("mandibular");
    expect(tooth19?.quadrant).toBe("lower_left");
    expect(tooth19?.region).toBe("molar");
    expect(tooth19?.name).toBe("Mandibular Left 1st Molar");

    // Resolve by FDI
    const toothFromFdi = findTooth("46");
    expect(toothFromFdi?.universal).toBe("30");
    expect(toothFromFdi?.arch).toBe("mandibular");
    expect(toothFromFdi?.quadrant).toBe("lower_right");
  });

  it("formats tooth strings with both Universal and FDI notations", () => {
    const formatted19 = formatToothWithSystem("19");
    expect(formatted19).toContain("#19 (FDI 36)");
    expect(formatted19).toContain("Mandibular Left 1st Molar");

    const fallback = formatToothWithSystem("unlisted");
    expect(fallback).toBe("Tooth unlisted");
  });

  it("sanitizes prefixes like #, Tooth, FDI, UNS", () => {
    expect(sanitizeToothInput("  #19  ")).toBe("19");
    expect(sanitizeToothInput("Tooth 30")).toBe("30");
    expect(sanitizeToothInput("fdi 36")).toBe("36");
    expect(sanitizeToothInput("")).toBe("");
  });
});
