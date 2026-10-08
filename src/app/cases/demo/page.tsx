"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, Icon } from "@/components/clinical-ui";
import {
  ClinicalAnalysis,
  type ClinicalAnalysis as ClinicalAnalysisType,
  type PossibleDiagnosis,
  type DifferentialDiagnosisItem,
} from "@/lib/clinical-analysis";

const analysisKey = "dentai-clinical-analysis";

export default function DemoResultsPage() {
  const [analysis, setAnalysis] = useState<ClinicalAnalysisType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.sessionStorage.getItem(analysisKey);
      if (saved) {
        try {
          const result = ClinicalAnalysis.safeParse(JSON.parse(saved));
          if (result.success) setAnalysis(result.data);
        } catch {
          window.sessionStorage.removeItem(analysisKey);
        }
      }
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppShell activeItem="New Case">
      <div className="mx-auto max-w-5xl space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Clinical Decision Support / Case Assessment
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Clinical Reasoning &amp; Differential Review
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Evidence-traceable diagnostic suggestions for licensed clinician review.
            </p>
          </div>
          <Link
            href="/cases/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-800"
          >
            <Icon name="arrow" size={15} />
            Back to Case Form
          </Link>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <LoadingState />
        ) : analysis ? (
          <AnalysisContent analysis={analysis} />
        ) : (
          <EmptyState />
        )}

        {/* Footer Disclaimer */}
        <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/70 p-4 text-xs text-teal-950">
          <Icon name="folder" size={17} />
          <p className="leading-5">
            <span className="font-bold">Clinical Safety Notice:</span> DentAI is an assistive clinical decision-support copilot, not an autonomous medical diagnostic device. All recommendations, differential diagnoses, and treatment considerations must be independently evaluated by a licensed dental professional before establishing a definitive diagnosis or initiating care.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function LoadingState() {
  return (
    <div role="status" className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
      <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      Loading clinical assessment and reasoning...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-xs leading-6 text-amber-950">
      No validated assessment is available for this case.{" "}
      <Link href="/cases/new" className="font-semibold underline">
        Return to the case form
      </Link>{" "}
      to submit clinical findings.
    </div>
  );
}

function AnalysisContent({ analysis }: { analysis: ClinicalAnalysisType }) {
  return (
    <div className="space-y-6">
      {/* Clinician Advisory Header */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
        <Icon name="spark" size={18} />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
            DentAI Decision Support Output (Non-Autonomous)
          </p>
          <p className="mt-0.5 text-xs leading-5 text-amber-900/80">
            Findings are separated into reported, observed, and inferred categories to ensure evidence traceability.
          </p>
        </div>
      </div>

      {/* 1. Clinical Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-800">
          Clinical Case Summary
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{analysis.summary}</p>
      </section>

      {/* 2. Information Categorization: Reported vs Observed vs Inferred */}
      <section className="grid gap-4 sm:grid-cols-3">
        {/* Reported Information */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Reported Information
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Patient-stated timeline &amp; symptoms</p>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-600">
            {analysis.reportedInformation.length ? (
              analysis.reportedInformation.map((item, idx) => (
                <li key={`rep-${idx}`} className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="italic text-slate-400">None reported</li>
            )}
          </ul>
        </div>

        {/* Observed Findings */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Observed Clinical Findings
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Objective clinician-verified signs</p>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-600">
            {analysis.observedFindings.length ? (
              analysis.observedFindings.map((item, idx) => (
                <li key={`obs-${idx}`} className="flex gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="italic text-slate-400">None observed</li>
            )}
          </ul>
        </div>

        {/* Inferred Findings */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              AI-Inferred Findings
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Deductions (not directly observed)</p>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-slate-600">
            {analysis.inferredFindings.length ? (
              analysis.inferredFindings.map((item, idx) => (
                <li key={`inf-${idx}`} className="flex gap-2">
                  <span className="text-purple-500">•</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="italic text-slate-400">No inferred deductions</li>
            )}
          </ul>
        </div>
      </section>

      {/* 3. Problem List */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Identified Clinical Problem List
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {analysis.problemList.map((problem, idx) => (
            <span
              key={`prob-${idx}`}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800"
            >
              {problem}
            </span>
          ))}
        </div>
      </section>

      {/* 4. Possible Diagnoses with Evidence Traceability */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-800">
            Possible Diagnoses &amp; Evidence Traceability
          </h2>
          <span className="text-[11px] text-slate-500">Requires clinician validation</span>
        </div>
        <div className="mt-4 space-y-4">
          {analysis.possibleDiagnoses.map((item, idx) => (
            <DiagnosisCard key={`diag-${idx}`} item={item} />
          ))}
        </div>
      </section>

      {/* 5. Differential Diagnoses */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-800">
          Differential Diagnoses (Considerations to Rule In/Out)
        </h2>
        <div className="mt-4 space-y-3">
          {analysis.differentialDiagnosis.map((item, idx) => (
            <DifferentialCard key={`diff-${idx}`} item={item} />
          ))}
        </div>
      </section>

      {/* 6. Missing Information & Suggested Investigations */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Missing Information
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Data points not supplied that materially affect certainty
          </p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-700">
            {analysis.missingInformation.length ? (
              analysis.missingInformation.map((item, idx) => (
                <li key={`miss-${idx}`} className="flex gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="italic text-slate-400">All standard parameters provided</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Suggested Investigations
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Diagnostic tests to confirm or exclude possibilities
          </p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-700">
            {analysis.suggestedInvestigations.length ? (
              analysis.suggestedInvestigations.map((item, idx) => (
                <li key={`inv-${idx}`} className="flex gap-2">
                  <span className="text-teal-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="italic text-slate-400">No additional tests proposed</li>
            )}
          </ul>
        </section>
      </div>

      {/* 7. Treatment Considerations */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Treatment Considerations (Not Autonomous Orders)
        </h2>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
          {analysis.treatmentConsiderations.map((item, idx) => (
            <li key={`tx-${idx}`} className="flex gap-2">
              <span className="text-teal-700 font-bold">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 8. Red Flags & Urgent Alerts */}
      {analysis.redFlags.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50/70 p-5">
          <div className="flex items-center gap-2 text-red-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-xs font-bold text-red-800">
              !
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider">
              Red Flags &amp; Urgent Clinical Alerts
            </h2>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-red-900">
            {analysis.redFlags.map((flag, idx) => (
              <li key={`rf-${idx}`} className="flex gap-2">
                <span>•</span>
                <span className="font-medium">{flag}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 9. Diagnostic Uncertainty (Visually Obvious Callout) */}
      <section className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-amber-900">
          <span className="text-sm font-bold text-amber-700">?</span>
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Diagnostic Uncertainty &amp; Limitations
          </h2>
        </div>
        <p className="mt-1 text-xs text-amber-950/80">
          The AI cannot establish a definitive diagnosis based on the supplied data. Clinical uncertainty factors:
        </p>
        <ul className="mt-3 space-y-1.5 text-xs leading-5 text-amber-900">
          {analysis.uncertainty.map((point, idx) => (
            <li key={`unc-${idx}`} className="flex gap-2">
              <span className="font-bold">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 10. Safety Notes */}
      {analysis.safetyNotes && analysis.safetyNotes.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Clinician Safety Reminders:</p>
          <ul className="mt-2 space-y-1">
            {analysis.safetyNotes.map((note, idx) => (
              <li key={`sn-${idx}`}>• {note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function DiagnosisCard({ item }: { item: PossibleDiagnosis }) {
  const badgeColors: Record<string, string> = {
    high: "bg-teal-100 text-teal-800 border-teal-200",
    moderate: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-slate-100 text-slate-800 border-slate-200",
  };

  return (
    <div className="rounded-lg border border-slate-200/90 bg-slate-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <h3 className="text-sm font-bold text-slate-900">{item.diagnosis}</h3>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
              badgeColors[item.likelihood] || badgeColors.moderate
            }`}
          >
            {item.likelihood} likelihood
          </span>
          {item.evidenceType && (
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-medium text-slate-700">
              {item.evidenceType}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
        <p>
          <span className="font-semibold text-slate-900">Clinical Reasoning: </span>
          {item.reasoning}
        </p>

        {item.supportingFindings.length > 0 && (
          <div className="pt-1">
            <span className="font-semibold text-emerald-800">Supporting Findings: </span>
            <span className="text-slate-600">{item.supportingFindings.join("; ")}</span>
          </div>
        )}

        {item.contradictingFindings && item.contradictingFindings.length > 0 && (
          <div className="pt-0.5">
            <span className="font-semibold text-red-800">Contradicting / Inconsistent Findings: </span>
            <span className="text-slate-600">{item.contradictingFindings.join("; ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DifferentialCard({ item }: { item: DifferentialDiagnosisItem }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-3.5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-bold text-slate-900">{item.diagnosis}</h3>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        <span className="font-semibold text-slate-800">Why considered: </span>
        {item.whyConsidered}
      </p>
      {item.supportingFindings && item.supportingFindings.length > 0 && (
        <p className="mt-1 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Supporting: </span>
          {item.supportingFindings.join("; ")}
        </p>
      )}
      {item.missingEvidence && item.missingEvidence.length > 0 && (
        <p className="mt-1 text-xs text-amber-800">
          <span className="font-semibold">Missing evidence to verify: </span>
          {item.missingEvidence.join("; ")}
        </p>
      )}
    </div>
  );
}
