"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCase, type StoredCase } from "@/lib/case-storage";
import { Icon } from "@/components/clinical-ui";
import { formatToothWithSystem } from "@/lib/tooth-numbering";
import {
  calculatePeriodontalSummary,
  BUCCAL_SITE_KEYS,
  LINGUAL_SITE_KEYS,
} from "@/lib/periodontal-types";

export function ClinicalReportContent({
  caseId,
}: {
  caseId: string;
}) {
  const [storedCase, setStoredCase] = useState<StoredCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const item = getCase(caseId);
      setStoredCase(item);
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [caseId]);

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs text-slate-500">
        Loading clinical decision support report...
      </div>
    );
  }

  if (!storedCase) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Case Not Found</h1>
        <p className="mt-2 text-xs text-slate-500">
          No case found matching identifier <span className="font-semibold">{caseId}</span>.
        </p>
        <Link
          href="/cases"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white"
        >
          Return to Cases
        </Link>
      </div>
    );
  }

  const { caseData, analysis, analysisStatus, createdAt, review } = storedCase;
  const currentReviewStatus =
    storedCase.reviewStatus ||
    review?.status ||
    (storedCase.status === "reviewed" ? "reviewed" : "needs_review");
  const isStale = analysisStatus === "stale" && Boolean(analysis);

  if (!analysis) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-amber-950">
          <h1 className="text-lg font-bold">Analysis Not Available</h1>
          <p className="mt-2 text-xs leading-relaxed text-amber-900/90">
            A clinical decision support report cannot be generated because this case has not yet been analyzed by Dentarith.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={`/cases/${encodeURIComponent(caseId)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Open Case to Analyze
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Back to Cases
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const leadingDiagnosis = analysis.possibleDiagnoses.find((d) => d.rank === 1) || analysis.possibleDiagnoses[0];
  const secondaryDiagnoses = analysis.possibleDiagnoses.filter((d) => d.rank !== 1);
  const combinedEvidenceMap = [
    ...(analysis.evidenceMap || []),
    ...analysis.possibleDiagnoses.flatMap((d) => d.evidenceMap || []),
  ];

  return (
    <div className="min-h-screen bg-transparent py-8 print:bg-white print:py-0">
      {/* Screen Action Bar (Hidden on Print) */}
      <div className="glass-pill no-print mx-auto mb-6 flex max-w-4xl items-center justify-between px-6 py-3.5 shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href={`/cases/${encodeURIComponent(caseId)}`}
            className="glass-pill inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white shadow-xs"
          >
            <Icon name="arrow" size={14} />
            Back to Case
          </Link>
          <span className="text-xs text-slate-500">
            Case: <strong className="text-slate-800">{caseId}</strong>
          </span>
          <span
            className={`glass-chip rounded-full px-2.5 py-0.5 text-[10px] font-bold border shadow-xs ${
              currentReviewStatus === "reviewed"
                ? "border-emerald-300 bg-emerald-50/90 text-emerald-800"
                : currentReviewStatus === "needs_review"
                ? "border-amber-300 bg-amber-50/90 text-amber-800"
                : "border-slate-300 bg-slate-50/90 text-slate-700"
            }`}
          >
            Review: {currentReviewStatus.replace("_", " ")}
          </span>
          {isStale && (
            <span className="glass-chip rounded-full border border-amber-300 bg-amber-50/90 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 shadow-xs">
              ⚠️ Stale Clinical Data
            </span>
          )}
          {caseId.startsWith("CASE-BENCH") && (
            <span className="glass-chip rounded-full border border-amber-300 bg-amber-50/90 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 shadow-xs">
              Synthetic Benchmark (Educational Demo)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="glass-pill glass-shine inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800"
          >
            <Icon name="report" size={15} />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="print-page glass-card mx-auto max-w-4xl p-8 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none print:bg-white sm:p-12">
        {/* Document Header */}
        <header className="border-b-2 border-slate-900 pb-5">
          {caseId.startsWith("CASE-BENCH") && (
            <div className="mb-4 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Synthetic Educational Case
                </span>
                <span className="font-bold text-amber-900">
                  Non-Clinical Demonstration — Not a Validated Medical Reference Standard
                </span>
              </div>
              <p className="mt-1 leading-relaxed text-[11px] text-amber-800">
                This case is an artificially constructed educational simulation created for software demonstration and testing purposes only. Any reviewer notes, diagnostic assertions, or clinical details represent simulated training personas and must NOT be interpreted as real clinician endorsements or validated diagnostic standards.
              </p>
            </div>
          )}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800">
                Dentarith Decision Support System
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                CLINICAL DECISION SUPPORT REPORT
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Assistive diagnostic evaluation with clinician review trace
              </p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <p className="font-bold text-slate-900">Case ID: {caseId}</p>
              <p className="text-slate-500">
                Report Date: {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
              <p className="text-[11px] text-slate-400">
                Case Recorded: {new Date(createdAt).toLocaleDateString()}
              </p>
              <div className="pt-1">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    currentReviewStatus === "reviewed"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : currentReviewStatus === "needs_review"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-slate-100 text-slate-800 border border-slate-300"
                  }`}
                >
                  Review Status: {currentReviewStatus.replace("_", " ")}
                </span>
              </div>
              {review?.reviewedBy && (
                <p className="text-[10px] text-slate-600 font-medium">
                  Attending: {review.reviewedBy}
                </p>
              )}
            </div>
          </div>

          {isStale && (
            <div className="mt-3 rounded border-2 border-amber-400 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">
              ⚠️ STALE ANALYSIS WARNING: Case clinical findings were modified after this reasoning analysis was generated. This report is based on earlier data and re-analysis is strongly recommended.
            </div>
          )}
        </header>

        <div className="mt-6 space-y-6 text-xs text-slate-800">
          {/* Section 1: Case Information & Clinical Presentation */}
          <section className="page-break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
              1. Case Information &amp; Clinical Presentation
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
              <div>
                <p><span className="font-bold">Patient Age:</span> {caseData.caseInformation.age} years</p>
                <p className="mt-1"><span className="font-bold">Biological Sex:</span> {caseData.caseInformation.sex}</p>
                <p className="mt-1">
                  <span className="font-bold">Tooth / Region:</span>{" "}
                  {formatToothWithSystem(
                    caseData.toothAssessment?.toothNumber ||
                      caseData.clinicalExamination.toothOrRegion ||
                      ""
                  )}
                </p>
              </div>
              <div>
                <p><span className="font-bold">Duration of Symptoms:</span> {caseData.historyOfPresentingComplaint.duration || "Not reported"}</p>
                <p className="mt-1"><span className="font-bold">Symptom Character:</span> {caseData.historyOfPresentingComplaint.symptoms || "Not reported"}</p>
                {caseData.historyOfPresentingComplaint.aggravatingFactors && (
                  <p className="mt-1"><span className="font-bold">Aggravating:</span> {caseData.historyOfPresentingComplaint.aggravatingFactors}</p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <span className="font-bold text-slate-900">Chief Complaint: </span>
              <span>{caseData.chiefComplaint}</span>
            </div>
          </section>

          {/* Section 2: Clinical Examination & Objective Findings */}
          <section className="page-break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
              2. Clinical Examination &amp; Objective Findings
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded border border-slate-200 p-2.5 bg-white">
                <p className="font-bold text-slate-900 uppercase text-[10px]">Pulpal Assessment</p>
                <p className="mt-1">Cold Test: {caseData.pulpalAssessment?.coldTest || "Not tested"}</p>
                {caseData.pulpalAssessment?.lingeringDuration && (
                  <p>Lingering: {caseData.pulpalAssessment.lingeringDuration}</p>
                )}
                {caseData.pulpalAssessment?.electricPulpTest && (
                  <p>EPT: {caseData.pulpalAssessment.electricPulpTest}</p>
                )}
              </div>

              <div className="rounded border border-slate-200 p-2.5 bg-white">
                <p className="font-bold text-slate-900 uppercase text-[10px]">Periapical Assessment</p>
                <p className="mt-1">Percussion: {caseData.periapicalAssessment?.percussion || caseData.clinicalExamination.percussion || "Not tested"}</p>
                <p>Palpation: {caseData.periapicalAssessment?.palpation || caseData.clinicalExamination.palpation || "Not tested"}</p>
                {caseData.periapicalAssessment?.biteTest && (
                  <p>Bite Test: {caseData.periapicalAssessment.biteTest}</p>
                )}
                <p>Mobility: {caseData.periapicalAssessment?.mobility || caseData.clinicalExamination.mobility || "Grade 0"}</p>
              </div>

              <div className="rounded border border-slate-200 p-2.5 bg-white">
                <p className="font-bold text-slate-900 uppercase text-[10px]">Hard &amp; Soft Tissues</p>
                <p className="mt-1">Caries: {caseData.hardTissueAssessment?.caries || "None noted"}</p>
                <p>Probing: {caseData.periodontalAssessment?.probingDepth || caseData.clinicalExamination.probing || "2-3 mm"}</p>
                <p>Swelling: {caseData.periapicalAssessment?.swelling || "None"}</p>
                <p>Sinus Tract: {caseData.periapicalAssessment?.sinusTract || "None"}</p>
              </div>
            </div>

            {/* Periodontal Charting & Measurements Table */}
            <div className="mt-3 rounded border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                  Periodontal Examination &amp; Attachment Status
                </p>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {caseData.periodontalChart ? "6-Site Clinical Probing Record" : "Summary Findings Only"}
                </span>
              </div>

              {caseData.periodontalChart ? (() => {
                const perioSummary = calculatePeriodontalSummary(caseData.periodontalChart);
                const recordedTeeth = Object.values(caseData.periodontalChart.teeth || {}).filter(
                  (t) =>
                    !t.isMissing &&
                    t.sites &&
                    Object.values(t.sites).some(
                      (s) => (s?.probingDepth !== null && s?.probingDepth !== undefined) || s?.bleedingOnProbing
                    )
                );

                return (
                  <div className="mt-2 space-y-2 text-[11px]">
                    {/* KPI Metrics */}
                    <div className="grid grid-cols-5 gap-2 rounded bg-slate-50 p-2 text-center text-[10px]">
                      <div>
                        <span className="text-slate-500 font-bold block">PROBED TEETH</span>
                        <span className="font-bold text-slate-900 text-xs">{perioSummary.totalProbedTeeth} / 32</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">BOP SCORE</span>
                        <span className={`font-bold text-xs ${perioSummary.bleedingOnProbingPercentage >= 10 ? "text-rose-600" : "text-emerald-700"}`}>
                          {perioSummary.bleedingOnProbingPercentage}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">POCKETS 4-5mm</span>
                        <span className="font-bold text-amber-600 text-xs">{perioSummary.sitesWithPockets4to5mm} sites</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">POCKETS &ge;6mm</span>
                        <span className={`font-bold text-xs ${perioSummary.sitesWithPockets6mmOrMore > 0 ? "text-rose-600" : "text-slate-700"}`}>
                          {perioSummary.sitesWithPockets6mmOrMore} sites
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block">MAX CAL</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {perioSummary.maxAttachmentLossMm !== null ? `${perioSummary.maxAttachmentLossMm} mm` : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Examination Completeness Notice */}
                    {!perioSummary.isCompleteExamination && (
                      <p className="rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-900 border border-amber-200">
                        <strong>⚠️ Partial Periodontal Examination:</strong> Recorded {perioSummary.totalProbedTeeth} of 32 teeth. Full-mouth periodontal staging under AAP/EFP 2018 guidelines requires complete 6-site probing of all present teeth.
                      </p>
                    )}

                    {/* Recorded Teeth Table */}
                    {recordedTeeth.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px] border border-slate-200">
                          <thead className="bg-slate-100 font-bold uppercase text-slate-600">
                            <tr>
                              <th className="p-1 border-r border-slate-200">Tooth</th>
                              <th className="p-1 border-r border-slate-200">Buccal PD (DB &bull; B &bull; MB)</th>
                              <th className="p-1 border-r border-slate-200">Lingual/Palatal PD (DL &bull; L &bull; ML)</th>
                              <th className="p-1 border-r border-slate-200">Max CAL</th>
                              <th className="p-1 border-r border-slate-200">Mobility</th>
                              <th className="p-1">Furcation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {recordedTeeth.map((rec) => {
                              const bSites = BUCCAL_SITE_KEYS.map((k) => {
                                const s = rec.sites?.[k];
                                const pdStr = s?.probingDepth !== null && s?.probingDepth !== undefined ? `${s.probingDepth}mm` : "—";
                                return s?.bleedingOnProbing ? `${pdStr}*` : pdStr;
                              }).join(" / ");

                              const lSites = LINGUAL_SITE_KEYS.map((k) => {
                                const s = rec.sites?.[k];
                                const pdStr = s?.probingDepth !== null && s?.probingDepth !== undefined ? `${s.probingDepth}mm` : "—";
                                return s?.bleedingOnProbing ? `${pdStr}*` : pdStr;
                              }).join(" / ");

                              const calVals = Object.values(rec.sites || {})
                                .map((s) => s?.clinicalAttachmentLevel)
                                .filter((c): c is number => c !== null && c !== undefined);
                              const maxCal = calVals.length > 0 ? `${Math.max(...calVals)}mm` : "—";

                              return (
                                <tr key={rec.toothNumber} className="hover:bg-slate-50">
                                  <td className="p-1 font-bold border-r border-slate-200">
                                    #{rec.toothNumber} {rec.fdiNumber ? `(FDI ${rec.fdiNumber})` : ""}
                                  </td>
                                  <td className="p-1 border-r border-slate-200 font-mono text-[9px]">{bSites}</td>
                                  <td className="p-1 border-r border-slate-200 font-mono text-[9px]">{lSites}</td>
                                  <td className="p-1 border-r border-slate-200 font-semibold">{maxCal}</td>
                                  <td className="p-1 border-r border-slate-200">
                                    {rec.mobility && rec.mobility !== "0" ? `Grade ${rec.mobility}` : "Normal"}
                                  </td>
                                  <td className="p-1">
                                    {rec.furcation && rec.furcation !== "0" ? `Class ${rec.furcation}` : "None"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <p className="mt-1 text-[9px] text-slate-500 italic">
                          * Asterisk indicates bleeding on probing (BOP) at that site. Conventions: PD in mm; GM relative to CEJ (+ = recession, - = overgrowth); CAL = PD + GM.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">
                        No individual site measurements recorded yet.
                      </p>
                    )}
                  </div>
                );
              })() : (
                <div className="mt-1.5 text-[11px] text-slate-700">
                  <p>
                    Probing: {caseData.periodontalAssessment?.probingDepth || caseData.clinicalExamination.probing || "Not recorded"} &bull; Bleeding: {caseData.periodontalAssessment?.bleedingOnProbing || "Not tested"} &bull; Furcation: {caseData.periodontalAssessment?.furcation || "None"} &bull; Recession: {caseData.periodontalAssessment?.recession || "None"}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400 italic">
                    (No 6-site probing matrix was charted for this consultation record.)
                  </p>
                </div>
              )}
            </div>

            <div className="mt-2 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">Radiographic Status: </span>
              <span>No radiographic image was supplied with this consultation.</span>
            </div>
          </section>

          {/* Section 3: Clinician Review & Decision Trace */}
          <section
            className={`page-break-inside-avoid rounded-xl border-2 p-4 ${
              currentReviewStatus === "reviewed"
                ? "border-emerald-600 bg-emerald-50/20"
                : "border-amber-400 bg-amber-50/30"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 font-bold uppercase tracking-wider text-white text-[10px] ${
                    currentReviewStatus === "reviewed"
                      ? "bg-emerald-800"
                      : "bg-amber-800"
                  }`}
                >
                  3. Clinician Review &amp; Decision Trace
                </span>
                <span className="text-xs font-bold text-slate-950">
                  {currentReviewStatus === "reviewed"
                    ? "Licensed Attending Dentist Determination (Verified)"
                    : "Attending Dentist Review Pending"}
                </span>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  currentReviewStatus === "reviewed"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                Status: {currentReviewStatus.replace("_", " ")}
              </span>
            </div>

            {currentReviewStatus !== "reviewed" ? (
              <div className="mt-3 rounded-lg border border-amber-300 bg-white p-3 text-xs text-amber-950 space-y-1.5">
                <p className="font-bold">
                  ⚠️ PENDING CLINICIAN VERIFICATION NOTICE
                </p>
                <p className="leading-relaxed text-amber-900">
                  This report has not yet been reviewed or signed off by an attending dental professional. The diagnostic considerations and treatment options presented in this document represent automated clinical decision support only and must NOT be interpreted as a confirmed diagnosis or clinical treatment order.
                </p>
                <div className="mt-2 pt-2 border-t border-amber-200 text-[11px] text-slate-700 grid grid-cols-2 gap-2">
                  <p><span className="font-semibold">Reviewing Clinician:</span> Not yet assigned</p>
                  <p><span className="font-semibold">Confirmed Clinician Diagnosis:</span> [Pending in-person clinician examination]</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <p>
                      <span className="font-bold text-slate-900">Reviewing Clinician:</span>{" "}
                      <span className="font-semibold text-emerald-950">{review?.reviewedBy}</span>
                    </p>
                    <p className="mt-1">
                      <span className="font-bold text-slate-900">Decision Recorded:</span>{" "}
                      {review?.reviewedAt ? new Date(review.reviewedAt).toLocaleString() : "Recorded"}
                    </p>
                    <p className="mt-1">
                      <span className="font-bold text-slate-900">Diagnostic Concurrence:</span>{" "}
                      <span className="font-semibold text-indigo-900">
                        {review?.corrections?.agreedWithAiDiagnosis
                          ? "Concurred with AI Leading Hypothesis"
                          : "Clinician Override / Custom Clinical Diagnosis"}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p>
                      <span className="font-bold text-slate-900">Confirmed Clinician Diagnosis:</span>{" "}
                      <span className="font-bold text-slate-950">
                        {review?.corrections?.finalDiagnosis || leadingDiagnosis.diagnosis}
                      </span>
                    </p>
                    {review?.corrections?.diagnosisNotes && (
                      <p className="mt-1 text-slate-700">
                        <span className="font-bold">Clinical Rationale:</span> {review.corrections.diagnosisNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Confirmed Treatment Plan & Procedural Orders */}
                <div className="mt-3 border-t border-slate-200 pt-2.5 text-[11px]">
                  <span className="font-bold text-slate-900">Confirmed Treatment Plan: </span>
                  <span className="text-slate-800 font-medium">
                    {review?.corrections?.treatmentPlan || "To be formulated by attending clinician."}
                  </span>
                  {review?.corrections?.treatmentPlanNotes && (
                    <p className="mt-1 text-slate-600">
                      <span className="font-bold">Treatment Rationale:</span> {review.corrections.treatmentPlanNotes}
                    </p>
                  )}
                </div>

                {/* Additional Observations & Notes if any */}
                {(review?.corrections?.additionalObservations || review?.notes) && (
                  <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-2 text-[11px]">
                    {review?.corrections?.additionalObservations && (
                      <p>
                        <span className="font-bold text-slate-900">Additional Observations:</span>{" "}
                        {review.corrections.additionalObservations}
                      </p>
                    )}
                    {review?.notes && (
                      <p>
                        <span className="font-bold text-slate-900">Clinician Notes:</span> {review.notes}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <p className="mt-2.5 text-[10px] text-slate-500 italic">
              Notice: Clinician review documents the attending dental practitioner&apos;s independent clinical judgment and definitive decisions. It does not certify the algorithmic accuracy of assistive AI outputs.
            </p>
          </section>

          {/* Section 4: AI Clinical Reasoning & Diagnostic Hierarchy */}
          <section className="page-break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
              4. Dentarith AI Assistive Reasoning &amp; Diagnostic Hierarchy (Preserved Original)
            </h2>

            {/* Case Summary */}
            <div className="mt-3 rounded border border-slate-200 bg-slate-50/70 p-3">
              <span className="font-bold text-slate-900">Clinical Case Summary: </span>
              <span className="leading-relaxed">{analysis.summary}</span>
            </div>

            {/* Leading Consideration */}
            {leadingDiagnosis && (
              <div className="mt-3 rounded-lg border-2 border-teal-700 bg-teal-50/20 p-4">
                <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-teal-700 px-2 py-0.5 font-bold uppercase tracking-wider text-white text-[10px]">
                      Leading Consideration (Rank #1)
                    </span>
                    <span className="text-sm font-bold text-slate-950">
                      {leadingDiagnosis.diagnosis}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 uppercase">
                      {leadingDiagnosis.diagnosticCategory}
                    </span>
                    <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-900 uppercase">
                      {leadingDiagnosis.likelihood} likelihood
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5 leading-relaxed">
                  {leadingDiagnosis.whyRanksHighest && (
                    <p><span className="font-bold text-slate-900">Why Ranked Highest: </span>{leadingDiagnosis.whyRanksHighest}</p>
                  )}
                  <p><span className="font-bold text-slate-900">Reasoning: </span>{leadingDiagnosis.reasoning}</p>
                  <p><span className="font-bold text-slate-900">Diagnostic Uncertainty: </span>{leadingDiagnosis.confidenceReason}</p>
                  {leadingDiagnosis.supportingFindings.length > 0 && (
                    <p><span className="font-bold text-emerald-800">Supporting Findings (Evidence For): </span>{leadingDiagnosis.supportingFindings.join("; ")}</p>
                  )}
                  <p>
                    <span className="font-bold text-slate-900">Evidence Against / Contradicting Findings: </span>
                    {leadingDiagnosis.contradictingFindings && leadingDiagnosis.contradictingFindings.length > 0 ? (
                      <span className="text-red-700">{leadingDiagnosis.contradictingFindings.join("; ")}</span>
                    ) : (
                      <span className="text-slate-500 italic">None identified</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Secondary Diagnoses */}
            {secondaryDiagnoses.length > 0 && (
              <div className="mt-3">
                <span className="font-bold text-slate-900">Secondary Considerations:</span>
                <ul className="mt-1 space-y-1.5 pl-3">
                  {secondaryDiagnoses.map((sec, idx) => (
                    <li key={`sec-${idx}`}>
                      • <span className="font-semibold text-slate-900">Rank #{sec.rank}: {sec.diagnosis}</span> ({sec.diagnosticCategory}, {sec.likelihood} likelihood) — {sec.reasoning}
                      {sec.supportingFindings && sec.supportingFindings.length > 0 && (
                        <span className="text-emerald-800"> [Evidence for: {sec.supportingFindings.join("; ")}]</span>
                      )}
                      {sec.contradictingFindings && sec.contradictingFindings.length > 0 && (
                        <span className="text-red-700"> [Evidence against: {sec.contradictingFindings.join("; ")}]</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Section 5: Evidence Map */}
          {combinedEvidenceMap.length > 0 && (
            <section className="page-break-inside-avoid">
              <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
                5. Evidence Map (Finding → Interpretation → Relevance)
              </h2>
              <table className="mt-2.5 w-full border-collapse border border-slate-200 text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-bold uppercase text-slate-700">
                    <th className="border border-slate-200 p-2">Clinical Finding</th>
                    <th className="border border-slate-200 p-2">Clinical Interpretation</th>
                    <th className="border border-slate-200 p-2">Diagnostic Relevance</th>
                  </tr>
                </thead>
                <tbody>
                  {combinedEvidenceMap.map((mapItem, idx) => (
                    <tr key={`map-${idx}`} className="border-b border-slate-100">
                      <td className="border border-slate-200 p-2 font-medium">{mapItem.finding}</td>
                      <td className="border border-slate-200 p-2 text-slate-700">{mapItem.interpretation}</td>
                      <td className="border border-slate-200 p-2 text-slate-700">{mapItem.diagnosticRelevance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Section 6: Differential Diagnoses */}
          <section className="page-break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
              6. Differential Diagnosis Considerations
            </h2>
            <div className="mt-2.5 space-y-2">
              {analysis.differentialDiagnosis.map((diff, idx) => (
                <div key={`diff-${idx}`} className="rounded border border-slate-200 p-2.5 bg-white space-y-1">
                  <p className="font-bold text-slate-900">{diff.diagnosis}</p>
                  <p className="text-slate-700"><span className="font-semibold">Why Considered:</span> {diff.whyConsidered}</p>
                  {(diff.supportingEvidence?.length > 0 || diff.supportingFindings?.length > 0) && (
                    <p className="text-emerald-800">
                      <span className="font-semibold">Supporting Evidence: </span>
                      {(diff.supportingEvidence?.length ? diff.supportingEvidence : diff.supportingFindings).join("; ")}
                    </p>
                  )}
                  {diff.evidenceAgainst && diff.evidenceAgainst.length > 0 && (
                    <p className="text-red-700">
                      <span className="font-semibold">Evidence Against: </span>
                      {diff.evidenceAgainst.join("; ")}
                    </p>
                  )}
                  {diff.missingEvidence && diff.missingEvidence.length > 0 && (
                    <p className="text-amber-800">
                      <span className="font-semibold">Missing Evidence: </span>
                      {diff.missingEvidence.join("; ")}
                    </p>
                  )}
                  {diff.whatWouldChangeRanking && (
                    <p className="text-indigo-900"><span className="font-semibold">What would change ranking:</span> {diff.whatWouldChangeRanking}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: Missing Information & Investigations */}
          <section className="page-break-inside-avoid grid grid-cols-2 gap-4">
            <div>
              <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
                7A. Missing Information Prioritization
              </h2>
              <ul className="mt-2 space-y-1.5">
                {analysis.missingInformation.map((item, idx) => (
                  <li key={`mi-${idx}`} className="border-l-2 border-amber-500 pl-2">
                    <span className="font-bold text-slate-900">{item.item}</span>{" "}
                    <span className="text-[10px] font-semibold uppercase text-amber-800">[{item.importance}]</span>
                    <p className="text-[10px] text-slate-500">{item.whyItMatters}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
                7B. Suggested Investigations
              </h2>
              <ul className="mt-2 space-y-1">
                {analysis.suggestedInvestigations.map((inv, idx) => (
                  <li key={`inv-${idx}`}>• {inv}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 8: Decision-Changing Evidence & Treatment Considerations */}
          <section className="page-break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
              8. Decision-Changing Evidence &amp; Treatment Considerations
            </h2>
            {analysis.decisionChangingEvidence && analysis.decisionChangingEvidence.length > 0 && (
              <div className="mt-2">
                <span className="font-bold text-indigo-900">Decision-Changing Evidence:</span>
                <ul className="mt-1 space-y-1 pl-3 text-slate-700">
                  {analysis.decisionChangingEvidence.map((dce, idx) => (
                    <li key={`dce-${idx}`}>• {dce}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3">
              <span className="font-bold text-slate-900">Treatment Considerations (For Clinician Review):</span>
              <ul className="mt-1 space-y-1 pl-3 text-slate-700">
                {analysis.treatmentConsiderations.map((tx, idx) => (
                  <li key={`tx-${idx}`}>• {tx}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 9: Red Flags & Uncertainty */}
          {(analysis.redFlags.length > 0 || analysis.uncertainty.length > 0) && (
            <section className="page-break-inside-avoid rounded border border-amber-200 bg-amber-50/40 p-3">
              {analysis.redFlags.length > 0 && (
                <div>
                  <span className="font-bold text-red-900">Red Flags / Urgent Alerts: </span>
                  <span className="text-red-950">{analysis.redFlags.join("; ")}</span>
                </div>
              )}
              {analysis.uncertainty.length > 0 && (
                <div className="mt-1.5">
                  <span className="font-bold text-amber-900">Diagnostic Uncertainty: </span>
                  <span className="text-amber-950">{analysis.uncertainty.join("; ")}</span>
                </div>
              )}
            </section>
          )}

          {/* IMPORTANT SAFETY NOTICE */}
          <section className="page-break-inside-avoid mt-8 rounded-xl border-2 border-slate-800 bg-slate-50 p-4 text-xs text-slate-900">
            <div className="flex items-center gap-2">
              <span className="font-black uppercase tracking-wider text-teal-900">
                IMPORTANT CLINICAL SAFETY NOTICE
              </span>
            </div>
            <p className="mt-1.5 leading-relaxed text-slate-700">
              Dentarith provides assistive clinical decision support only. It does not replace professional clinical judgment. The treating dental professional must independently verify the clinical findings, investigations, diagnosis, and treatment plan before initiating clinical care. This document does not constitute an autonomous medical prescription or definitive diagnosis.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-8 border-t border-slate-300 pt-4">
              <div>
                <p className="font-semibold text-slate-700">Reviewing Clinician Verification:</p>
                {review?.reviewedBy ? (
                  <div className="mt-2 text-xs">
                    <p className="font-bold text-emerald-900">✓ Electronically verified by: {review.reviewedBy}</p>
                    <p className="text-[10px] text-slate-500">
                      Timestamp: {review.reviewedAt ? new Date(review.reviewedAt).toLocaleString() : new Date().toLocaleString()}
                    </p>
                    <div className="mt-4 border-b border-slate-400 pb-1 text-[10px] text-slate-400">
                      Physical signature / stamp (if required for clinic record):
                    </div>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="border-b border-slate-400 pb-1 text-[10px] text-slate-400">
                      Signature required before initiating clinical care:
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-700">Date &amp; Professional License Number:</p>
                <div className="mt-6 border-b border-slate-400 pb-1" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
