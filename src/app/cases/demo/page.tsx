"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, Icon } from "@/components/clinical-ui";
import { ClinicalAnalysis, type ClinicalAnalysis as ClinicalAnalysisType } from "@/lib/clinical-analysis";

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
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Clinical workspace / Case result</p><h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Clinical Case Review</h1><p className="mt-2 text-base text-slate-500">Structured decision support for professional review.</p></div>
          <Link href="/cases/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-800"><Icon name="arrow" size={16} />Back to case form</Link>
        </div>
        {isLoading ? <LoadingState /> : analysis ? <AnalysisContent analysis={analysis} /> : <EmptyState />}
        <div className="mt-7 flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-4 text-teal-950"><Icon name="folder" size={18} /><p className="text-sm leading-6"><span className="font-bold">Clinical safety notice:</span> DentAI provides clinical decision support. It does not replace professional clinical judgment.</p></div>
      </div>
    </AppShell>
  );
}

function LoadingState() {
  return <div role="status" className="mt-7 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading clinical assessment...</div>;
}

function EmptyState() {
  return <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm leading-6 text-amber-950">No validated assessment is available for this case. <Link href="/cases/new" className="font-semibold underline">Return to the case form</Link> and submit the case again.</div>;
}

function AnalysisContent({ analysis }: { analysis: ClinicalAnalysisType }) {
  return <>
    <div className="mt-7 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950"><Icon name="spark" size={19} /><div><p className="text-sm font-bold">AI-generated decision support</p><p className="mt-1 text-sm leading-5 text-amber-900/75">Review all findings and uncertainty with a licensed dentist before making a clinical decision.</p></div></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <ResultSection title="Case Summary" content={analysis.summary} wide />
      <ListSection title="Problem List" items={analysis.problemList} />
      <ListSection title="Possible Diagnoses" items={analysis.possibleDiagnoses.map((item) => `${item.diagnosis} (${item.likelihood} likelihood): ${item.supportingFindings.join("; ")}`)} />
      <ListSection title="Differential Diagnosis" items={analysis.differentialDiagnosis} />
      <ListSection title="Missing Information" items={analysis.missingInformation} />
      <ListSection title="Suggested Investigations" items={analysis.suggestedInvestigations} />
      <ListSection title="Treatment Considerations" items={analysis.treatmentConsiderations} />
      <ListSection title="Red Flags" items={analysis.redFlags} />
      <ResultSection title="Uncertainty" content={analysis.uncertainty} wide />
    </div>
  </>;
}

function ResultSection({ title, content, wide = false }: { title: string; content: string; wide?: boolean }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${wide ? "md:col-span-2" : ""}`}><h2 className="text-base font-semibold text-slate-950">{title}</h2><p className="mt-4 text-sm leading-6 text-slate-600">{content}</p></section>;
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"><h2 className="text-base font-semibold text-slate-950">{title}</h2>{items.length ? <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">{items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />{item}</li>)}</ul> : <p className="mt-4 text-sm text-slate-500">None identified from the supplied information.</p>}</section>;
}
