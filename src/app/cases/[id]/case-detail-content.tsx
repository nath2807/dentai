"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AppShell,
  Icon,
  ToothPill,
  LikelihoodBadge,
  CategoryBadge,
  CaseStatusPill,
  LiquidGlassSkeleton,
} from "@/components/clinical-ui";
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
  const [analysisElapsed, setAnalysisElapsed] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState("");

  useEffect(() => {
    if (!isReanalyzing) return;
    const interval = setInterval(() => {
      setAnalysisElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isReanalyzing]);

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
    setAnalysisElapsed(0);
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
          ? "Analysis timed out (exceeded 35s budget). Please verify your network connection and try again."
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
          <div className="glass-panel p-12 text-center shadow-lg">
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
                className="glass-pill glass-shine inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800 shadow-xs"
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
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Case {caseId}
              </h1>
              <CaseStatusPill
                status={status}
                analysisStatus={storedCase.analysisStatus}
                reviewStatus={storedCase.reviewStatus}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Recorded on {new Date(storedCase.createdAt).toLocaleDateString()} • Last updated {new Date(storedCase.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/cases"
              className="glass-pill inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white/70 px-3 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800 shadow-xs"
            >
              <Icon name="arrow" size={14} />
              Back
            </Link>
            <Link
              href={`/cases/new?id=${encodeURIComponent(caseId)}`}
              className="glass-pill inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white/70 px-3 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800 shadow-xs"
            >
              Edit Case
            </Link>
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="glass-pill inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-600/70 bg-teal-50/80 px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 disabled:opacity-50 shadow-xs"
            >
              <Icon name="spark" size={14} className={isReanalyzing ? "animate-spin text-teal-600" : ""} />
              {isReanalyzing ? `Analyzing (${analysisElapsed}s)...` : "Re-analyze"}
            </button>
            {analysis && (
              <Link
                href={`/cases/${encodeURIComponent(caseId)}/report`}
                className="glass-pill glass-shine inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800"
              >
                <Icon name="report" size={14} />
                Generate Report
              </Link>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="glass-pill inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200/80 bg-white/70 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 hover:border-rose-300 shadow-xs"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Re-analyze error alert if any */}
        {reanalyzeError && (
          <div className="glass-card glass-tint-rose flex items-center justify-between rounded-xl border border-red-300 p-4 text-xs text-red-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold">Error:</span>
              <span>{reanalyzeError}</span>
            </div>
            <button
              onClick={handleReanalyze}
              className="glass-pill rounded-md bg-red-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stale Analysis Warning Banner */}
        {isStale && (
          <div className="glass-card glass-tint-amber flex items-start justify-between gap-4 p-4 rounded-xl border-2 border-amber-300/80 text-amber-950 shadow-md">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900 shadow-xs border border-amber-300">
                !
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Stale Clinical Analysis &bull; Re-Verification Required
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-900/90">
                  Clinical examination inputs or periodontal probing data were modified after this AI assessment was generated. This analysis reflects earlier diagnostic findings.
                </p>
              </div>
            </div>
            <button
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="glass-pill glass-shine shrink-0 rounded-lg bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-800 disabled:opacity-50"
            >
              {isReanalyzing ? "Re-analyzing..." : "Re-analyze Now"}
            </button>
          </div>
        )}

        {/* Synthetic Benchmark Educational Disclaimer */}
        {caseId.startsWith("CASE-BENCH") && (
          <div className="glass-card-subtle glass-tint-amber flex items-start gap-3 p-4 rounded-xl text-xs text-amber-950 shadow-xs">
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
        {isReanalyzing ? (
          <div className="space-y-4">
            <div className="glass-panel flex items-center justify-between rounded-xl px-5 py-3 text-white shadow-md border border-teal-500/30 bg-gradient-to-r from-teal-800/90 to-teal-900/95">
              <div className="flex items-center gap-2.5">
                <Icon name="spark" size={18} className="animate-spin text-teal-300" />
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    Dentarith AI Reasoning Pipeline Active
                  </h2>
                  <p className="text-[10px] text-teal-100/90">
                    Synthesizing clinical findings &bull; Differential reasoning &bull; Elapsed: {analysisElapsed}s
                  </p>
                </div>
              </div>
              <span className="glass-chip rounded-full bg-teal-700/80 px-2.5 py-0.5 text-[10px] font-semibold text-white border border-teal-500/40 shadow-xs">
                In Flight ({analysisElapsed}s)
              </span>
            </div>
            <LiquidGlassSkeleton elapsedSeconds={analysisElapsed} />
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="glass-panel flex items-center justify-between rounded-xl px-5 py-3.5 text-white shadow-md border border-teal-500/30 bg-gradient-to-r from-teal-800/95 via-teal-900/95 to-slate-900/95">
              <div className="flex items-center gap-2.5">
                <Icon name="spark" size={18} className="text-teal-300" />
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    Dentarith AI Clinical Intelligence
                  </h2>
                  <p className="text-[10px] text-teal-100/90">
                    Preserved diagnostic hypotheses &bull; Assistive only &bull; Licensed clinician retains final diagnosis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="glass-chip rounded-full bg-teal-700/80 px-2.5 py-0.5 text-[10px] font-semibold text-white border border-teal-500/40 shadow-xs">
                  AI Differential Output
                </span>
              </div>
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
              className="glass-pill glass-shine mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 shadow-xs"
            >
              <Icon name="spark" size={15} />
              {isReanalyzing ? "Analyzing..." : "Analyze with Dentarith"}
            </button>
          </section>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="glass-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-modal-content glass-panel w-full max-w-md p-6 shadow-2xl">
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
                  className="glass-pill rounded-lg border border-slate-300/80 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="glass-pill rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700"
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
        <div className="flex items-center gap-2 text-teal-800">
          <Icon name="spark" size={16} />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Clinical Reasoning Summary
          </h2>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-800 sm:text-sm">
          {analysis.summary}
        </p>
      </section>

      {/* Observation vs. Interpretation Split */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-teal-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Observation vs. AI Interpretation Split
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Raw Findings vs. Synthesized Reasoning
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left Column: Objective Clinical Observations */}
          <div className="glass-card rounded-2xl border-2 border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-teal-800 text-xs font-bold">
                  ✓
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Ground-Truth Observations
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Patient-reported history &amp; clinician objective exam findings
                  </p>
                </div>
              </div>
              <span className="glass-chip rounded-full bg-slate-100/90 px-2 py-0.5 text-[9px] font-bold text-slate-700">
                Direct Findings
              </span>
            </div>

            {/* Reported Information */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Patient Reported Information ({analysis.reportedInformation.length})
              </span>
              <ul className="mt-2 space-y-1.5 text-xs">
                {analysis.reportedInformation.map((r, i) => (
                  <li
                    key={`rep-${i}`}
                    className="glass-card-subtle flex items-start gap-2 rounded-lg p-2 text-slate-700"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Observed Findings */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Clinician Observed Exam Findings ({analysis.observedFindings.length})
              </span>
              <ul className="mt-2 space-y-1.5 text-xs">
                {analysis.observedFindings.map((o, i) => (
                  <li
                    key={`obs-${i}`}
                    className="glass-card-subtle flex items-start gap-2 rounded-lg p-2 text-slate-800 font-medium"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: AI Synthesized Clinical Interpretations */}
          <div className="glass-card glass-tint-indigo rounded-2xl border-2 border-indigo-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold">
                  <Icon name="spark" size={13} />
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    AI Clinical Interpretations
                  </h4>
                  <p className="text-[10px] text-indigo-900/70">
                    Diagnostic inferences &bull; Inferred clinical deductions
                  </p>
                </div>
              </div>
              <span className="glass-chip rounded-full bg-indigo-100/90 px-2 py-0.5 text-[9px] font-bold text-indigo-800 border border-indigo-200/80">
                Machine Inferred
              </span>
            </div>

            {/* Inferred Findings */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                Inferred Deductions ({analysis.inferredFindings.length})
              </span>
              <ul className="mt-2 space-y-1.5 text-xs">
                {analysis.inferredFindings.map((inf, i) => (
                  <li
                    key={`inf-${i}`}
                    className="glass-card-subtle flex items-start gap-2 rounded-lg p-2.5 text-indigo-950 font-medium border border-indigo-100/90"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                    <span>{inf}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Analytical Note */}
            <div className="rounded-xl border border-indigo-200/80 bg-white/70 p-3 text-[11px] text-indigo-950 leading-relaxed shadow-xs">
              <span className="font-bold">Interpretation Governance:</span> Inferences represent probabilistic deductions synthesized from recorded clinical tests. Unrecorded variables are never assumed negative.
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Contradictions (if any) */}
      {analysis.contradictions && analysis.contradictions.length > 0 && (
        <section className="glass-card glass-tint-rose rounded-2xl border-2 border-rose-300/80 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-rose-950">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-200 text-xs font-bold text-rose-900">
              !
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Diagnostic Inconsistencies &amp; Contradictions Detected
              </h2>
              <p className="text-[10px] text-rose-900/80">
                Conflicts between reported symptoms, physical examination tests, and expected pathology
              </p>
            </div>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {analysis.contradictions.map((c, i) => (
              <div
                key={`c-${i}`}
                className="glass-card rounded-xl border border-rose-200/90 p-3.5 text-xs space-y-1.5 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Finding:
                  </span>
                  <span className="font-bold text-slate-900">{c.finding}</span>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-rose-50/80 p-2 text-rose-950 border border-rose-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 text-rose-900">
                    Conflict:
                  </span>
                  <span className="font-medium">{c.conflict}</span>
                </div>
                <p className="text-[11px] text-slate-600 pl-1">
                  <strong className="text-slate-800">Clinical Impact:</strong> {c.clinicalImpact}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leading Diagnostic Consideration */}
      {leadingDiagnosis && (
        <section className="glass-card glass-tint-teal rounded-2xl border-2 border-teal-500/80 p-5 shadow-md sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-200/70 pb-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="glass-chip rounded-full bg-teal-700 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                Rank #{leadingDiagnosis.rank} &bull; Primary Consideration
              </span>
              <h3 className="text-lg font-bold text-slate-950 sm:text-xl">
                {leadingDiagnosis.diagnosis}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <CategoryBadge category={leadingDiagnosis.diagnosticCategory} />
              <LikelihoodBadge likelihood={leadingDiagnosis.likelihood} />
            </div>
          </div>

          <div className="mt-4 space-y-3.5 text-xs text-slate-700">
            {/* Specular Callout for whyRanksHighest */}
            {leadingDiagnosis.whyRanksHighest && (
              <div className="glass-card rounded-xl border border-teal-300/90 bg-teal-50/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] text-teal-950">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-900">
                  <Icon name="spark" size={14} className="text-teal-700" />
                  <span>Primary Differential Justification (Why It Ranks Highest)</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed font-semibold text-teal-950">
                  {leadingDiagnosis.whyRanksHighest}
                </p>
              </div>
            )}

            <div className="glass-card-subtle rounded-xl p-3.5 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Clinical Reasoning Rationale
              </span>
              <p className="text-xs leading-relaxed text-slate-800">
                {leadingDiagnosis.reasoning}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Supporting Evidence Chips */}
              <div className="glass-card-subtle rounded-xl p-3 border border-emerald-200/80 bg-emerald-50/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                  Supporting Evidence (Findings For)
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {leadingDiagnosis.supportingFindings.length > 0 ? (
                    leadingDiagnosis.supportingFindings.map((finding, idx) => (
                      <span
                        key={`sup-${idx}`}
                        className="glass-chip rounded-full bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-950 shadow-xs"
                      >
                        ✓ {finding}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">None recorded</span>
                  )}
                </div>
              </div>

              {/* Contradicting Evidence Chips */}
              <div className="glass-card-subtle rounded-xl p-3 border border-rose-200/80 bg-rose-50/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900">
                  Contradicting Findings (Evidence Against)
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {leadingDiagnosis.contradictingFindings && leadingDiagnosis.contradictingFindings.length > 0 ? (
                    leadingDiagnosis.contradictingFindings.map((finding, idx) => (
                      <span
                        key={`contra-${idx}`}
                        className="glass-chip rounded-full bg-rose-100/90 border border-rose-300/80 px-2 py-0.5 text-[10px] font-semibold text-rose-950 shadow-xs"
                      >
                        ✕ {finding}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">
                      None identified in recorded presentation
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 pl-1">
              <strong className="text-slate-800">Diagnostic Uncertainty &amp; Nuance: </strong>
              <span>{leadingDiagnosis.confidenceReason}</span>
            </p>
          </div>
        </section>
      )}

      {/* Secondary Diagnoses */}
      {secondaryDiagnoses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="flex h-2 w-2 rounded-full bg-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Secondary Considerations ({secondaryDiagnoses.length})
            </h3>
          </div>
          <div className="space-y-2.5">
            {secondaryDiagnoses.map((sec, idx) => (
              <div
                key={`sec-${idx}`}
                className="glass-card rounded-xl border border-slate-200/80 p-4 text-xs space-y-2 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="glass-chip rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-800">
                      Rank #{sec.rank}
                    </span>
                    <h4 className="font-bold text-slate-950 text-sm">{sec.diagnosis}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CategoryBadge category={sec.diagnosticCategory} />
                    <LikelihoodBadge likelihood={sec.likelihood} />
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">Reasoning: </strong>
                  {sec.reasoning}
                </p>

                {/* Chips for supporting and contradicting */}
                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  {sec.supportingFindings && sec.supportingFindings.length > 0 && (
                    <div className="flex items-center gap-1 text-emerald-800">
                      <span className="font-semibold">Supporting:</span>
                      <span>{sec.supportingFindings.join("; ")}</span>
                    </div>
                  )}
                  {sec.contradictingFindings && sec.contradictingFindings.length > 0 && (
                    <div className="flex items-center gap-1 text-rose-800">
                      <span className="font-semibold">Against:</span>
                      <span>{sec.contradictingFindings.join("; ")}</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  <strong>Uncertainty: </strong>
                  {sec.confidenceReason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evidence Map */}
      {combinedEvidenceMap.length > 0 && (
        <section className="glass-card rounded-2xl p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-2 text-teal-800">
            <Icon name="chart" size={16} />
            <h2 className="text-xs font-bold uppercase tracking-wider">
              Evidence Map: Finding &rarr; Interpretation &rarr; Diagnostic Relevance
            </h2>
          </div>
          <div className="mt-3.5 space-y-2">
            {combinedEvidenceMap.map((mapItem, idx) => (
              <div
                key={`m-${idx}`}
                className="glass-card-subtle flex flex-col gap-2 rounded-xl border border-slate-200/80 p-3 text-xs sm:flex-row sm:items-center sm:justify-between shadow-xs"
              >
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Finding</span>
                  <p className="font-semibold text-slate-950">{mapItem.finding}</p>
                </div>
                <span className="hidden text-teal-700 font-bold sm:block">&rarr;</span>
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-teal-700 uppercase tracking-wider">Interpretation</span>
                  <p className="text-slate-800">{mapItem.interpretation}</p>
                </div>
                <span className="hidden text-teal-700 font-bold sm:block">&rarr;</span>
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Relevance</span>
                  <p className="text-slate-700">{mapItem.diagnosticRelevance}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Differentials */}
      <section className="glass-card rounded-2xl p-5 shadow-xs sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-teal-800">
          Differential Diagnoses (To Rule In / Rule Out)
        </h2>
        <div className="mt-3.5 space-y-3">
          {analysis.differentialDiagnosis.map((item, idx) => (
            <div
              key={`diff-${idx}`}
              className="glass-card-subtle rounded-xl border border-slate-200/80 p-4 text-xs space-y-1.5 shadow-xs"
            >
              <h4 className="font-bold text-slate-950 text-sm">{item.diagnosis}</h4>
              <p className="text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">Why considered:</span> {item.whyConsidered}
              </p>
              {(item.supportingEvidence?.length > 0 || item.supportingFindings?.length > 0) && (
                <p className="text-emerald-800">
                  <span className="font-semibold">Supporting Evidence: </span>
                  {(item.supportingEvidence?.length ? item.supportingEvidence : item.supportingFindings).join("; ")}
                </p>
              )}
              {item.evidenceAgainst && item.evidenceAgainst.length > 0 && (
                <p className="text-rose-700 font-medium">
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
                <p className="text-indigo-900 font-medium">
                  <span className="font-semibold">What would change ranking:</span> {item.whatWouldChangeRanking}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Prioritized Missing Information & Suggested Investigations */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass-card rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Prioritized Missing Information
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {analysis.missingInformation.map((item, idx) => {
              const badgeClass =
                item.importance === "critical"
                  ? "border-rose-300 bg-rose-100 text-rose-900"
                  : item.importance === "important"
                  ? "border-amber-300 bg-amber-100 text-amber-900"
                  : "border-slate-300 bg-slate-100 text-slate-800";
              const borderAccent =
                item.importance === "critical"
                  ? "border-l-rose-500"
                  : item.importance === "important"
                  ? "border-l-amber-500"
                  : "border-l-slate-400";

              return (
                <li
                  key={`mi-${idx}`}
                  className={`glass-card-subtle rounded-r-lg border-l-4 ${borderAccent} p-2.5 shadow-xs`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-950">{item.item}</span>
                    <span
                      className={`glass-chip rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${badgeClass}`}
                    >
                      {item.importance}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    {item.whyItMatters}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="glass-card rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-teal-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Suggested Investigations
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-800">
            {analysis.suggestedInvestigations.map((inv, idx) => (
              <li
                key={`inv-${idx}`}
                className="glass-card-subtle flex items-start gap-2 rounded-lg p-2.5 shadow-xs"
              >
                <span className="text-teal-700 font-bold">&bull;</span>
                <span>{inv}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Decision-Changing Evidence */}
      {analysis.decisionChangingEvidence && analysis.decisionChangingEvidence.length > 0 && (
        <section className="glass-card glass-tint-indigo rounded-2xl border border-indigo-200/80 p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
            Decision-Changing Evidence (&ldquo;What Would Change My Mind?&rdquo;)
          </h2>
          <ul className="mt-2.5 space-y-1.5 text-xs text-indigo-950 font-medium">
            {analysis.decisionChangingEvidence.map((dce, idx) => (
              <li key={`dce-${idx}`} className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">&bull;</span>
                <span>{dce}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Treatment Considerations */}
      <section className="glass-card rounded-2xl p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Treatment Considerations (Assistive Recommendations &bull; Not Autonomous Orders)
        </h2>
        <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
          {analysis.treatmentConsiderations.map((tx, idx) => (
            <li
              key={`tx-${idx}`}
              className="glass-card-subtle flex items-start gap-2 rounded-lg p-2 text-slate-800 font-medium"
            >
              <span className="text-teal-700 font-bold">&bull;</span>
              <span>{tx}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Red Flags & Urgent Alerts */}
      {analysis.redFlags.length > 0 && (
        <section className="glass-card glass-tint-rose rounded-2xl border border-rose-300/80 p-5 text-xs text-rose-950 shadow-xs">
          <h2 className="font-bold uppercase tracking-wider text-rose-950">
            Red Flags &amp; Urgent Clinical Alerts
          </h2>
          <ul className="mt-2 space-y-1 font-medium">
            {analysis.redFlags.map((rf, idx) => (
              <li key={`rf-${idx}`}>&bull; {rf}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Uncertainty Factors */}
      <section className="glass-card glass-tint-amber rounded-2xl border-2 border-dashed border-amber-300/80 p-5 text-xs text-amber-950 shadow-xs">
        <h2 className="font-bold uppercase tracking-wider text-amber-950">
          Diagnostic Uncertainty &amp; Limitations
        </h2>
        <ul className="mt-2 space-y-1 text-amber-900 font-medium">
          {analysis.uncertainty.map((unc, idx) => (
            <li key={`unc-${idx}`}>&bull; {unc}</li>
          ))}
        </ul>
      </section>

      {/* Safety Notice */}
      <div className="glass-card-subtle glass-tint-teal rounded-2xl border border-teal-200/80 p-4 text-xs text-teal-950 shadow-xs">
        <p className="leading-relaxed">
          <span className="font-bold">Clinical Safety Notice:</span> Dentarith provides clinical decision support only. It does not replace professional clinical judgment. The treating dental professional must independently verify findings, tests, and recommendations.
        </p>
      </div>
    </div>
  );
}
