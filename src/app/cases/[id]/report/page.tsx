"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { getCase, type StoredCase } from "@/lib/case-storage";
import { Icon } from "@/components/clinical-ui";

export default function ClinicalReportPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-xs text-slate-500">
          Loading clinical report...
        </div>
      }
    >
      <ClinicalReportContent params={props.params} />
    </Suspense>
  );
}

function ClinicalReportContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const caseId = decodeURIComponent(resolvedParams.id);
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

  const { caseData, analysis, analysisStatus, createdAt } = storedCase;
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
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      {/* Screen Action Bar (Hidden on Print) */}
      <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/cases/${encodeURIComponent(caseId)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Icon name="arrow" size={14} />
            Back to Case
          </Link>
          <span className="text-xs text-slate-500">
            Case: <strong className="text-slate-800">{caseId}</strong>
          </span>
          {isStale && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
              ⚠️ Stale Clinical Data
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            <Icon name="report" size={15} />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="print-page mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none sm:p-12">
        {/* Document Header */}
        <header className="border-b-2 border-slate-900 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-800">
                Dentarith Decision Support System
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                CLINICAL DECISION SUPPORT REPORT
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Assistive diagnostic evaluation for licensed clinician review
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold text-slate-900">Case ID: {caseId}</p>
              <p className="text-slate-500">
                Date: {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
              <p className="text-[11px] text-slate-400">
                Recorded: {new Date(createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {isStale && (
            <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
              Note: Clinical findings were updated after this reasoning analysis was generated. Re-analysis recommended.
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
                  {caseData.toothAssessment?.toothNumber || caseData.clinicalExamination.toothOrRegion || "Unspecified"}
                  {caseData.toothAssessment?.arch && ` (${caseData.toothAssessment.arch} arch)`}
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

            <div className="mt-2 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">Radiographic Status: </span>
              <span>No radiographic image was supplied with this consultation.</span>
            </div>
          </section>

          {/* Section 3: AI Clinical Reasoning & Diagnostic Hierarchy */}
          <section className="page-break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
              3. AI Clinical Reasoning &amp; Diagnostic Hierarchy
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
                  <p><span className="font-bold text-slate-900">Confidence Assessment: </span>{leadingDiagnosis.confidenceReason}</p>
                  {leadingDiagnosis.supportingFindings.length > 0 && (
                    <p><span className="font-bold text-emerald-800">Supporting Findings: </span>{leadingDiagnosis.supportingFindings.join("; ")}</p>
                  )}
                </div>
              </div>
            )}

            {/* Secondary Diagnoses */}
            {secondaryDiagnoses.length > 0 && (
              <div className="mt-3">
                <span className="font-bold text-slate-900">Secondary Considerations:</span>
                <ul className="mt-1 space-y-1 pl-3">
                  {secondaryDiagnoses.map((sec, idx) => (
                    <li key={`sec-${idx}`}>
                      • <span className="font-semibold text-slate-900">Rank #{sec.rank}: {sec.diagnosis}</span> ({sec.diagnosticCategory}, {sec.likelihood} likelihood) — {sec.reasoning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Section 4: Evidence Map */}
          {combinedEvidenceMap.length > 0 && (
            <section className="page-break-inside-avoid">
              <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
                4. Evidence Map (Finding → Interpretation → Relevance)
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

          {/* Section 5: Differential Diagnoses */}
          <section className="page-break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
              5. Differential Diagnosis Considerations
            </h2>
            <div className="mt-2.5 space-y-2">
              {analysis.differentialDiagnosis.map((diff, idx) => (
                <div key={`diff-${idx}`} className="rounded border border-slate-200 p-2.5 bg-white">
                  <p className="font-bold text-slate-900">{diff.diagnosis}</p>
                  <p className="mt-0.5 text-slate-700"><span className="font-semibold">Why Considered:</span> {diff.whyConsidered}</p>
                  {diff.whatWouldChangeRanking && (
                    <p className="mt-0.5 text-indigo-900"><span className="font-semibold">What would change ranking:</span> {diff.whatWouldChangeRanking}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 6: Missing Information & Investigations */}
          <section className="page-break-inside-avoid grid grid-cols-2 gap-4">
            <div>
              <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
                6A. Missing Information Prioritization
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
                6B. Suggested Investigations
              </h2>
              <ul className="mt-2 space-y-1">
                {analysis.suggestedInvestigations.map((inv, idx) => (
                  <li key={`inv-${idx}`}>• {inv}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 7: Decision-Changing Evidence & Treatment Considerations */}
          <section className="page-break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-1 font-bold uppercase tracking-wider text-teal-900 text-xs">
              7. Decision-Changing Evidence &amp; Treatment Considerations
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

          {/* Section 8: Red Flags & Uncertainty */}
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
                <p className="font-semibold text-slate-600">Reviewing Clinician Signature:</p>
                <div className="mt-6 border-b border-slate-400 pb-1" />
              </div>
              <div>
                <p className="font-semibold text-slate-600">Date &amp; License Number:</p>
                <div className="mt-6 border-b border-slate-400 pb-1" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
