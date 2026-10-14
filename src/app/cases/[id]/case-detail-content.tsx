"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, Icon, ToothPill } from "@/components/clinical-ui";
import { formatToothWithSystem } from "@/lib/tooth-numbering";
import {
  getCase,
  deleteCase,
  saveCase,
  type StoredCase,
} from "@/lib/case-storage";
import type { ClinicalAnalysis, EvidenceMapItem } from "@/lib/clinical-analysis";
import { ClinicianReviewTrace } from "@/components/clinician-review-trace";
import { PeriodontalChart } from "@/components/periodontal-chart";
import { assertWorkspaceCurrent, getWorkspaceUserId } from "@/lib/browser-workspace";

export function CaseDetailContent({
  caseId,
}: {
  caseId: string;
}) {
  const router = useRouter();

  const [storedCase, setStoredCase] = useState<StoredCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const item = getCase(caseId);
      setStoredCase(item);
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [caseId]);

  async function handleReanalyze() {
    if (!storedCase) return;
    const workspaceUserId = getWorkspaceUserId();
    setIsReanalyzing(true);
    setReanalyzeError("");

    const requestCase = JSON.parse(
      JSON.stringify(storedCase.caseData, (key, value) =>
        key === "dataUrl" ? undefined : value
      )
    ) as typeof storedCase.caseData;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestCase),
        signal: AbortSignal.timeout(35000),
      });

      const payload = (await response.json()) as ClinicalAnalysis | { error?: string };
      assertWorkspaceCurrent(workspaceUserId);
      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Re-analysis failed."
        );
      }

      const updated = saveCase({
        ...storedCase,
        analysis: payload as ClinicalAnalysis,
        status: "analyzed",
        analysisStatus: "current",
        reviewStatus: "needs_review",
      });

      setStoredCase(updated);
    } catch (err) {
      const isTimeout =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      setReanalyzeError(
        isTimeout
          ? "Analysis timed out. Please check your connection and try again."
          : err instanceof Error
          ? err.message
          : "Re-analysis could not be completed."
      );
    } finally {
      setIsReanalyzing(false);
    }
  }

  function handleDelete() {
    deleteCase(caseId);
    router.push("/cases");
  }

  if (isLoading) {
    return (
      <AppShell activeItem="Clinical Cases">
        <div className="flex min-h-[300px] items-center justify-center text-xs text-slate-500">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          Loading clinical case details...
        </div>
      </AppShell>
    );
  }

  if (!storedCase) {
    return (
      <AppShell activeItem="Clinical Cases">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <div className="glass-card p-12 text-center shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50/90 text-amber-700 border border-amber-200/80 shadow-xs">
              <Icon name="folder" size={26} />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-950">Case Not Found</h1>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              No clinical consultation record with ID <span className="font-semibold text-slate-800">{caseId}</span> was found in this browser session.
            </p>
            <div className="mt-6">
              <Link
                href="/cases"
                className="glass-button glass-shine inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800 shadow-xs"
              >
                <Icon name="arrow" size={14} />
                Back to Cases List
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const { caseData, analysis, analysisStatus, status } = storedCase;
  const isStale = analysisStatus === "stale" && Boolean(analysis);

  return (
    <AppShell activeItem="Clinical Cases">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation Breadcrumb & Actions Bar */}
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700">
              <Link href="/cases" className="hover:underline">
                Cases
              </Link>
              <span>/</span>
              <span>{caseId}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Case {caseId}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Recorded on {new Date(storedCase.createdAt).toLocaleDateString()} • Last updated {new Date(storedCase.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/cases"
              className="glass-button inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white/70 px-3 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800 shadow-xs"
            >
              <Icon name="arrow" size={14} />
              Back
            </Link>
            <Link
              href={`/cases/new?id=${encodeURIComponent(caseId)}`}
              className="glass-button inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white/70 px-3 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800 shadow-xs"
            >
              Edit Case
            </Link>
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="glass-button inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-600/70 bg-teal-50/80 px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 disabled:opacity-50 shadow-xs"
            >
              <Icon name="spark" size={14} />
              {isReanalyzing ? "Re-analyzing..." : "Re-analyze"}
            </button>
            {analysis && (
              <Link
                href={`/cases/${encodeURIComponent(caseId)}/report`}
                className="glass-button glass-shine inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800"
              >
                <Icon name="report" size={14} />
                Generate Report
              </Link>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="glass-button inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200/80 bg-white/70 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 hover:border-rose-300 shadow-xs"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Re-analyze error alert if any */}
        {reanalyzeError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {reanalyzeError}
          </div>
        )}

        {/* Stale Analysis Warning Banner */}
        {isStale && (
          <div className="glass-card-subtle glass-tint-amber flex items-start justify-between gap-3 p-4 text-amber-950 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900 shadow-xs">
                !
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Stale Analysis Warning
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-900/90">
                  Clinical data was modified after the last AI assessment. This analysis is based on an earlier version of this case.
                </p>
              </div>
            </div>
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="glass-button shrink-0 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-800 disabled:opacity-50"
            >
              {isReanalyzing ? "Re-analyzing..." : "Re-analyze Now"}
            </button>
          </div>
        )}

        {/* Synthetic Benchmark Educational Disclaimer */}
        {caseId.startsWith("CASE-BENCH") && (
          <div className="glass-card-subtle glass-tint-amber flex items-start gap-3 p-4 text-xs text-amber-950 shadow-xs">
            <Icon name="spark" size={18} />
            <div className="space-y-0.5">
              <p className="font-bold uppercase tracking-wider text-amber-900">
                Synthetic Educational Benchmark Case (Non-Clinical Demonstration)
              </p>
              <p className="leading-relaxed text-amber-800">
                This case is an artificially constructed educational simulation created for software demonstration and testing purposes. Clinician review traces and diagnostic entries are simulated personas, not real clinician endorsements or clinically validated diagnostic standards.
              </p>
            </div>
          </div>
        )}

        {/* 1. Case Information & Clinical Presentation */}
        <section className="glass-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-teal-800">
                Patient &amp; Clinical Presentation
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Age: <strong className="text-slate-800">{caseData.caseInformation.age}y</strong></span>
                <span>•</span>
                <span>Sex: <strong className="text-slate-800">{caseData.caseInformation.sex}</strong></span>
                <span>•</span>
                <ToothPill toothNumber={caseData.toothAssessment?.toothNumber || caseData.clinicalExamination.toothOrRegion} />
                <span className="text-slate-500 font-medium">
                  ({formatToothWithSystem(caseData.toothAssessment?.toothNumber || caseData.clinicalExamination.toothOrRegion)})
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-chip inline-flex items-center gap-1 rounded-full bg-teal-50/90 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200/90 shadow-xs">
                <Icon name="cloud" size={11} />
                Cloud Enabled
              </span>
              <span className="glass-chip rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200/80 shadow-xs">
                Status: {status}
              </span>
              <span
                className={`glass-chip rounded-full px-2.5 py-0.5 text-[10px] font-bold border shadow-xs ${
                  storedCase.reviewStatus === "reviewed"
                    ? "border-emerald-300 bg-emerald-50/90 text-emerald-800"
                    : storedCase.reviewStatus === "needs_review"
                    ? "border-amber-300 bg-amber-50/90 text-amber-800"
                    : "border-slate-300 bg-slate-50/90 text-slate-700"
                }`}
              >
                {storedCase.reviewStatus === "reviewed"
                  ? "Reviewed"
                  : storedCase.reviewStatus === "needs_review"
                  ? "Needs Review"
                  : "Review Pending"}
              </span>
              {analysis && (
                <span
                  className={`glass-chip rounded-full px-2.5 py-0.5 text-[10px] font-bold border shadow-xs ${
                    isStale
                      ? "border-amber-300 bg-amber-50/90 text-amber-800"
                      : "border-emerald-300 bg-emerald-50/90 text-emerald-800"
                  }`}
                >
                  {isStale ? "Stale Analysis" : "Current Analysis"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
            <div>
              <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Chief Complaint
              </h3>
              <p className="mt-1 rounded-lg bg-slate-50 p-2.5 font-medium text-slate-900 border border-slate-100">
                {caseData.chiefComplaint}
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                History of Presenting Complaint
              </h3>
              <div className="mt-1 rounded-lg bg-slate-50 p-2.5 text-slate-700 border border-slate-100 space-y-1">
                <p><span className="font-semibold">Duration:</span> {caseData.historyOfPresentingComplaint.duration || "Not reported"}</p>
                <p><span className="font-semibold">Symptoms:</span> {caseData.historyOfPresentingComplaint.symptoms || "Not reported"}</p>
                {caseData.historyOfPresentingComplaint.aggravatingFactors && (
                  <p><span className="font-semibold">Aggravating:</span> {caseData.historyOfPresentingComplaint.aggravatingFactors}</p>
                )}
              </div>
            </div>
          </div>

          {/* Clinical Examination Findings */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Objective Clinical Examination Findings
            </h3>
            <div className="mt-2.5 grid gap-2.5 text-xs sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Pulpal Testing</span>
                <p className="mt-1 font-medium text-slate-800">
                  Cold: {caseData.pulpalAssessment?.coldTest || "Not tested"}
                </p>
                {caseData.pulpalAssessment?.lingeringDuration && (
                  <p className="text-slate-600">Lingering: {caseData.pulpalAssessment.lingeringDuration}</p>
                )}
                {caseData.pulpalAssessment?.electricPulpTest && (
                  <p className="text-slate-600">EPT: {caseData.pulpalAssessment.electricPulpTest}</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Periapical Tests</span>
                <p className="mt-1 font-medium text-slate-800">
                  Percussion: {caseData.periapicalAssessment?.percussion || caseData.clinicalExamination.percussion || "Not tested"}
                </p>
                <p className="text-slate-600">
                  Palpation: {caseData.periapicalAssessment?.palpation || caseData.clinicalExamination.palpation || "Not tested"}
                </p>
                {caseData.periapicalAssessment?.biteTest && (
                  <p className="text-slate-600">Bite: {caseData.periapicalAssessment.biteTest}</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">Hard &amp; Soft Tissues</span>
                <p className="mt-1 font-medium text-slate-800">
                  Caries: {caseData.hardTissueAssessment?.caries || "None noted"}
                </p>
                <p className="text-slate-600">
                  Probing: {caseData.periodontalAssessment?.probingDepth || caseData.clinicalExamination.probing || "Not recorded"}
                </p>
                <p className="text-slate-600">
                  Mobility: {caseData.periapicalAssessment?.mobility || caseData.clinicalExamination.mobility || "Grade 0"}
                </p>
              </div>
            </div>

            {/* Negatives and Notes */}
            {(caseData.relevantNegatives?.relevantNegativeFindings || caseData.clinicianNotes?.additionalClinicalNotes) && (
              <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {caseData.relevantNegatives?.relevantNegativeFindings && (
                  <p><span className="font-semibold text-slate-800">Relevant Negatives:</span> {caseData.relevantNegatives.relevantNegativeFindings}</p>
                )}
                {caseData.clinicianNotes?.additionalClinicalNotes && (
                  <p className="mt-1"><span className="font-semibold text-slate-800">Clinician Notes:</span> {caseData.clinicianNotes.additionalClinicalNotes}</p>
                )}
              </div>
            )}

            {/* Structured Periodontal Chart Inspection */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-teal-50 text-teal-700">
                    <Icon name="chart" size={14} />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Periodontal Examination &amp; Probing Data
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {caseData.periodontalChart ? "Structured 6-Site Record" : "Summary Observations"}
                </span>
              </div>

              {caseData.periodontalChart ? (
                <PeriodontalChart
                  chartData={caseData.periodontalChart}
                  readOnly
                  initialSelectedTooth={caseData.toothAssessment?.toothNumber || "19"}
                />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Summary Periodontal Observations:</p>
                  <p className="mt-1">
                    Probing Depths: {caseData.periodontalAssessment?.probingDepth || caseData.clinicalExamination.probing || "Not recorded"} &bull; Bleeding: {caseData.periodontalAssessment?.bleedingOnProbing || "Not tested"} &bull; Furcation: {caseData.periodontalAssessment?.furcation || "None"} &bull; Recession: {caseData.periodontalAssessment?.recession || "None"}
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-500 italic">
                    (No 6-site probing matrix was charted for this legacy consultation record.)
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Clinician Review & Decision Trace */}
        <ClinicianReviewTrace
          storedCase={storedCase}
          analysis={analysis}
          onCaseUpdated={setStoredCase}
        />

        {/* 2. AI Clinical Reasoning Section */}
        {analysis ? (
          <div className="space-y-4">
            <div className="glass-panel flex items-center justify-between rounded-xl px-5 py-3 text-white shadow-md border border-teal-500/30 bg-gradient-to-r from-teal-800/90 to-teal-900/95">
              <div className="flex items-center gap-2.5">
                <Icon name="spark" size={18} />
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    Dentarith AI Clinical Intelligence
                  </h2>
                  <p className="text-[10px] text-teal-100/90">
                    Preserved original diagnostic hypotheses &bull; Assistive only &bull; Non-autonomous
                  </p>
                </div>
              </div>
              <span className="glass-chip rounded-full bg-teal-700/80 px-2.5 py-0.5 text-[10px] font-semibold text-white border border-teal-500/40 shadow-xs">
                AI Output (Preserved)
              </span>
            </div>
            <AnalysisView analysis={analysis} />
          </div>
        ) : (
          <section className="glass-card border border-dashed border-slate-300/80 p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 border border-teal-100 shadow-xs">
              <Icon name="spark" size={24} />
            </div>
            <h2 className="mt-3 text-sm font-bold text-slate-950">
              No Clinical Reasoning Analysis Available
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              This case is saved as a draft. Run Dentarith clinical decision support to generate structured diagnostic hypotheses and evidence mapping.
            </p>
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="glass-button glass-shine mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 shadow-xs"
            >
              <Icon name="spark" size={15} />
              {isReanalyzing ? "Analyzing..." : "Analyze with Dentarith"}
            </button>
          </section>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="glass-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-modal-content glass-card w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center gap-3 text-red-600">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 font-bold border border-red-200">
                  !
                </span>
                <h3 className="text-base font-bold text-slate-950">
                  Delete Clinical Case?
                </h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                Are you sure you want to delete <span className="font-bold text-slate-900">{caseId}</span>? This will remove the locally stored case and analysis from this browser session.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="glass-button rounded-lg border border-slate-300/80 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="glass-button rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700"
                >
                  Delete Case
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AnalysisView({
  analysis,
}: {
  analysis: ClinicalAnalysis;
}) {
  const sortedDiagnoses = [...analysis.possibleDiagnoses].sort(
    (a, b) => a.rank - b.rank
  );
  const leadingDiagnosis = sortedDiagnoses[0];
  const secondaryDiagnoses = sortedDiagnoses.slice(1);

  const combinedEvidenceMap: EvidenceMapItem[] = [
    ...(analysis.evidenceMap || []),
    ...analysis.possibleDiagnoses.flatMap((d) => d.evidenceMap || []),
  ];

  return (
    <div className="space-y-6">
      {/* Clinical Case Summary */}
      <section className="glass-card p-5 shadow-xs sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-800">
          Clinical Reasoning Summary
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{analysis.summary}</p>
      </section>

      {/* Information Categorization */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card-subtle rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-xs" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Reported Information</h3>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {analysis.reportedInformation.map((r, i) => (
              <li key={`rep-${i}`}>• {r}</li>
            ))}
          </ul>
        </div>
        <div className="glass-card-subtle rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Observed Findings</h3>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {analysis.observedFindings.map((o, i) => (
              <li key={`obs-${i}`}>• {o}</li>
            ))}
          </ul>
        </div>
        <div className="glass-card-subtle rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500 shadow-xs" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Inferred Deductions</h3>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {analysis.inferredFindings.map((inf, i) => (
              <li key={`inf-${i}`}>• {inf}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Clinical Contradictions (if any) */}
      {analysis.contradictions && analysis.contradictions.length > 0 && (
        <section className="glass-card glass-tint-rose rounded-xl border-2 border-rose-300/80 p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-rose-950">
            Contradictions &amp; Inconsistencies Detected
          </h2>
          <div className="mt-3 space-y-2">
            {analysis.contradictions.map((c, i) => (
              <div key={`c-${i}`} className="glass-card-subtle rounded-lg p-3 text-xs border border-rose-200/90 shadow-xs">
                <p><span className="font-bold text-slate-800">Finding:</span> {c.finding}</p>
                <p className="mt-1 text-rose-950"><span className="font-bold">Conflict:</span> {c.conflict}</p>
                <p className="mt-0.5 text-slate-600"><span className="font-bold">Clinical Impact:</span> {c.clinicalImpact}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leading Diagnostic Consideration */}
      {leadingDiagnosis && (
        <section className="glass-card glass-tint-teal rounded-xl border-2 border-teal-600/70 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="glass-chip rounded-full bg-teal-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                Rank #{leadingDiagnosis.rank} — Leading Consideration
              </span>
              <h3 className="text-base font-bold text-slate-950">{leadingDiagnosis.diagnosis}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="glass-chip rounded-full border border-amber-300 bg-amber-50/90 px-2.5 py-0.5 text-[10px] font-semibold text-amber-900 capitalize shadow-xs">
                {leadingDiagnosis.diagnosticCategory}
              </span>
              <span className="glass-chip rounded-full border border-teal-300 bg-teal-100/90 px-2.5 py-0.5 text-[10px] font-semibold text-teal-900 capitalize shadow-xs">
                {leadingDiagnosis.likelihood} likelihood
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-xs text-slate-700">
            {leadingDiagnosis.whyRanksHighest && (
              <div className="glass-card-subtle rounded-lg border border-teal-200/80 p-3 shadow-xs">
                <span className="font-bold text-teal-950">Why It Ranks Highest: </span>
                <span>{leadingDiagnosis.whyRanksHighest}</span>
              </div>
            )}
            <p><span className="font-bold text-slate-900">Clinical Reasoning: </span>{leadingDiagnosis.reasoning}</p>
            <p><span className="font-bold text-slate-900">Diagnostic Uncertainty: </span><span className="text-slate-600">{leadingDiagnosis.confidenceReason}</span></p>
            {leadingDiagnosis.supportingFindings.length > 0 && (
              <p><span className="font-bold text-emerald-800">Supporting Evidence (Findings For): </span>{leadingDiagnosis.supportingFindings.join("; ")}</p>
            )}
            <p>
              <span className="font-bold text-slate-900">Evidence Against / Contradicting Findings: </span>
              {leadingDiagnosis.contradictingFindings && leadingDiagnosis.contradictingFindings.length > 0 ? (
                <span className="text-red-700 font-semibold">{leadingDiagnosis.contradictingFindings.join("; ")}</span>
              ) : (
                <span className="text-slate-500 italic">None identified in recorded presentation</span>
              )}
            </p>
          </div>
        </section>
      )}

      {/* Secondary Diagnoses */}
      {secondaryDiagnoses.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Secondary Considerations
          </h3>
          <div className="space-y-2">
            {secondaryDiagnoses.map((sec, idx) => (
              <div key={`sec-${idx}`} className="glass-card rounded-lg border border-slate-200/80 p-4 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Rank #{sec.rank}: {sec.diagnosis}</h4>
                  <span className="glass-chip rounded-full bg-slate-100/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200/80 shadow-xs">
                    {sec.diagnosticCategory} • {sec.likelihood}
                  </span>
                </div>
                <p className="text-slate-700"><span className="font-semibold text-slate-900">Reasoning: </span>{sec.reasoning}</p>
                {sec.supportingFindings && sec.supportingFindings.length > 0 && (
                  <p className="text-emerald-800"><span className="font-semibold">Supporting Evidence: </span>{sec.supportingFindings.join("; ")}</p>
                )}
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">Evidence Against: </span>
                  {sec.contradictingFindings && sec.contradictingFindings.length > 0
                    ? sec.contradictingFindings.join("; ")
                    : "None identified"}
                </p>
                <p className="text-slate-600"><span className="font-semibold text-slate-900">Uncertainty: </span>{sec.confidenceReason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evidence Map */}
      {combinedEvidenceMap.length > 0 && (
        <section className="glass-card rounded-xl p-5 shadow-xs sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-800">
            Evidence Map: Finding → Interpretation → Relevance
          </h2>
          <div className="mt-3 space-y-2">
            {combinedEvidenceMap.map((mapItem, idx) => (
              <div key={`m-${idx}`} className="glass-card-subtle flex flex-col gap-2 rounded-lg border border-slate-200/80 p-3 text-xs sm:flex-row sm:items-center sm:justify-between shadow-xs">
                <div className="flex-1"><span className="text-[10px] font-bold text-slate-500 uppercase">Finding</span><p className="font-semibold text-slate-900">{mapItem.finding}</p></div>
                <span className="hidden text-teal-700 sm:block">→</span>
                <div className="flex-1"><span className="text-[10px] font-bold text-teal-700 uppercase">Interpretation</span><p className="text-slate-800">{mapItem.interpretation}</p></div>
                <span className="hidden text-teal-700 sm:block">→</span>
                <div className="flex-1"><span className="text-[10px] font-bold text-indigo-700 uppercase">Relevance</span><p className="text-slate-700">{mapItem.diagnosticRelevance}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Differentials */}
      <section className="glass-card rounded-xl p-5 shadow-xs sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-800">
          Differential Diagnoses (To Rule In/Out)
        </h2>
        <div className="mt-3 space-y-2.5">
          {analysis.differentialDiagnosis.map((item, idx) => (
            <div key={`diff-${idx}`} className="glass-card-subtle rounded-lg border border-slate-200/80 p-3.5 text-xs space-y-1 shadow-xs">
              <h4 className="font-bold text-slate-900">{item.diagnosis}</h4>
              <p className="text-slate-700"><span className="font-semibold">Why considered:</span> {item.whyConsidered}</p>
              {(item.supportingEvidence?.length > 0 || item.supportingFindings?.length > 0) && (
                <p className="text-emerald-800">
                  <span className="font-semibold">Supporting Evidence: </span>
                  {(item.supportingEvidence?.length ? item.supportingEvidence : item.supportingFindings).join("; ")}
                </p>
              )}
              {item.evidenceAgainst && item.evidenceAgainst.length > 0 && (
                <p className="text-red-700 font-medium">
                  <span className="font-semibold">Evidence Against: </span>
                  {item.evidenceAgainst.join("; ")}
                </p>
              )}
              {item.missingEvidence && item.missingEvidence.length > 0 && (
                <p className="text-amber-800">
                  <span className="font-semibold">Missing Evidence: </span>
                  {item.missingEvidence.join("; ")}
                </p>
              )}
              {item.whatWouldChangeRanking && (
                <p className="text-indigo-900"><span className="font-semibold">What would change ranking:</span> {item.whatWouldChangeRanking}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Prioritized Missing Information & Suggested Investigations */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass-card rounded-xl p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Missing Information Prioritization
          </h2>
          <ul className="mt-3 space-y-2 text-xs">
            {analysis.missingInformation.map((item, idx) => (
              <li key={`mi-${idx}`} className="border-l-2 border-amber-500 pl-2">
                <span className="font-semibold text-slate-900">{item.item}</span>
                <span className="ml-1 text-[10px] font-bold uppercase text-amber-800">({item.importance})</span>
                <p className="text-[11px] text-slate-500">{item.whyItMatters}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card rounded-xl p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Suggested Investigations
          </h2>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
            {analysis.suggestedInvestigations.map((inv, idx) => (
              <li key={`inv-${idx}`}>• {inv}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* Decision-Changing Evidence */}
      {analysis.decisionChangingEvidence && analysis.decisionChangingEvidence.length > 0 && (
        <section className="glass-card glass-tint-indigo rounded-xl border border-indigo-200/80 p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
            Decision-Changing Evidence (&ldquo;What Would Change My Mind?&rdquo;)
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-indigo-950">
            {analysis.decisionChangingEvidence.map((dce, idx) => (
              <li key={`dce-${idx}`}>• {dce}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Treatment Considerations */}
      <section className="glass-card rounded-xl p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Treatment Considerations (Not Autonomous Orders)
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-slate-700">
          {analysis.treatmentConsiderations.map((tx, idx) => (
            <li key={`tx-${idx}`}>• {tx}</li>
          ))}
        </ul>
      </section>

      {/* Red Flags & Uncertainty */}
      {analysis.redFlags.length > 0 && (
        <section className="glass-card glass-tint-rose rounded-xl border border-rose-300/80 p-4 text-xs text-rose-950 shadow-xs">
          <h2 className="font-bold uppercase tracking-wider">Red Flags &amp; Urgent Alerts</h2>
          <ul className="mt-1 space-y-1">
            {analysis.redFlags.map((rf, idx) => (
              <li key={`rf-${idx}`}>• {rf}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Uncertainty Factors */}
      <section className="glass-card glass-tint-amber rounded-xl border-2 border-dashed border-amber-300/80 p-5 text-xs text-amber-950 shadow-xs">
        <h2 className="font-bold uppercase tracking-wider">Diagnostic Uncertainty &amp; Limitations</h2>
        <ul className="mt-2 space-y-1 text-amber-950">
          {analysis.uncertainty.map((unc, idx) => (
            <li key={`unc-${idx}`}>• {unc}</li>
          ))}
        </ul>
      </section>

      {/* Safety Notice */}
      <div className="glass-card-subtle glass-tint-teal rounded-xl border border-teal-200/80 p-4 text-xs text-teal-950 shadow-xs">
        <p className="leading-5">
          <span className="font-bold">Clinical Safety Notice:</span> Dentarith provides clinical decision support only. It does not replace professional clinical judgment. The treating dental professional must independently verify findings, tests, and recommendations.
        </p>
      </div>
    </div>
  );
}
