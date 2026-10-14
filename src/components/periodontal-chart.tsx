"use client";

import React, { useState } from "react";
import {
  PERMANENT_TEETH,
  findTooth,
  universalToFdi,
} from "@/lib/tooth-numbering";
import {
  type PeriodontalChartData,
  type ToothPerioRecord,
  type SiteMeasurement,
  type PerioSiteKey,
  BUCCAL_SITE_KEYS,
  LINGUAL_SITE_KEYS,
  SITE_LABELS,
  MIN_PROBING_DEPTH_MM,
  MAX_PROBING_DEPTH_MM,
  MIN_GINGIVAL_MARGIN_MM,
  MAX_GINGIVAL_MARGIN_MM,
  calculateCAL,
  calculatePeriodontalSummary,
  createEmptyToothPerioRecord,
  createEmptySiteMeasurement,
  formatCAL,
  getSiteRiskSeverity,
  isMultiRootedTooth,
} from "@/lib/periodontal-types";
import { Icon } from "./clinical-ui";

interface PeriodontalChartProps {
  chartData?: PeriodontalChartData | null;
  onChange?: (updated: PeriodontalChartData) => void;
  readOnly?: boolean;
  initialSelectedTooth?: string;
}

export function PeriodontalChart({
  chartData,
  onChange,
  readOnly = false,
  initialSelectedTooth = "19",
}: PeriodontalChartProps) {
  // Local working state ensuring full 32 teeth exist
  const [activeToothNumber, setActiveToothNumber] = useState<string>(
    initialSelectedTooth || "19"
  );
  const [activeArchTab, setActiveArchTab] = useState<"both" | "maxillary" | "mandibular">("both");
  const [viewMode, setViewMode] = useState<"compact" | "full" | "summary">("compact");

  // Get current record or initialize a fresh one
  const teethRecords: Record<string, ToothPerioRecord> = chartData?.teeth || {};
  const currentToothRecord: ToothPerioRecord =
    teethRecords[activeToothNumber] || createEmptyToothPerioRecord(activeToothNumber);

  const toothInfo = findTooth(activeToothNumber);
  const summary = calculatePeriodontalSummary(chartData);

  function updateToothRecord(updatedRecord: ToothPerioRecord) {
    if (readOnly || !onChange) return;
    const nextTeeth = {
      ...teethRecords,
      [updatedRecord.toothNumber]: updatedRecord,
    };
    onChange({
      examDate: chartData?.examDate || new Date().toISOString().split("T")[0],
      examiner: chartData?.examiner || "",
      notes: chartData?.notes || "",
      teeth: nextTeeth,
    });
  }

  function handleSiteChange(
    siteKey: PerioSiteKey,
    field: keyof SiteMeasurement,
    val: unknown
  ) {
    if (readOnly) return;
    const existingSite = currentToothRecord.sites?.[siteKey] || createEmptySiteMeasurement();
    const updatedSite: SiteMeasurement = {
      ...existingSite,
      [field]: val,
    };

    // Recalculate CAL whenever PD or GM changes
    if (field === "probingDepth" || field === "gingivalMargin") {
      const nextPd = field === "probingDepth" ? (val as number | null) : existingSite.probingDepth;
      const nextGm = field === "gingivalMargin" ? (val as number | null) : existingSite.gingivalMargin;
      updatedSite.clinicalAttachmentLevel = calculateCAL(nextPd, nextGm);
    }

    const nextRecord: ToothPerioRecord = {
      ...currentToothRecord,
      sites: {
        ...currentToothRecord.sites,
        [siteKey]: updatedSite,
      },
    };
    updateToothRecord(nextRecord);
  }

  function handleQuickSetTooth(preset: "healthy" | "clear" | "missing") {
    if (readOnly) return;
    if (preset === "missing") {
      const isCurrentlyMissing = Boolean(currentToothRecord.isMissing);
      updateToothRecord({
        ...currentToothRecord,
        isMissing: !isCurrentlyMissing,
      });
      return;
    }

    if (preset === "clear") {
      updateToothRecord(createEmptyToothPerioRecord(activeToothNumber));
      return;
    }

    if (preset === "healthy") {
      // 2mm sulcus, 0mm GM (at CEJ), no BOP, no SUP
      const healthySites: Record<PerioSiteKey, SiteMeasurement> = {
        distobuccal: { probingDepth: 2, gingivalMargin: 0, clinicalAttachmentLevel: 2, bleedingOnProbing: false, suppuration: false },
        midbuccal: { probingDepth: 2, gingivalMargin: 0, clinicalAttachmentLevel: 2, bleedingOnProbing: false, suppuration: false },
        mesiobuccal: { probingDepth: 2, gingivalMargin: 0, clinicalAttachmentLevel: 2, bleedingOnProbing: false, suppuration: false },
        distolingual: { probingDepth: 2, gingivalMargin: 0, clinicalAttachmentLevel: 2, bleedingOnProbing: false, suppuration: false },
        midlingual: { probingDepth: 2, gingivalMargin: 0, clinicalAttachmentLevel: 2, bleedingOnProbing: false, suppuration: false },
        mesiolingual: { probingDepth: 2, gingivalMargin: 0, clinicalAttachmentLevel: 2, bleedingOnProbing: false, suppuration: false },
      };
      updateToothRecord({
        ...currentToothRecord,
        isMissing: false,
        mobility: "0",
        furcation: "0",
        sites: healthySites,
      });
    }
  }

  function navigateTooth(direction: "prev" | "next") {
    const currentIndex = PERMANENT_TEETH.findIndex(
      (t) => t.universal === activeToothNumber
    );
    if (currentIndex === -1) return;
    if (direction === "prev") {
      const nextIndex = currentIndex > 0 ? currentIndex - 1 : PERMANENT_TEETH.length - 1;
      setActiveToothNumber(PERMANENT_TEETH[nextIndex].universal);
    } else {
      const nextIndex = currentIndex < PERMANENT_TEETH.length - 1 ? currentIndex + 1 : 0;
      setActiveToothNumber(PERMANENT_TEETH[nextIndex].universal);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Bar: Clinical Metrics Overview */}
      <div className="glass-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50/90 text-teal-700 border border-teal-200/60 shadow-xs">
              <Icon name="chart" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Comprehensive Periodontal Assessment
                </h3>
                <span className="glass-chip rounded bg-teal-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800 border border-teal-200/80">
                  6-Site Probing Matrix
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                AAP/EFP 2018 World Workshop Staging &bull; Probing Depth (PD) &bull; Gingival Margin (GM) &bull; CAL
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/60 p-0.5 text-xs backdrop-blur-xs shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className={`glass-button rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                viewMode === "compact"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tooth Focus
            </button>
            <button
              type="button"
              onClick={() => setViewMode("full")}
              className={`glass-button rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                viewMode === "full"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Full Arch Chart
            </button>
            <button
              type="button"
              onClick={() => setViewMode("summary")}
              className={`glass-button rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                viewMode === "summary"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Clinical Summary
            </button>
          </div>
        </div>

        {/* Clinical KPI strip */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100/80 pt-3 sm:grid-cols-5">
          <div className="glass-card-subtle rounded-lg p-2 text-center border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Probed Teeth</span>
            <p className="text-base font-bold text-slate-900">
              {summary.totalProbedTeeth} <span className="text-xs font-normal text-slate-400">/ 32</span>
            </p>
          </div>
          <div className="glass-card-subtle rounded-lg p-2 text-center border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Bleeding on Probing</span>
            <p
              className={`text-base font-bold ${
                summary.bleedingOnProbingPercentage >= 10
                  ? "text-rose-600"
                  : "text-emerald-700"
              }`}
            >
              {summary.bleedingOnProbingPercentage}%
              <span className="ml-1 text-[10px] font-normal text-slate-500">
                ({summary.totalBleedingSites}/{summary.totalRecordedSites} sites)
              </span>
            </p>
          </div>
          <div className="glass-card-subtle rounded-lg p-2 text-center border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Pockets 4–5 mm</span>
            <p className="text-base font-bold text-amber-600">
              {summary.sitesWithPockets4to5mm} <span className="text-xs font-normal text-slate-400">sites</span>
            </p>
          </div>
          <div className="glass-card-subtle rounded-lg p-2 text-center border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Severe Pockets &ge;6 mm</span>
            <p
              className={`text-base font-bold ${
                summary.sitesWithPockets6mmOrMore > 0
                  ? "text-rose-600"
                  : "text-slate-700"
              }`}
            >
              {summary.sitesWithPockets6mmOrMore} <span className="text-xs font-normal text-slate-400">sites</span>
            </p>
          </div>
          <div className="glass-card-subtle rounded-lg p-2 text-center border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-bold uppercase text-slate-500">Max CAL</span>
            <p className="text-base font-bold text-slate-900">
              {summary.maxAttachmentLossMm !== null ? `${summary.maxAttachmentLossMm} mm` : "—"}
            </p>
          </div>
        </div>

        {/* Clinical Completeness Disclaimer */}
        {!summary.isCompleteExamination && (
          <div className="glass-card-subtle glass-tint-amber mt-3 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-amber-900 border border-amber-200/80 shadow-xs">
            <Icon name="alert" size={13} />
            <span>
              <strong>Partial Periodontal Record:</strong> Only {summary.totalProbedTeeth} of 32 permanent teeth currently have recorded sites. Full-mouth periodontal staging requires comprehensive 6-site probing of all present teeth.
            </span>
          </div>
        )}
      </div>

      {/* 2. MODE: Tooth Focus (Detailed 6-site Editor) */}
      {viewMode === "compact" && (
        <div className="glass-card p-4 shadow-xs">
          {/* Tooth Selector & Navigation Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateTooth("prev")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                title="Previous Tooth"
              >
                &larr;
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-teal-800 px-2 py-0.5 text-xs font-bold text-white">
                    #{activeToothNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {toothInfo?.name || `Tooth ${activeToothNumber}`}
                  </span>
                  <span className="text-xs text-slate-500">
                    (FDI {toothInfo?.fdi || universalToFdi(activeToothNumber)})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {toothInfo?.quadrantLabel} &bull; {toothInfo?.region} region
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTooth("next")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                title="Next Tooth"
              >
                &rarr;
              </button>
            </div>

            {/* Tooth-level selectors & actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Tooth Selector Dropdown */}
              <select
                value={activeToothNumber}
                onChange={(e) => setActiveToothNumber(e.target.value)}
                className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 focus:border-teal-600 focus:outline-hidden"
              >
                {PERMANENT_TEETH.map((t) => (
                  <option key={t.universal} value={t.universal}>
                    #{t.universal} (FDI {t.fdi}) - {t.name.split("(")[0]}
                  </option>
                ))}
              </select>

              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => handleQuickSetTooth("healthy")}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Set Normal (2mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetTooth("missing")}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold ${
                      currentToothRecord.isMissing
                        ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {currentToothRecord.isMissing ? "✓ Missing" : "Mark Missing"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetTooth("clear")}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Clear Tooth
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Missing tooth state */}
          {currentToothRecord.isMissing ? (
            <div className="my-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <span className="text-xs font-bold uppercase text-slate-500">Tooth Marked Missing</span>
              <p className="mt-1 text-xs text-slate-600">
                Tooth #{activeToothNumber} is recorded as absent/extracted. Probing sites are excluded from periodontitis calculations.
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleQuickSetTooth("missing")}
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Unmark Missing (Enable Probing)
                </button>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Tooth-level metrics: Mobility & Furcation */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg bg-slate-50/80 p-3 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">Tooth Mobility</label>
                  <select
                    disabled={readOnly}
                    value={currentToothRecord.mobility || "0"}
                    onChange={(e) =>
                      updateToothRecord({
                        ...currentToothRecord,
                        mobility: e.target.value as ToothPerioRecord["mobility"],
                      })
                    }
                    className="mt-1 h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
                  >
                    <option value="0">Grade 0 (Physiological)</option>
                    <option value="I">Grade I (&le;1 mm horizontal)</option>
                    <option value="II">Grade II (&gt;1 mm horizontal)</option>
                    <option value="III">Grade III (Axial/Vertical)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700">Furcation Involvement</label>
                  <select
                    disabled={readOnly || !isMultiRootedTooth(activeToothNumber)}
                    value={currentToothRecord.furcation || "0"}
                    onChange={(e) =>
                      updateToothRecord({
                        ...currentToothRecord,
                        furcation: e.target.value as ToothPerioRecord["furcation"],
                      })
                    }
                    className="mt-1 h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium text-slate-800 focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
                  >
                    <option value="0">Class 0 (None)</option>
                    <option value="I">Class I (Incipient / catch)</option>
                    <option value="II">Class II (Cul-de-sac)</option>
                    <option value="III">Class III (Through-and-through)</option>
                  </select>
                  {!isMultiRootedTooth(activeToothNumber) && (
                    <span className="text-[10px] text-slate-400">Single-rooted tooth (N/A)</span>
                  )}
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2 text-xs text-slate-500">
                  <div className="text-right">
                    <span className="font-bold text-slate-700">Sign Convention:</span>
                    <p className="text-[10px]">GM &gt; 0 = Recession &bull; GM &lt; 0 = Overgrowth &bull; CAL = PD + GM</p>
                  </div>
                </div>
              </div>

              {/* 6-Site Probing Matrix: Buccal & Lingual */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Buccal/Facial Aspect */}
                <div className="glass-card-subtle rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                      Buccal (Facial) Aspect
                    </span>
                    <span className="text-[10px] text-slate-400">3 Sites (DB &bull; B &bull; MB)</span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {BUCCAL_SITE_KEYS.map((siteKey) => {
                      const label = SITE_LABELS[siteKey];
                      const measurement = currentToothRecord.sites?.[siteKey] || createEmptySiteMeasurement();
                      const risk = getSiteRiskSeverity(measurement.probingDepth);

                      return (
                        <div
                          key={siteKey}
                          className={`rounded-lg border p-2.5 transition ${
                            risk === "deep_pocket"
                              ? "border-rose-300 bg-rose-50/40"
                              : risk === "mild_pocket"
                              ? "border-amber-300 bg-amber-50/40"
                              : "border-slate-200 bg-slate-50/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs">{label.short}</span>
                            <span className="text-[10px] text-slate-500">{label.name}</span>
                          </div>

                          {/* PD Input */}
                          <div className="mt-2">
                            <label className="text-[10px] font-bold text-slate-600 block">
                              PD (mm)
                            </label>
                            <input
                              type="number"
                              min={MIN_PROBING_DEPTH_MM}
                              max={MAX_PROBING_DEPTH_MM}
                              disabled={readOnly}
                              placeholder="—"
                              value={
                                measurement.probingDepth !== null && measurement.probingDepth !== undefined
                                  ? measurement.probingDepth
                                  : ""
                              }
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                handleSiteChange(siteKey, "probingDepth", val);
                              }}
                              className="mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs font-bold text-slate-900 focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
                            />
                          </div>

                          {/* GM Input */}
                          <div className="mt-2">
                            <label className="text-[10px] font-bold text-slate-600 block" title="+ = Recession, - = Overgrowth">
                              GM (mm)
                            </label>
                            <input
                              type="number"
                              min={MIN_GINGIVAL_MARGIN_MM}
                              max={MAX_GINGIVAL_MARGIN_MM}
                              disabled={readOnly}
                              placeholder="0"
                              value={
                                measurement.gingivalMargin !== null && measurement.gingivalMargin !== undefined
                                  ? measurement.gingivalMargin
                                  : ""
                              }
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                handleSiteChange(siteKey, "gingivalMargin", val);
                              }}
                              className="mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
                            />
                          </div>

                          {/* Calculated CAL */}
                          <div className="mt-2 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">CAL:</span>
                            <span className="font-bold text-slate-800">
                              {formatCAL(measurement.clinicalAttachmentLevel)}
                            </span>
                          </div>

                          {/* BOP & SUP Toggles */}
                          <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-200/60 pt-2">
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() =>
                                handleSiteChange(
                                  siteKey,
                                  "bleedingOnProbing",
                                  !measurement.bleedingOnProbing
                                )
                              }
                              className={`flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] font-bold uppercase transition ${
                                measurement.bleedingOnProbing
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title="Bleeding on Probing"
                            >
                              <span className={measurement.bleedingOnProbing ? "text-white" : "text-rose-600"}>●</span> BOP
                            </button>
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() =>
                                handleSiteChange(
                                  siteKey,
                                  "suppuration",
                                  !measurement.suppuration
                                )
                              }
                              className={`flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] font-bold uppercase transition ${
                                measurement.suppuration
                                  ? "bg-amber-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title="Suppuration / Pus"
                            >
                              <span className={measurement.suppuration ? "text-white" : "text-amber-600"}>●</span> SUP
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lingual/Palatal Aspect */}
                <div className="glass-card-subtle rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                      {toothInfo?.arch === "maxillary" ? "Palatal" : "Lingual"} Aspect
                    </span>
                    <span className="text-[10px] text-slate-400">3 Sites (DL &bull; L &bull; ML)</span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {LINGUAL_SITE_KEYS.map((siteKey) => {
                      const label = SITE_LABELS[siteKey];
                      const measurement = currentToothRecord.sites?.[siteKey] || createEmptySiteMeasurement();
                      const risk = getSiteRiskSeverity(measurement.probingDepth);

                      return (
                        <div
                          key={siteKey}
                          className={`rounded-lg border p-2.5 transition ${
                            risk === "deep_pocket"
                              ? "border-rose-300 bg-rose-50/40"
                              : risk === "mild_pocket"
                              ? "border-amber-300 bg-amber-50/40"
                              : "border-slate-200 bg-slate-50/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs">{label.short}</span>
                            <span className="text-[10px] text-slate-500">
                              {toothInfo?.arch === "maxillary" ? label.palatalName : label.name}
                            </span>
                          </div>

                          {/* PD Input */}
                          <div className="mt-2">
                            <label className="text-[10px] font-bold text-slate-600 block">
                              PD (mm)
                            </label>
                            <input
                              type="number"
                              min={MIN_PROBING_DEPTH_MM}
                              max={MAX_PROBING_DEPTH_MM}
                              disabled={readOnly}
                              placeholder="—"
                              value={
                                measurement.probingDepth !== null && measurement.probingDepth !== undefined
                                  ? measurement.probingDepth
                                  : ""
                              }
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                handleSiteChange(siteKey, "probingDepth", val);
                              }}
                              className="mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs font-bold text-slate-900 focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
                            />
                          </div>

                          {/* GM Input */}
                          <div className="mt-2">
                            <label className="text-[10px] font-bold text-slate-600 block" title="+ = Recession, - = Overgrowth">
                              GM (mm)
                            </label>
                            <input
                              type="number"
                              min={MIN_GINGIVAL_MARGIN_MM}
                              max={MAX_GINGIVAL_MARGIN_MM}
                              disabled={readOnly}
                              placeholder="0"
                              value={
                                measurement.gingivalMargin !== null && measurement.gingivalMargin !== undefined
                                  ? measurement.gingivalMargin
                                  : ""
                              }
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : Number(e.target.value);
                                handleSiteChange(siteKey, "gingivalMargin", val);
                              }}
                              className="mt-0.5 h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
                            />
                          </div>

                          {/* Calculated CAL */}
                          <div className="mt-2 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">CAL:</span>
                            <span className="font-bold text-slate-800">
                              {formatCAL(measurement.clinicalAttachmentLevel)}
                            </span>
                          </div>

                          {/* BOP & SUP Toggles */}
                          <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-200/60 pt-2">
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() =>
                                handleSiteChange(
                                  siteKey,
                                  "bleedingOnProbing",
                                  !measurement.bleedingOnProbing
                                )
                              }
                              className={`flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] font-bold uppercase transition ${
                                measurement.bleedingOnProbing
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title="Bleeding on Probing"
                            >
                              <span className={measurement.bleedingOnProbing ? "text-white" : "text-rose-600"}>●</span> BOP
                            </button>
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() =>
                                handleSiteChange(
                                  siteKey,
                                  "suppuration",
                                  !measurement.suppuration
                                )
                              }
                              className={`flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] font-bold uppercase transition ${
                                measurement.suppuration
                                  ? "bg-amber-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title="Suppuration / Pus"
                            >
                              <span className={measurement.suppuration ? "text-white" : "text-amber-600"}>●</span> SUP
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MODE: Full Arch Probing Grid */}
      {viewMode === "full" && (
        <div className="space-y-4">
          {/* Arch Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Display Dental Arch:</span>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveArchTab("both")}
                className={`rounded px-3 py-1 text-[11px] font-semibold ${
                  activeArchTab === "both" ? "bg-teal-700 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Both Arches (32)
              </button>
              <button
                type="button"
                onClick={() => setActiveArchTab("maxillary")}
                className={`rounded px-3 py-1 text-[11px] font-semibold ${
                  activeArchTab === "maxillary" ? "bg-teal-700 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Maxillary Arch (1–16)
              </button>
              <button
                type="button"
                onClick={() => setActiveArchTab("mandibular")}
                className={`rounded px-3 py-1 text-[11px] font-semibold ${
                  activeArchTab === "mandibular" ? "bg-teal-700 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mandibular Arch (17–32)
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
            {PERMANENT_TEETH.filter((t) => {
              if (activeArchTab === "maxillary") return t.arch === "maxillary";
              if (activeArchTab === "mandibular") return t.arch === "mandibular";
              return true;
            }).map((tooth) => {
              const rec = teethRecords[tooth.universal];
              const isSelected = activeToothNumber === tooth.universal;
              const isMissing = Boolean(rec?.isMissing);

              return (
                <div
                  key={tooth.universal}
                  onClick={() => {
                    setActiveToothNumber(tooth.universal);
                    if (viewMode === "full") {
                      // Allow selecting tooth and staying in full view or inspect
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-2.5 transition ${
                    isSelected
                      ? "border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/30 shadow-xs"
                      : isMissing
                      ? "border-slate-200 bg-slate-100 opacity-60"
                      : "border-slate-200 bg-white hover:border-teal-400"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-xs text-slate-900">#{tooth.universal}</span>
                    <span className="text-[10px] text-slate-500">FDI {tooth.fdi}</span>
                  </div>

                  {isMissing ? (
                    <div className="py-4 text-center text-[10px] font-bold text-slate-400 uppercase">
                      Missing
                    </div>
                  ) : rec ? (
                    <div className="mt-2 space-y-1.5 text-[10px]">
                      {/* Buccal Row */}
                      <div>
                        <span className="text-[9px] font-semibold text-slate-400">B:</span>
                        <div className="flex items-center justify-between gap-0.5 mt-0.5">
                          {BUCCAL_SITE_KEYS.map((k) => {
                            const s = rec.sites?.[k];
                            const risk = getSiteRiskSeverity(s?.probingDepth);
                            return (
                              <span
                                key={k}
                                className={`flex-1 rounded py-0.5 text-center font-bold ${
                                  risk === "deep_pocket"
                                    ? "bg-rose-100 text-rose-800"
                                    : risk === "mild_pocket"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {s?.probingDepth !== null && s?.probingDepth !== undefined ? s.probingDepth : "—"}
                                {s?.bleedingOnProbing && <span className="text-rose-600 font-black">●</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Lingual Row */}
                      <div>
                        <span className="text-[9px] font-semibold text-slate-400">L:</span>
                        <div className="flex items-center justify-between gap-0.5 mt-0.5">
                          {LINGUAL_SITE_KEYS.map((k) => {
                            const s = rec.sites?.[k];
                            const risk = getSiteRiskSeverity(s?.probingDepth);
                            return (
                              <span
                                key={k}
                                className={`flex-1 rounded py-0.5 text-center font-bold ${
                                  risk === "deep_pocket"
                                    ? "bg-rose-100 text-rose-800"
                                    : risk === "mild_pocket"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {s?.probingDepth !== null && s?.probingDepth !== undefined ? s.probingDepth : "—"}
                                {s?.bleedingOnProbing && <span className="text-rose-600 font-black">●</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mobility / Furcation badges */}
                      <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                        {rec.mobility && rec.mobility !== "0" && (
                          <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800">
                            Mob {rec.mobility}
                          </span>
                        )}
                        {rec.furcation && rec.furcation !== "0" && (
                          <span className="rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-800">
                            Furc {rec.furcation}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-[10px] text-slate-400">
                      Unrecorded
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MODE: Clinical Summary View */}
      {viewMode === "summary" && (
        <div className="glass-card p-5 shadow-xs space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
            Periodontal Finding Summary &amp; Risk Stratification
          </h4>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-card-subtle rounded-lg border border-slate-200/80 p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500">BOP Inflammatory Index</span>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {summary.bleedingOnProbingPercentage}%
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                {summary.bleedingOnProbingPercentage < 10
                  ? "✓ Clinically Healthy (BOP < 10%)"
                  : summary.bleedingOnProbingPercentage < 30
                  ? "⚠ Localized Gingival Inflammation (10–29% BOP)"
                  : "⚠ Generalized Gingival Inflammation (≥ 30% BOP)"}
              </p>
            </div>

            <div className="glass-card-subtle rounded-lg border border-slate-200/80 p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500">Periodontal Pocket Count</span>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {summary.sitesWithPockets4to5mm + summary.sitesWithPockets6mmOrMore} sites
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                {summary.sitesWithPockets4to5mm} moderate (4–5 mm) &bull; {summary.sitesWithPockets6mmOrMore} severe (&ge; 6 mm)
              </p>
            </div>

            <div className="glass-card-subtle rounded-lg border border-slate-200/80 p-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500">Attachment Loss &amp; Furcation</span>
              <p className="mt-1 text-lg font-bold text-slate-900">
                Max CAL: {summary.maxAttachmentLossMm !== null ? `${summary.maxAttachmentLossMm} mm` : "None"}
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                Furcations: {summary.teethWithFurcation.length > 0 ? summary.teethWithFurcation.map(t => `#${t}`).join(", ") : "None"}
              </p>
            </div>
          </div>

          {/* Pathological teeth inventory */}
          <div className="mt-4">
            <h5 className="text-[11px] font-bold uppercase text-slate-700">
              Teeth with Periodontal Findings (PD &ge; 4mm, BOP, Mobility, or Furcation)
            </h5>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Tooth</th>
                    <th className="py-2 px-3">Anatomy</th>
                    <th className="py-2 px-3">Max PD</th>
                    <th className="py-2 px-3">BOP Sites</th>
                    <th className="py-2 px-3">Max CAL</th>
                    <th className="py-2 px-3">Mobility</th>
                    <th className="py-2 px-3">Furcation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMANENT_TEETH.filter((t) => {
                    const rec = teethRecords[t.universal];
                    if (!rec || rec.isMissing) return false;
                    const hasMob = rec.mobility && rec.mobility !== "0";
                    const hasFurc = rec.furcation && rec.furcation !== "0";
                    const hasPocketOrBop = Object.values(rec.sites || {}).some(
                      (s) => (s?.probingDepth && s.probingDepth >= 4) || s?.bleedingOnProbing
                    );
                    return hasMob || hasFurc || hasPocketOrBop;
                  }).map((t) => {
                    const rec = teethRecords[t.universal];
                    const sites = Object.values(rec.sites || {});
                    const maxPd = Math.max(
                      0,
                      ...sites.map((s) => s?.probingDepth || 0)
                    );
                    const bopCount = sites.filter((s) => s?.bleedingOnProbing).length;
                    const maxCal = Math.max(
                      0,
                      ...sites.map((s) => s?.clinicalAttachmentLevel || 0)
                    );

                    return (
                      <tr key={t.universal} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          #{t.universal} (FDI {t.fdi})
                        </td>
                        <td className="py-2 px-3 text-slate-600">{t.name}</td>
                        <td className="py-2 px-3 font-semibold">
                          <span
                            className={`rounded px-1.5 py-0.5 ${
                              maxPd >= 6
                                ? "bg-rose-100 text-rose-800 font-bold"
                                : maxPd >= 4
                                ? "bg-amber-100 text-amber-800"
                                : "text-slate-700"
                            }`}
                          >
                            {maxPd > 0 ? `${maxPd} mm` : "—"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {bopCount > 0 ? (
                            <span className="text-rose-600 font-bold">● {bopCount} sites</span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {maxCal > 0 ? `${maxCal} mm` : "—"}
                        </td>
                        <td className="py-2 px-3">
                          {rec.mobility && rec.mobility !== "0" ? `Grade ${rec.mobility}` : "Normal"}
                        </td>
                        <td className="py-2 px-3">
                          {rec.furcation && rec.furcation !== "0" ? `Class ${rec.furcation}` : "None"}
                        </td>
                      </tr>
                    );
                  })}
                  {PERMANENT_TEETH.filter((t) => {
                    const rec = teethRecords[t.universal];
                    if (!rec || rec.isMissing) return false;
                    return (
                      (rec.mobility && rec.mobility !== "0") ||
                      (rec.furcation && rec.furcation !== "0") ||
                      Object.values(rec.sites || {}).some(
                        (s) => (s?.probingDepth && s.probingDepth >= 4) || s?.bleedingOnProbing
                      )
                    );
                  }).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                        No pathological pocketing, bleeding, mobility, or furcation recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Clinical Documentation Footnote */}
      <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Icon name="shield" size={13} />
          <span>Measurement Conventions &amp; Classification Standard:</span>
        </div>
        <p className="mt-1 leading-relaxed">
          Probing depths (PD) recorded in millimetres using a calibrated periodontal probe at 6 standard anatomical sites. Gingival margin (GM) measured from the cementoenamel junction (CEJ) with positive (+) values indicating apical recession and negative (-) values indicating coronal gingival enlargement. Clinical attachment level (CAL) calculated as CAL = PD + GM. Classification criteria reference the 2018 AAP/EFP World Workshop Classification of Periodontal and Peri-Implant Diseases and Conditions.
        </p>
      </div>
    </div>
  );
}
