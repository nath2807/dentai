"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, Icon } from "@/components/clinical-ui";
import {
  ClinicalAnalysis,
  type ClinicalAnalysis as ClinicalAnalysisType,
  type PossibleDiagnosis,
  type DifferentialDiagnosisItem,
  type EvidenceMapItem,
  type Contradiction,
  type MissingInformationItem,
} from "@/lib/clinical-analysis";

import { BENCHMARK_CASES } from "@/lib/benchmark-cases";
import { type StoredCase, saveCase } from "@/lib/case-storage";
import { formatToothWithSystem } from "@/lib/tooth-numbering";
import { workspaceStorageKey } from "@/lib/browser-workspace";


export default function DemoResultsPage() {
  const analysisKey = workspaceStorageKey("analysis");
  const [selectedBenchmarkIndex, setSelectedBenchmarkIndex] = useState<number>(0);
  const [sessionCase, setSessionCase] = useState<ClinicalAnalysisType | null>(null);
  const [useSessionCase, setUseSessionCase] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.sessionStorage.getItem(analysisKey);
      if (saved) {
        try {
          const result = ClinicalAnalysis.safeParse(JSON.parse(saved));
          if (result.success) {
            setSessionCase(result.data);
            setUseSessionCase(true);
          }
        } catch {
          window.sessionStorage.removeItem(analysisKey);
        }
      }
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [analysisKey]);

  const activeBenchmark: StoredCase = BENCHMARK_CASES[selectedBenchmarkIndex] || BENCHMARK_CASES[0];
  const activeAnalysis: ClinicalAnalysisType | null = useSessionCase
    ? sessionCase
    : activeBenchmark.analysis;

  function handleOpenInWorkspace(benchmark: StoredCase) {
    saveCase(benchmark);
  }

  return (
    <AppShell activeItem="New Case">
      <div className="mx-auto max-w-5xl space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Clinical Decision Support / Benchmark Demonstration
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Clinical Reasoning &amp; Benchmark Cases
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Explore synthetic educational reference dental cases, AI diagnostic reasoning, differentials, and clinician review traces.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/cases"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-800"
            >
              <Icon name="folder" size={15} />
              All Cases
            </Link>
            <Link
              href="/cases/new"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
            >
              <Icon name="plus" size={15} />
              New Case Form
            </Link>
          </div>
        </div>

        {/* Benchmark Selector Tabs */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Select Reference Dental Case:
            </span>
            <span className="text-[11px] text-amber-800 font-medium">
              Synthetic Educational Examples (Non-Clinical Demonstration)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {BENCHMARK_CASES.map((bCase, idx) => {
              const isSelected = !useSessionCase && selectedBenchmarkIndex === idx;
              const tooth = bCase.caseData.toothAssessment?.toothNumber || "Tooth";
              const primaryDiag = bCase.analysis?.possibleDiagnoses[0]?.diagnosis || "Case";
              return (
                <button
                  key={bCase.id}
                  onClick={() => {
                    setSelectedBenchmarkIndex(idx);
                    setUseSessionCase(false);
                  }}
                  className={`rounded-lg px-3.5 py-2 text-left text-xs transition ${
                    isSelected
                      ? "border border-teal-600 bg-teal-50 font-bold text-teal-950 shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-semibold text-xs">
                    Tooth #{tooth} • {primaryDiag}
                  </div>
                  <div className="text-[10px] text-teal-800 font-medium">
                    {formatToothWithSystem(tooth)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    {bCase.id} • {bCase.caseData.caseInformation.age}y {bCase.caseData.caseInformation.sex}
                  </div>
                </button>
              );
            })}

            {sessionCase && (
              <button
                onClick={() => setUseSessionCase(true)}
                className={`rounded-lg px-3.5 py-2 text-left text-xs transition ${
                  useSessionCase
                    ? "border border-indigo-600 bg-indigo-50 font-bold text-indigo-950 shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="font-semibold">Current Form Session Case</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  Recently analyzed in browser
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Benchmark Case Summary Banner & Action Links */}
        {!useSessionCase && (
          <div className="flex flex-col gap-4 rounded-xl border border-amber-300 bg-amber-50/60 p-4.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-700 px-2 py-0.5 text-[10px] font-bold text-white">
                  {activeBenchmark.id} (Synthetic Educational)
                </span>
                <span className="text-xs font-bold text-slate-900">
                  Chief Complaint: &ldquo;{activeBenchmark.caseData.chiefComplaint}&rdquo;
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Patient: {activeBenchmark.caseData.caseInformation.age}y {activeBenchmark.caseData.caseInformation.sex} • Tooth #{activeBenchmark.caseData.toothAssessment?.toothNumber} • Sensibility: {activeBenchmark.caseData.pulpalAssessment?.coldTest}
              </p>
              <p className="text-[10px] text-amber-800 italic">
                Synthetic educational example for software workflow evaluation — not a validated medical diagnosis or real patient record.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/cases/${encodeURIComponent(activeBenchmark.id)}`}
                onClick={() => handleOpenInWorkspace(activeBenchmark)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800"
              >
                <Icon name="spark" size={13} />
                Open Full Case Workspace
              </Link>
              <Link
                href={`/cases/${encodeURIComponent(activeBenchmark.id)}/report`}
                onClick={() => handleOpenInWorkspace(activeBenchmark)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Icon name="report" size={13} />
                View Report
              </Link>
            </div>
          </div>
        )}

        {/* Content Body */}
        {isLoading ? (
          <LoadingState />
        ) : activeAnalysis ? (
          <AnalysisContent analysis={activeAnalysis} />
        ) : (
          <EmptyState />
        )}

        {/* Footer Disclaimer */}
        <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/70 p-4 text-xs text-teal-950">
          <Icon name="folder" size={17} />
          <p className="leading-5">
            <span className="font-bold">Clinical Safety Notice:</span> Dentarith is an assistive clinical decision-support copilot, not an autonomous medical diagnostic device. All recommendations, differential diagnoses, and treatment considerations must be independently evaluated by a licensed dental professional before establishing a definitive diagnosis or initiating care.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function LoadingState() {
  return (
    <div role="status" className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
      <div className="mr-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
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
  // Sort possible diagnoses by rank ascending
  const sortedDiagnoses = [...analysis.possibleDiagnoses].sort(
    (a, b) => a.rank - b.rank
  );
  const leadingDiagnosis = sortedDiagnoses[0];
  const secondaryDiagnoses = sortedDiagnoses.slice(1);

  // Collect evidence map items (from root or diagnoses)
  const combinedEvidenceMap: EvidenceMapItem[] = [
    ...(analysis.evidenceMap || []),
    ...analysis.possibleDiagnoses.flatMap((d) => d.evidenceMap || []),
  ];

  return (
    <div className="space-y-6">
      {/* Clinician Advisory Header */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950">
        <Icon name="spark" size={18} />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Dentarith Decision Support Output (Non-Autonomous)
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

      {/* 4. Contradictions Section (Only shown if genuine contradictions exist) */}
      {analysis.contradictions && analysis.contradictions.length > 0 && (
        <section className="rounded-xl border-2 border-red-300 bg-red-50/80 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-red-950">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-xs font-bold text-red-800">
              !
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-900">
              Clinical Contradictions &amp; Inconsistencies Detected
            </h2>
          </div>
          <p className="mt-1 text-xs text-red-900/80">
            Genuine conflicts identified between reported history and objective tests requiring clinician resolution:
          </p>
          <div className="mt-4 space-y-3">
            {analysis.contradictions.map((c, idx) => (
              <ContradictionCard key={`contra-${idx}`} item={c} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Clinical Reasoning & Diagnostic Hierarchy */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-800">
            Clinical Reasoning &amp; Diagnostic Hierarchy
          </h2>
          <span className="text-[11px] text-slate-500">Requires clinician validation</span>
        </div>

        {/* Leading Diagnostic Consideration */}
        {leadingDiagnosis && (
          <div className="mt-4">
            <LeadingDiagnosisCard item={leadingDiagnosis} />
          </div>
        )}

        {/* Secondary Considerations */}
        {secondaryDiagnoses.length > 0 && (
          <div className="mt-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Secondary Diagnostic Considerations
            </h3>
            {secondaryDiagnoses.map((item, idx) => (
              <DiagnosisCard key={`sec-diag-${idx}`} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Evidence Map */}
      {combinedEvidenceMap.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-800">
            Evidence Map: Finding → Interpretation → Diagnostic Relevance
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Explicit reasoning relationships tying clinical observations to diagnostic conclusions.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-1">
            {combinedEvidenceMap.map((mapItem, idx) => (
              <EvidenceMapCard key={`map-${idx}`} item={mapItem} />
            ))}
          </div>
        </section>
      )}

      {/* 7. Differential Diagnoses */}
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

      {/* 8. Missing Information Prioritization & Investigations */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Missing Information Prioritization
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Grouped by clinical impact on diagnostic certainty
          </p>
          <div className="mt-4 space-y-3">
            <MissingInfoList items={analysis.missingInformation} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Suggested Investigations
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Targeted tests to confirm or exclude possibilities
          </p>
          <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-700">
            {analysis.suggestedInvestigations.length ? (
              analysis.suggestedInvestigations.map((item, idx) => (
                <li key={`inv-${idx}`} className="flex gap-2">
                  <span className="font-bold text-teal-600">•</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="italic text-slate-400">No additional tests proposed</li>
            )}
          </ul>
        </section>
      </div>

      {/* 9. Decision-Changing Evidence */}
      {analysis.decisionChangingEvidence && analysis.decisionChangingEvidence.length > 0 && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-indigo-950">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-200 text-xs font-bold text-indigo-800">
              ?
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
              Decision-Changing Evidence (&ldquo;What Would Change My Mind?&rdquo;)
            </h2>
          </div>
          <p className="mt-1 text-xs text-indigo-900/80">
            Potential new clinical findings or test results that would materially change the current diagnostic ranking:
          </p>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-indigo-950">
            {analysis.decisionChangingEvidence.map((evidence, idx) => (
              <li key={`dce-${idx}`} className="flex gap-2">
                <span className="font-bold text-indigo-600">•</span>
                <span>{evidence}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 10. Treatment Considerations */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Treatment Considerations (Not Autonomous Orders)
        </h2>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
          {analysis.treatmentConsiderations.map((item, idx) => (
            <li key={`tx-${idx}`} className="flex gap-2">
              <span className="font-bold text-teal-700">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 11. Red Flags & Urgent Alerts */}
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

      {/* 12. Diagnostic Uncertainty (Visually Obvious Callout) */}
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

      {/* 13. Safety Notes */}
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

const categoryColors: Record<string, string> = {
  pulpal: "bg-amber-100 text-amber-900 border-amber-200",
  apical: "bg-red-100 text-red-900 border-red-200",
  periodontal: "bg-emerald-100 text-emerald-900 border-emerald-200",
  hard_tissue: "bg-sky-100 text-sky-900 border-sky-200",
  soft_tissue: "bg-purple-100 text-purple-900 border-purple-200",
  other: "bg-slate-100 text-slate-900 border-slate-200",
};

const badgeColors: Record<string, string> = {
  high: "bg-teal-100 text-teal-800 border-teal-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-800 border-slate-200",
};

function LeadingDiagnosisCard({ item }: { item: PossibleDiagnosis }) {
  return (
    <div className="rounded-xl border-2 border-teal-600/70 bg-teal-50/30 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Rank #{item.rank} — Leading Consideration
          </span>
          <h3 className="text-base font-bold text-slate-950">{item.diagnosis}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
              categoryColors[item.diagnosticCategory] || categoryColors.other
            }`}
          >
            {item.diagnosticCategory.replace("_", " ")}
          </span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
              badgeColors[item.likelihood] || badgeColors.moderate
            }`}
          >
            {item.likelihood} likelihood
          </span>
          {item.evidenceType && (
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700">
              {item.evidenceType}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
        {item.whyRanksHighest && (
          <div className="rounded-lg border border-teal-200 bg-white p-3">
            <span className="font-bold text-teal-950">Why It Ranks Highest: </span>
            <span className="text-slate-800">{item.whyRanksHighest}</span>
          </div>
        )}

        <div>
          <span className="font-bold text-slate-900">Clinical Reasoning: </span>
          <span className="text-slate-700">{item.reasoning}</span>
        </div>

        {item.confidenceReason && (
          <div>
            <span className="font-bold text-slate-900">Confidence Assessment: </span>
            <span className="text-slate-600">{item.confidenceReason}</span>
          </div>
        )}

        {item.supportingFindings.length > 0 && (
          <div>
            <span className="font-bold text-emerald-800">Supporting Findings: </span>
            <span className="text-slate-700">{item.supportingFindings.join("; ")}</span>
          </div>
        )}

        {item.contradictingFindings && item.contradictingFindings.length > 0 && (
          <div>
            <span className="font-bold text-red-800">Contradicting / Inconsistent Findings: </span>
            <span className="text-slate-700">{item.contradictingFindings.join("; ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagnosisCard({ item }: { item: PossibleDiagnosis }) {
  return (
    <div className="rounded-lg border border-slate-200/90 bg-slate-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-800">
            Rank #{item.rank}
          </span>
          <h3 className="text-sm font-bold text-slate-900">{item.diagnosis}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
              categoryColors[item.diagnosticCategory] || categoryColors.other
            }`}
          >
            {item.diagnosticCategory.replace("_", " ")}
          </span>
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

        {item.confidenceReason && (
          <p>
            <span className="font-semibold text-slate-900">Confidence Assessment: </span>
            <span className="text-slate-600">{item.confidenceReason}</span>
          </p>
        )}

        {item.supportingFindings.length > 0 && (
          <div className="pt-0.5">
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

function EvidenceMapCard({ item }: { item: EvidenceMapItem }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Clinical Finding
        </span>
        <p className="font-semibold text-slate-900">{item.finding}</p>
      </div>
      <div className="hidden text-teal-700 sm:block">→</div>
      <div className="flex-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
          Clinical Interpretation
        </span>
        <p className="font-medium text-teal-950">{item.interpretation}</p>
      </div>
      <div className="hidden text-teal-700 sm:block">→</div>
      <div className="flex-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
          Diagnostic Relevance
        </span>
        <p className="text-slate-700">{item.diagnosticRelevance}</p>
      </div>
    </div>
  );
}

function DifferentialCard({ item }: { item: DifferentialDiagnosisItem }) {
  const supporting =
    item.supportingEvidence && item.supportingEvidence.length > 0
      ? item.supportingEvidence
      : item.supportingFindings;

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-4">
      <h3 className="text-xs font-bold text-slate-900">{item.diagnosis}</h3>
      <div className="mt-2 space-y-1.5 text-xs text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Why considered: </span>
          {item.whyConsidered}
        </p>
        {supporting && supporting.length > 0 && (
          <p>
            <span className="font-semibold text-slate-700">Supporting evidence: </span>
            {supporting.join("; ")}
          </p>
        )}
        {item.evidenceAgainst && item.evidenceAgainst.length > 0 && (
          <p>
            <span className="font-semibold text-red-700">Evidence against: </span>
            {item.evidenceAgainst.join("; ")}
          </p>
        )}
        {item.whatWouldChangeRanking && (
          <p className="text-indigo-900">
            <span className="font-semibold">What would change ranking: </span>
            {item.whatWouldChangeRanking}
          </p>
        )}
        {item.missingEvidence && item.missingEvidence.length > 0 && (
          <p className="text-amber-800">
            <span className="font-semibold">Missing evidence to verify: </span>
            {item.missingEvidence.join("; ")}
          </p>
        )}
      </div>
    </div>
  );
}

function ContradictionCard({ item }: { item: Contradiction }) {
  return (
    <div className="rounded-lg border border-red-200 bg-white p-3.5 text-xs">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <span className="font-bold text-slate-700">Finding: </span>
          <span className="text-slate-900">{item.finding}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Expected Pattern: </span>
          <span className="text-slate-900">{item.expectedPattern}</span>
        </div>
      </div>
      <div className="mt-2 border-t border-red-100 pt-2 text-xs">
        <p>
          <span className="font-bold text-red-800">Conflict: </span>
          <span className="text-red-950">{item.conflict}</span>
        </p>
        <p className="mt-1">
          <span className="font-bold text-slate-800">Clinical Impact: </span>
          <span className="text-slate-700">{item.clinicalImpact}</span>
        </p>
      </div>
    </div>
  );
}

function MissingInfoList({ items }: { items: MissingInformationItem[] }) {
  const critical = items.filter((i) => i.importance === "critical");
  const important = items.filter((i) => i.importance === "important");
  const useful = items.filter((i) => i.importance === "useful");

  return (
    <div className="space-y-4">
      {critical.length > 0 && (
        <div>
          <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-800">
            Critical — May Change Diagnostic Conclusion
          </span>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            {critical.map((item, idx) => (
              <li key={`crit-${idx}`} className="flex flex-col gap-0.5 border-l-2 border-red-500 pl-2">
                <span className="font-semibold text-slate-900">{item.item}</span>
                <span className="text-[11px] text-slate-500">{item.whyItMatters}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {important.length > 0 && (
        <div>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
            Important — Confirms or Narrows Diagnosis
          </span>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            {important.map((item, idx) => (
              <li key={`imp-${idx}`} className="flex flex-col gap-0.5 border-l-2 border-amber-500 pl-2">
                <span className="font-semibold text-slate-900">{item.item}</span>
                <span className="text-[11px] text-slate-500">{item.whyItMatters}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {useful.length > 0 && (
        <div>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
            Useful — Improves Record Completeness
          </span>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            {useful.map((item, idx) => (
              <li key={`use-${idx}`} className="flex flex-col gap-0.5 border-l-2 border-slate-300 pl-2">
                <span className="font-semibold text-slate-900">{item.item}</span>
                <span className="text-[11px] text-slate-500">{item.whyItMatters}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 && (
        <p className="italic text-slate-400">All standard parameters provided</p>
      )}
    </div>
  );
}
