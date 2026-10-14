"use client";

import { useState } from "react";
import {
  ToothInfo,
  findTooth,
  getOdontogramQuadrants,
} from "@/lib/tooth-numbering";

interface ToothChartProps {
  selectedToothNumber?: string;
  onSelectTooth: (tooth: ToothInfo | null) => void;
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

  const { upperRight, upperLeft, lowerRight, lowerLeft } =
    getOdontogramQuadrants();

  function handleToothClick(tooth: ToothInfo) {
    if (activeTooth?.universal === tooth.universal) {
      onSelectTooth(null);
    } else {
      onSelectTooth(tooth);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, tooth: ToothInfo) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToothClick(tooth);
    }
  }

  const inspectedTooth = hoveredTooth || activeTooth;

  return (
    <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-lg">
      {/* Header with System Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-teal-600 shadow-[0_0_8px_rgba(13,148,136,0.6)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Interactive Odontogram &amp; Dental Arch Selector
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Anatomically aligned 4-quadrant dental chart (facing patient). Click to select or deselect a tooth.
          </p>
        </div>

        {/* iOS-Style Sliding Segmented Control */}
        <div className="flex items-center gap-2">
          <div className="glass-segmented-control flex items-center shadow-xs">
            <button
              type="button"
              onClick={() => setNumberingSystem("universal")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                numberingSystem === "universal"
                  ? "bg-white text-teal-950 shadow-sm border border-white/80 ring-1 ring-slate-900/5"
                  : "text-slate-600 hover:text-slate-950 font-medium"
              }`}
              aria-pressed={numberingSystem === "universal"}
            >
              Universal (#1–32)
            </button>
            <button
              type="button"
              onClick={() => setNumberingSystem("fdi")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                numberingSystem === "fdi"
                  ? "bg-white text-teal-950 shadow-sm border border-white/80 ring-1 ring-slate-900/5"
                  : "text-slate-600 hover:text-slate-950 font-medium"
              }`}
              aria-pressed={numberingSystem === "fdi"}
            >
              FDI / ISO (11–48)
            </button>
          </div>
        </div>
      </div>

      {/* Selected Tooth Live Inspection Pill */}
      {inspectedTooth ? (
        <div className="glass-card-subtle glass-tint-teal mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl px-4 py-2.5 text-xs text-teal-950 border border-teal-300/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-teal-600" />
            <span className="font-bold text-teal-900">
              {hoveredTooth ? "Inspecting:" : "Selected:"}
            </span>
            <span className="font-extrabold text-slate-950">
              {inspectedTooth.name}
            </span>
          </div>
          <div className="flex items-center gap-3.5 text-[11px] font-semibold text-teal-900">
            <span className="glass-pill px-2.5 py-0.5 bg-white/80 border border-teal-200">UNS: #{inspectedTooth.universal}</span>
            <span className="glass-pill px-2.5 py-0.5 bg-white/80 border border-teal-200">FDI: {inspectedTooth.fdi}</span>
            <span className="capitalize text-teal-800">{inspectedTooth.region}</span>
            {activeTooth && (
              <button
                type="button"
                onClick={() => onSelectTooth(null)}
                className="glass-button ml-2 rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-[10px] font-bold text-teal-800 hover:bg-teal-50 transition shadow-xs"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card-subtle mt-3.5 flex items-center justify-between rounded-xl px-4 py-2 text-xs text-slate-500 border border-slate-200/70 shadow-xs">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>Click any tooth to assign to this clinical case record.</span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium">No tooth currently selected</span>
        </div>
      )}

      {/* Anatomical 4-Quadrant Odontogram */}
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="min-w-[620px] space-y-3">
          {/* Maxillary (Upper) Arch */}
          <div>
            <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span className="text-teal-900">Quadrant 1 (Upper Right / UR)</span>
              <span className="text-teal-800 font-semibold">MAXILLARY ARCH (UPPER)</span>
              <span className="text-teal-900">Quadrant 2 (Upper Left / UL)</span>
            </div>

            <div className="mt-1 flex items-center justify-center gap-2">
              {/* Q1: Upper Right (#1..#8, FDI 18..11) */}
              <div className="flex items-center gap-1 sm:gap-1.5 border-r-2 border-dashed border-teal-300 pr-2">
                {upperRight.map((tooth) => {
                  const isSelected = activeTooth?.universal === tooth.universal;
                  const displayLabel =
                    numberingSystem === "universal" ? tooth.universal : tooth.fdi;

                  return (
                      <button
                        key={tooth.universal}
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToothClick(tooth)}
                        onKeyDown={(e) => handleKeyDown(e, tooth)}
                        onMouseEnter={() => setHoveredTooth(tooth)}
                        onMouseLeave={() => setHoveredTooth(null)}
                        title={`${tooth.name} (UNS #${tooth.universal}, FDI ${tooth.fdi})`}
                        className={`group relative flex ${
                          compact ? "h-9 w-7.5 sm:h-10 sm:w-8.5" : "h-11 w-8 sm:h-12 sm:w-9.5"
                        } flex-col items-center justify-center rounded-xl border text-xs font-extrabold transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          isSelected
                            ? "border-teal-700 bg-teal-700 text-white shadow-md ring-2 ring-teal-500 ring-offset-2 ring-offset-white scale-110 z-20 shadow-[0_0_18px_rgba(13,148,136,0.4)]"
                            : "border-white/80 bg-white/80 text-slate-900 backdrop-blur-md shadow-xs hover:border-teal-400 hover:bg-teal-50/90 hover:text-teal-950 hover:scale-110 hover:z-20 hover:shadow-md"
                        }`}
                        aria-label={`${tooth.name}, Number ${displayLabel}`}
                        aria-pressed={isSelected}
                      >
                        <span className={`text-[9px] uppercase font-bold ${isSelected ? "text-teal-100" : "text-slate-400"}`}>
                          {tooth.region === "molar"
                            ? "M"
                            : tooth.region === "premolar"
                            ? "P"
                            : "A"}
                        </span>
                        <span className="text-xs font-black">{displayLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Q2: Upper Left (#9..#16, FDI 21..28) */}
                <div className="flex items-center gap-1 sm:gap-1.5 pl-0.5">
                  {upperLeft.map((tooth) => {
                    const isSelected = activeTooth?.universal === tooth.universal;
                    const displayLabel =
                      numberingSystem === "universal" ? tooth.universal : tooth.fdi;

                    return (
                      <button
                        key={tooth.universal}
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToothClick(tooth)}
                        onKeyDown={(e) => handleKeyDown(e, tooth)}
                        onMouseEnter={() => setHoveredTooth(tooth)}
                        onMouseLeave={() => setHoveredTooth(null)}
                        title={`${tooth.name} (UNS #${tooth.universal}, FDI ${tooth.fdi})`}
                        className={`group relative flex ${
                          compact ? "h-9 w-7.5 sm:h-10 sm:w-8.5" : "h-11 w-8 sm:h-12 sm:w-9.5"
                        } flex-col items-center justify-center rounded-xl border text-xs font-extrabold transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          isSelected
                            ? "border-teal-700 bg-teal-700 text-white shadow-md ring-2 ring-teal-500 ring-offset-2 ring-offset-white scale-110 z-20 shadow-[0_0_18px_rgba(13,148,136,0.4)]"
                            : "border-white/80 bg-white/80 text-slate-900 backdrop-blur-md shadow-xs hover:border-teal-400 hover:bg-teal-50/90 hover:text-teal-950 hover:scale-110 hover:z-20 hover:shadow-md"
                        }`}
                        aria-label={`${tooth.name}, Number ${displayLabel}`}
                        aria-pressed={isSelected}
                      >
                        <span className={`text-[9px] uppercase font-bold ${isSelected ? "text-teal-100" : "text-slate-400"}`}>
                          {tooth.region === "molar"
                            ? "M"
                            : tooth.region === "premolar"
                            ? "P"
                            : "A"}
                        </span>
                        <span className="text-xs font-black">{displayLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Occlusal Plane / Midline Divider */}
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-teal-300/60" />
              </div>
              <span className="relative rounded-full border border-teal-200/80 bg-white/90 px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal-900 shadow-xs backdrop-blur-md">
                Occlusal Plane &bull; Dental Midline
              </span>
            </div>

            {/* Mandibular (Lower) Arch */}
            <div>
              <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span className="text-teal-900">Quadrant 4 (Lower Right / LR)</span>
                <span className="text-teal-800 font-semibold">MANDIBULAR ARCH (LOWER)</span>
                <span className="text-teal-900">Quadrant 3 (Lower Left / LL)</span>
              </div>

              <div className="mt-1.5 flex items-center justify-center gap-2">
                {/* Q4: Lower Right (#32..#25, FDI 48..41) - anatomically opposing Upper Right */}
                <div className="flex items-center gap-1 sm:gap-1.5 border-r-2 border-dashed border-teal-300 pr-2">
                  {lowerRight.map((tooth) => {
                    const isSelected = activeTooth?.universal === tooth.universal;
                    const displayLabel =
                      numberingSystem === "universal" ? tooth.universal : tooth.fdi;

                    return (
                      <button
                        key={tooth.universal}
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToothClick(tooth)}
                        onKeyDown={(e) => handleKeyDown(e, tooth)}
                        onMouseEnter={() => setHoveredTooth(tooth)}
                        onMouseLeave={() => setHoveredTooth(null)}
                        title={`${tooth.name} (UNS #${tooth.universal}, FDI ${tooth.fdi})`}
                        className={`group relative flex ${
                          compact ? "h-9 w-7.5 sm:h-10 sm:w-8.5" : "h-11 w-8 sm:h-12 sm:w-9.5"
                        } flex-col items-center justify-center rounded-xl border text-xs font-extrabold transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          isSelected
                            ? "border-teal-700 bg-teal-700 text-white shadow-md ring-2 ring-teal-500 ring-offset-2 ring-offset-white scale-110 z-20 shadow-[0_0_18px_rgba(13,148,136,0.4)]"
                            : "border-white/80 bg-white/80 text-slate-900 backdrop-blur-md shadow-xs hover:border-teal-400 hover:bg-teal-50/90 hover:text-teal-950 hover:scale-110 hover:z-20 hover:shadow-md"
                        }`}
                        aria-label={`${tooth.name}, Number ${displayLabel}`}
                        aria-pressed={isSelected}
                      >
                        <span className="text-xs font-black">{displayLabel}</span>
                        <span className={`text-[9px] uppercase font-bold ${isSelected ? "text-teal-100" : "text-slate-400"}`}>
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

                {/* Q3: Lower Left (#24..#17, FDI 31..38) - anatomically opposing Upper Left */}
                <div className="flex items-center gap-1 sm:gap-1.5 pl-0.5">
                  {lowerLeft.map((tooth) => {
                    const isSelected = activeTooth?.universal === tooth.universal;
                    const displayLabel =
                      numberingSystem === "universal" ? tooth.universal : tooth.fdi;

                    return (
                      <button
                        key={tooth.universal}
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToothClick(tooth)}
                        onKeyDown={(e) => handleKeyDown(e, tooth)}
                        onMouseEnter={() => setHoveredTooth(tooth)}
                        onMouseLeave={() => setHoveredTooth(null)}
                        title={`${tooth.name} (UNS #${tooth.universal}, FDI ${tooth.fdi})`}
                        className={`group relative flex ${
                          compact ? "h-9 w-7.5 sm:h-10 sm:w-8.5" : "h-11 w-8 sm:h-12 sm:w-9.5"
                        } flex-col items-center justify-center rounded-xl border text-xs font-extrabold transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          isSelected
                            ? "border-teal-700 bg-teal-700 text-white shadow-md ring-2 ring-teal-500 ring-offset-2 ring-offset-white scale-110 z-20 shadow-[0_0_18px_rgba(13,148,136,0.4)]"
                            : "border-white/80 bg-white/80 text-slate-900 backdrop-blur-md shadow-xs hover:border-teal-400 hover:bg-teal-50/90 hover:text-teal-950 hover:scale-110 hover:z-20 hover:shadow-md"
                        }`}
                        aria-label={`${tooth.name}, Number ${displayLabel}`}
                        aria-pressed={isSelected}
                      >
                        <span className="text-xs font-black">{displayLabel}</span>
                        <span className={`text-[9px] uppercase font-bold ${isSelected ? "text-teal-100" : "text-slate-400"}`}>
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
        </div>

      {/* Anatomical Region Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/80 pt-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-600">Region Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            <span>A = Anterior (Incisor / Canine)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
            <span>P = Premolar (Bicuspid)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-teal-600" />
            <span>M = Molar</span>
          </span>
        </div>
        <span className="text-slate-400 text-[10px]">
          Orientation: Facing patient (Viewer Left = Patient Right)
        </span>
      </div>
    </div>
  );
}
