"use client";

import { useState } from "react";
import type { StoredCase, ReviewStatus, ClinicianCorrections } from "@/lib/case-storage";
import { reviewCase } from "@/lib/case-storage";
import type { ClinicalAnalysis } from "@/lib/clinical-analysis";
import { Icon } from "@/components/clinical-ui";

interface ClinicianReviewTraceProps {
  storedCase: StoredCase;
  analysis: ClinicalAnalysis | null;
  onCaseUpdated: (updatedCase: StoredCase) => void;
}

export function ClinicianReviewTrace({
  storedCase,
  analysis,
  onCaseUpdated,
}: ClinicianReviewTraceProps) {
  const currentReview = storedCase.review;
  const currentStatus: ReviewStatus =
    storedCase.reviewStatus || currentReview?.status || (storedCase.status === "reviewed" ? "reviewed" : "needs_review");

  const [isEditing, setIsEditing] = useState<boolean>(!currentReview?.reviewedAt);
  const [status, setStatus] = useState<ReviewStatus>(currentStatus);
  const [reviewedBy, setReviewedBy] = useState<string>(
    currentReview?.reviewedBy || ""
  );
  const [finalDiagnosis, setFinalDiagnosis] = useState<string>(
    currentReview?.corrections?.finalDiagnosis ||
      analysis?.possibleDiagnoses?.[0]?.diagnosis ||
      ""
  );
  const [agreedWithAi, setAgreedWithAi] = useState<boolean>(
    currentReview?.corrections?.agreedWithAiDiagnosis ??
      (analysis ? finalDiagnosis.toLowerCase().trim() === analysis.possibleDiagnoses[0]?.diagnosis.toLowerCase().trim() : false)
  );
  const [diagnosisNotes, setDiagnosisNotes] = useState<string>(
    currentReview?.corrections?.diagnosisNotes || ""
  );
  const [treatmentPlan, setTreatmentPlan] = useState<string>(
    currentReview?.corrections?.treatmentPlan ||
      (analysis?.treatmentConsiderations?.join("\n") || "")
  );
  const [treatmentPlanNotes, setTreatmentPlanNotes] = useState<string>(
    currentReview?.corrections?.treatmentPlanNotes || ""
  );
  const [additionalObservations, setAdditionalObservations] = useState<string>(
    currentReview?.corrections?.additionalObservations || ""
  );
  const [reviewNotes, setReviewNotes] = useState<string>(
    currentReview?.notes || ""
  );
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");

  const leadingAiDiagnosis = analysis?.possibleDiagnoses?.[0]?.diagnosis || "None";
  const alternativeDifferentials = [
    ...(analysis?.possibleDiagnoses?.slice(1).map((d) => d.diagnosis) || []),
    ...(analysis?.differentialDiagnosis?.map((d) => d.diagnosis) || []),
  ].filter((d, i, arr) => arr.indexOf(d) === i && d !== leadingAiDiagnosis);

  function handleSelectLeading() {
    if (analysis?.possibleDiagnoses?.[0]) {
      setFinalDiagnosis(analysis.possibleDiagnoses[0].diagnosis);
      setAgreedWithAi(true);
    }
  }

  function handleSelectAlternative(diag: string) {
    setFinalDiagnosis(diag);
    setAgreedWithAi(false);
  }

  function handleAdoptAiTreatment() {
    if (analysis?.treatmentConsiderations) {
      setTreatmentPlan(analysis.treatmentConsiderations.join("\n"));
    }
  }

  function handleSaveReview(targetStatus: ReviewStatus = status) {
    setSaveError("");
    setSaveSuccessMessage("");

    if (targetStatus === "reviewed" && !finalDiagnosis.trim()) {
      setSaveError("Please specify a final clinician diagnosis before marking as reviewed.");
      return;
    }

    const corrections: ClinicianCorrections = {
      agreedWithAiDiagnosis: agreedWithAi,
      finalDiagnosis: finalDiagnosis.trim(),
      diagnosisNotes: diagnosisNotes.trim(),
      treatmentPlan: treatmentPlan.trim(),
      treatmentPlanNotes: treatmentPlanNotes.trim(),
      additionalObservations: additionalObservations.trim(),
    };

    const updated = reviewCase(storedCase.id, {
      status: targetStatus,
      reviewedBy: reviewedBy.trim() || undefined,
      notes: reviewNotes.trim() || undefined,
      corrections,
    });

    if (updated) {
      onCaseUpdated(updated);
      setIsEditing(false);
      setSaveSuccessMessage(
        targetStatus === "reviewed"
          ? "Case marked as Reviewed. Decision trace recorded."
          : `Review updated (Status: ${targetStatus}).`
      );
    } else {
      setSaveError("Failed to save clinician review. Case not found.");
    }
  }

  const isStale = storedCase.analysisStatus === "stale";
  const isReviewed = (storedCase.reviewStatus || currentStatus) === "reviewed";

  return (
    <section className="glass-authority-console rounded-2xl p-5 shadow-lg sm:p-7 relative overflow-hidden space-y-4">
      {/* Header with Title and Distinct Clinician Badge */}
      <div className="flex flex-col gap-3 border-b border-indigo-100/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 shadow-xs">
              <Icon name="report" size={14} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
              Clinician Oversight &amp; Decision Trace
            </span>
            <span className="glass-chip rounded-full bg-indigo-50/90 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 shadow-xs">
              Licensed Dental Authority
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">
            Clinical Review &amp; Decision Trace
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Record attending clinician verification, diagnostic concordance or overrides, and confirmed treatment plans.
          </p>
        </div>

        {/* Current Review Status Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          <ReviewStatusBadge status={storedCase.reviewStatus || currentStatus} isStale={isStale} />
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="glass-pill inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50/80 px-3 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100 shadow-xs"
            >
              Edit Decisions
            </button>
          )}
        </div>
      </div>

      {/* Verified State Locked Banner when Reviewed and not editing */}
      {!isEditing && currentReview && isReviewed && (
        <div className="glass-card-subtle flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300/80 bg-emerald-50/70 p-3.5 text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
              <Icon name="check" size={16} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                Clinician Authority Decision Locked &amp; Verified
              </p>
              <p className="text-[11px] text-emerald-800">
                Signed off by {currentReview.reviewedBy || "Licensed Dental Professional"} {currentReview.reviewedAt ? `on ${new Date(currentReview.reviewedAt).toLocaleString()}` : ""}
              </p>
            </div>
          </div>
          <span className="glass-chip rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-900 border border-emerald-300/80 shadow-xs">
            🔒 Record Signed &amp; Audited
          </span>
        </div>
      )}

      {/* Safety Notice: Clinician Review is independent, does not validate AI model */}
      <div className="glass-card-subtle glass-tint-indigo rounded-xl border border-indigo-100/90 p-3.5 text-xs text-indigo-950 shadow-xs">
        <p className="leading-relaxed">
          <strong className="font-bold text-indigo-900">Clinical Review Protocol:</strong> Recording clinician review documents the licensed attending dentist&apos;s independent clinical oversight and definitive decision trace. Marking a case reviewed records clinical evaluation and does not certify the algorithmic accuracy of assistive AI outputs.
        </p>
      </div>

      {/* Feedback Messages */}
      {saveSuccessMessage && (
        <div className="glass-card-subtle glass-tint-teal mt-3 rounded-lg border border-emerald-300 p-3 text-xs font-semibold text-emerald-900 shadow-xs">
          ✓ {saveSuccessMessage}
        </div>
      )}
      {saveError && (
        <div className="glass-card-subtle glass-tint-rose mt-3 rounded-lg border border-red-300 p-3 text-xs font-semibold text-red-900 shadow-xs">
          ⚠️ {saveError}
        </div>
      )}

      {/* READ-ONLY VIEW (when saved & not editing) */}
      {!isEditing && currentReview && (
        <div className="mt-5 space-y-5 text-xs">
          {/* Metadata Bar */}
          <div className="glass-card-subtle flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 border border-slate-200/80 text-slate-700 shadow-xs">
            <div>
              <span className="font-bold text-slate-900">Reviewing Clinician: </span>
              <span>{currentReview.reviewedBy || "Licensed Dental Professional"}</span>
            </div>
            <div>
              <span className="font-bold text-slate-900">Review Status: </span>
              <span className="capitalize font-semibold">{currentReview.status.replace("_", " ")}</span>
            </div>
            {currentReview.reviewedAt && (
              <div>
                <span className="font-bold text-slate-900">Timestamp: </span>
                <span>{new Date(currentReview.reviewedAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* AI vs Clinician Diagnostic Trace (Side-by-Side or Stacked) */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* AI Leading Hypothesis */}
            <div className="glass-card glass-tint-teal rounded-xl border border-teal-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  AI Assistive Hypothesis (Preserved Original)
                </span>
                <span className="glass-chip rounded bg-teal-100/90 px-1.5 py-0.5 text-[9px] font-bold text-teal-800 border border-teal-200/60 shadow-xs">
                  Non-Autonomous
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-950">{leadingAiDiagnosis}</p>
              {analysis?.possibleDiagnoses?.[0] && (
                <p className="mt-1 text-[11px] text-slate-600">
                  Category: <span className="capitalize font-semibold">{analysis.possibleDiagnoses[0].diagnosticCategory}</span> • Likelihood: <span className="capitalize font-semibold">{analysis.possibleDiagnoses[0].likelihood}</span>
                </p>
              )}
              {analysis?.possibleDiagnoses?.[0]?.whyRanksHighest && (
                <p className="glass-card-subtle mt-2 text-[11px] text-teal-950 p-2 rounded border border-teal-100 shadow-xs">
                  <strong>AI Basis:</strong> {analysis.possibleDiagnoses[0].whyRanksHighest}
                </p>
              )}
            </div>

            {/* Clinician Confirmed Decision */}
            <div className="glass-card glass-tint-indigo rounded-xl border-2 border-indigo-300/90 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                  Clinician Confirmed Diagnosis (Final Authority)
                </span>
                <span
                  className={`glass-chip rounded px-1.5 py-0.5 text-[9px] font-bold border shadow-xs ${
                    currentReview.corrections?.agreedWithAiDiagnosis
                      ? "border-emerald-300 bg-emerald-100/90 text-emerald-800"
                      : "border-amber-300 bg-amber-100/90 text-amber-900"
                  }`}
                >
                  {currentReview.corrections?.agreedWithAiDiagnosis
                    ? "✓ Concurred with AI"
                    : "⚡ Clinician Overrode / Customized"}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-indigo-950">
                {currentReview.corrections?.finalDiagnosis || leadingAiDiagnosis}
              </p>
              {currentReview.corrections?.diagnosisNotes && (
                <p className="glass-card-subtle mt-2 text-[11px] text-slate-700 p-2.5 rounded border border-indigo-100/80 leading-relaxed shadow-xs">
                  <strong>Clinician Rationale:</strong> {currentReview.corrections.diagnosisNotes}
                </p>
              )}
            </div>
          </div>

          {/* Confirmed Treatment Plan */}
          {(currentReview.corrections?.treatmentPlan || currentReview.corrections?.treatmentPlanNotes) && (
            <div className="glass-card-subtle rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                Confirmed Treatment Plan &amp; Procedural Orders
              </span>
              {currentReview.corrections?.treatmentPlan && (
                <pre className="mt-2 whitespace-pre-wrap font-sans text-xs font-semibold text-slate-900 bg-white/90 p-3 rounded-lg border border-slate-200/80 shadow-xs">
                  {currentReview.corrections.treatmentPlan}
                </pre>
              )}
              {currentReview.corrections?.treatmentPlanNotes && (
                <p className="mt-2 text-[11px] text-slate-600">
                  <strong>Treatment Rationale:</strong> {currentReview.corrections.treatmentPlanNotes}
                </p>
              )}
            </div>
          )}

          {/* Additional Observations & Notes */}
          {(currentReview.corrections?.additionalObservations || currentReview.notes) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentReview.corrections?.additionalObservations && (
                <div className="glass-card-subtle rounded-lg border border-slate-200/80 p-3 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Additional Observations</span>
                  <p className="mt-1 text-slate-700">{currentReview.corrections.additionalObservations}</p>
                </div>
              )}
              {currentReview.notes && (
                <div className="glass-card-subtle rounded-lg border border-slate-200/80 p-3 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Review Notes</span>
                  <p className="mt-1 text-slate-700">{currentReview.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* EDITING / INPUT FORM VIEW */}
      {isEditing && (
        <div className="mt-5 space-y-6 text-xs">
          {/* Reviewer Details & Status Selector */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reviewedBy" className="block font-bold text-slate-800">
                Attending Clinician (Name &amp; License ID)
              </label>
              <input
                id="reviewedBy"
                type="text"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                placeholder="e.g. Dr. Jane Smith, DDS (State Lic #98765)"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800">Review State</label>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("reviewed")}
                  className={`glass-button flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    status === "reviewed"
                      ? "border-emerald-600 bg-emerald-50/90 text-emerald-900 ring-2 ring-emerald-500/30 shadow-xs"
                      : "border-slate-300/80 bg-white/70 text-slate-700 hover:bg-white"
                  }`}
                >
                  ✓ Reviewed
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("needs_review")}
                  className={`glass-button flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    status === "needs_review"
                      ? "border-amber-500 bg-amber-50/90 text-amber-900 ring-2 ring-amber-500/30 shadow-xs"
                      : "border-slate-300/80 bg-white/70 text-slate-700 hover:bg-white"
                  }`}
                >
                  ⚠️ Needs Review
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("pending")}
                  className={`glass-button flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    status === "pending"
                      ? "border-slate-500 bg-slate-100/90 text-slate-900 ring-2 ring-slate-400/30 shadow-xs"
                      : "border-slate-300/80 bg-white/70 text-slate-700 hover:bg-white"
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostic Decision Trace */}
          <div className="glass-card-subtle glass-tint-indigo rounded-xl border border-indigo-200/90 p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              1. Diagnostic Decision &amp; Concordance
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Compare with AI leading hypothesis and confirm final clinician diagnosis.
            </p>

            {/* Quick Actions to Select Diagnoses */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectLeading}
                className={`glass-button rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  agreedWithAi && finalDiagnosis === leadingAiDiagnosis
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                    : "border-emerald-300 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                ✓ Concur with AI Leading: &ldquo;{leadingAiDiagnosis}&rdquo;
              </button>

              {alternativeDifferentials.map((alt) => (
                <button
                  key={alt}
                  type="button"
                  onClick={() => handleSelectAlternative(alt)}
                  className={`glass-button rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    !agreedWithAi && finalDiagnosis === alt
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                      : "border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white"
                  }`}
                >
                  Adopt &ldquo;{alt}&rdquo;
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="finalDiagnosis" className="block font-bold text-slate-900">
                  Confirmed Clinician Diagnosis <span className="text-red-500">*</span>
                </label>
                <input
                  id="finalDiagnosis"
                  type="text"
                  value={finalDiagnosis}
                  onChange={(e) => {
                    setFinalDiagnosis(e.target.value);
                    setAgreedWithAi(
                      analysis
                        ? e.target.value.toLowerCase().trim() ===
                            leadingAiDiagnosis.toLowerCase().trim()
                        : false
                    );
                  }}
                  placeholder="Enter final clinical diagnosis"
                  className="mt-1 w-full rounded-lg border border-slate-300/90 bg-white/90 p-2.5 text-xs font-semibold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="diagnosisNotes" className="block font-bold text-slate-900">
                  Diagnostic Rationale / Concordance Notes
                </label>
                <input
                  id="diagnosisNotes"
                  type="text"
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  placeholder="Clinical reasons for concurrence or override"
                  className="mt-1 w-full rounded-lg border border-slate-300/90 bg-white/90 p-2.5 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Treatment Decision Trace */}
          <div className="glass-card-subtle rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Confirmed Treatment Plan &amp; Procedures
                </h3>
                <p className="text-[11px] text-slate-500">
                  Define the intended clinical plan based on your definitive diagnosis.
                </p>
              </div>
              {analysis?.treatmentConsiderations && analysis.treatmentConsiderations.length > 0 && (
                <button
                  type="button"
                  onClick={handleAdoptAiTreatment}
                  className="glass-button rounded-lg border border-teal-300 bg-teal-50/90 px-2.5 py-1 text-[11px] font-semibold text-teal-800 transition hover:bg-teal-100 shadow-xs"
                >
                  Adopt AI Treatment Suggestions
                </button>
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="treatmentPlan" className="block font-bold text-slate-700">
                  Confirmed Treatment Plan
                </label>
                <textarea
                  id="treatmentPlan"
                  rows={3}
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="e.g. 1. Endodontic treatment on Tooth 36&#10;2. Post-endodontic coronal seal and crown"
                  className="mt-1 w-full rounded-lg border border-slate-300/90 bg-white/90 p-2.5 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="treatmentPlanNotes" className="block font-bold text-slate-700">
                  Treatment Rationale &amp; Considerations
                </label>
                <textarea
                  id="treatmentPlanNotes"
                  rows={3}
                  value={treatmentPlanNotes}
                  onChange={(e) => setTreatmentPlanNotes(e.target.value)}
                  placeholder="e.g. Irreversible symptoms warrant pulp extirpation. Caries depth requires indirect restoration."
                  className="mt-1 w-full rounded-lg border border-slate-300/90 bg-white/90 p-2.5 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Additional Chairside Observations & General Notes */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="additionalObservations" className="block font-bold text-slate-700">
                Additional Chairside Observations
              </label>
              <textarea
                id="additionalObservations"
                rows={2}
                value={additionalObservations}
                onChange={(e) => setAdditionalObservations(e.target.value)}
                placeholder="Any unrecorded anatomical, behavioral, or systemic nuances"
                className="mt-1 w-full rounded-lg border border-slate-300/90 bg-white/90 p-2.5 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="reviewNotes" className="block font-bold text-slate-700">
                Overall Review Notes
              </label>
              <textarea
                id="reviewNotes"
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Audit notes or instructions for clinical team"
                className="mt-1 w-full rounded-lg border border-slate-300/90 bg-white/90 p-2.5 text-xs text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Save Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
            {currentReview?.reviewedAt && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="glass-pill rounded-lg border border-slate-300/80 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white shadow-xs"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSaveReview("needs_review")}
              className="glass-pill rounded-lg border border-amber-300 bg-amber-50/90 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 shadow-xs"
            >
              Save as Needs Review
            </button>

            <button
              type="button"
              onClick={() => handleSaveReview("reviewed")}
              className="glass-pill glass-shine rounded-lg bg-indigo-700 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-800"
            >
              ✓ Save &amp; Mark as Reviewed
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewStatusBadge({
  status,
  isStale,
}: {
  status: ReviewStatus;
  isStale: boolean;
}) {
  if (isStale) {
    return (
      <span className="glass-chip inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50/90 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Needs Re-Review (Stale Clinical Data)
      </span>
    );
  }

  if (status === "reviewed") {
    return (
      <span className="glass-chip inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-50/90 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Clinician Reviewed
      </span>
    );
  }

  if (status === "needs_review") {
    return (
      <span className="glass-chip inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50/90 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Needs Clinician Review
      </span>
    );
  }

  return (
    <span className="glass-chip inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50/90 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Review Pending
    </span>
  );
}
