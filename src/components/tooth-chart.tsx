"use client";

import { useState } from "react";
import {
  ToothInfo,
  findTooth,
  getTeethByArch,
} from "@/lib/tooth-numbering";

interface ToothChartProps {
  selectedToothNumber?: string;
  onSelectTooth: (tooth: ToothInfo) => void;
  compact?: boolean;
}

export function ToothChart({
  selectedToothNumber,
  onSelectTooth,
  compact = false,
}: ToothChartProps) {
  const [numberingSystem, setNumberingSystem] = useState<"universal" | "fdi">(
    "universal"
  );
  const [hoveredTooth, setHoveredTooth] = useState<ToothInfo | null>(null);

  const activeTooth = selectedToothNumber
    ? findTooth(selectedToothNumber)
    : null;
  const { maxillary, mandibular } = getTeethByArch();

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-5">
      {/* Header with System Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Interactive Dental Arch &amp; Tooth Selector
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Click any tooth to auto-populate tooth number, dental arch, quadrant, and anatomical region.
          </p>
        </div>

        {/* System Toggle Buttons */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setNumberingSystem("universal")}
            className={`rounded-md px-2.5 py-1 font-semibold transition ${
              numberingSystem === "universal"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            aria-pressed={numberingSystem === "universal"}
          >
            Universal (#1–32)
          </button>
          <button
            type="button"
            onClick={() => setNumberingSystem("fdi")}
            className={`rounded-md px-2.5 py-1 font-semibold transition ${
              numberingSystem === "fdi"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            aria-pressed={numberingSystem === "fdi"}
          >
            FDI / ISO (11–48)
          </button>
        </div>
      </div>

      {/* Selected Tooth Live Inspection Pill */}
      {(hoveredTooth || activeTooth) && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-teal-50/80 px-3 py-2 text-xs text-teal-950 border border-teal-200/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-teal-800">
              {hoveredTooth ? "Inspecting:" : "Selected:"}
            </span>
            <span className="font-semibold">
              {(hoveredTooth || activeTooth)?.name}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-teal-800">
            <span>
              UNS: #{(hoveredTooth || activeTooth)?.universal}
            </span>
            <span>
              FDI: {(hoveredTooth || activeTooth)?.fdi}
            </span>
            <span className="capitalize">
              {(hoveredTooth || activeTooth)?.region}
            </span>
          </div>
        </div>
      )}

      {/* Dental Arches Representation */}
      <div className="mt-4 space-y-4">
        {/* Maxillary (Upper) Arch */}
        <div>
          <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Patient Right (Maxillary UR)</span>
            <span className="text-teal-800 font-semibold">Maxillary Arch (Upper)</span>
            <span>Patient Left (Maxillary UL)</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
            {maxillary.map((tooth) => {
              const isSelected =
                activeTooth?.universal === tooth.universal;
              const displayLabel =
                numberingSystem === "universal" ? tooth.universal : tooth.fdi;

              return (
                <button
                  key={tooth.universal}
                  type="button"
                  onClick={() => onSelectTooth(tooth)}
                  onMouseEnter={() => setHoveredTooth(tooth)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  title={`${tooth.name} (UNS #${tooth.universal}, FDI ${tooth.fdi})`}
                  className={`group relative flex ${
                    compact ? "h-8 w-7 sm:h-9 sm:w-8" : "h-10 w-8 sm:h-11 sm:w-9"
                  } flex-col items-center justify-center rounded-lg border text-xs font-bold transition ${
                    isSelected
                      ? "border-teal-700 bg-teal-700 text-white shadow-sm ring-2 ring-teal-600/30 ring-offset-1"
                      : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-teal-400 hover:bg-teal-50/60 hover:text-teal-900"
                  }`}
                  aria-label={`${tooth.name}, Number ${displayLabel}`}
                  aria-pressed={isSelected}
                >
                  <span className="text-[9px] uppercase opacity-60">
                    {tooth.region === "molar"
                      ? "M"
                      : tooth.region === "premolar"
                      ? "P"
                      : "A"}
                  </span>
                  <span className="text-xs font-bold">{displayLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Midline Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Occlusal Plane / Midline
          </span>
        </div>

        {/* Mandibular (Lower) Arch */}
        <div>
          <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Patient Right (Mandibular LR)</span>
            <span className="text-teal-800 font-semibold">Mandibular Arch (Lower)</span>
            <span>Patient Left (Mandibular LL)</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
            {mandibular.map((tooth) => {
              const isSelected =
                activeTooth?.universal === tooth.universal;
              const displayLabel =
                numberingSystem === "universal" ? tooth.universal : tooth.fdi;

              return (
                <button
                  key={tooth.universal}
                  type="button"
                  onClick={() => onSelectTooth(tooth)}
                  onMouseEnter={() => setHoveredTooth(tooth)}
                  onMouseLeave={() => setHoveredTooth(null)}
                  title={`${tooth.name} (UNS #${tooth.universal}, FDI ${tooth.fdi})`}
                  className={`group relative flex ${
                    compact ? "h-8 w-7 sm:h-9 sm:w-8" : "h-10 w-8 sm:h-11 sm:w-9"
                  } flex-col items-center justify-center rounded-lg border text-xs font-bold transition ${
                    isSelected
                      ? "border-teal-700 bg-teal-700 text-white shadow-sm ring-2 ring-teal-600/30 ring-offset-1"
                      : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-teal-400 hover:bg-teal-50/60 hover:text-teal-900"
                  }`}
                  aria-label={`${tooth.name}, Number ${displayLabel}`}
                  aria-pressed={isSelected}
                >
                  <span className="text-xs font-bold">{displayLabel}</span>
                  <span className="text-[9px] uppercase opacity-60">
                    {tooth.region === "molar"
                      ? "M"
                      : tooth.region === "premolar"
                      ? "P"
                      : "A"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
