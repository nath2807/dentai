"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@/components/clinical-ui";
import {
  clinicalCaseSchema,
  normalizeClinicalCase,
  type FormValues,
  type Radiograph,
  validateRadiograph,
} from "@/lib/clinical-case";
import type { ZodIssue } from "zod";
import type { ClinicalAnalysis } from "@/lib/clinical-analysis";

type Field = { label: string; name: string; placeholder?: string; type?: "input" | "textarea" | "select" };
type Draft = { values: FormValues; radiograph: Radiograph | null };
const draftKey = "dentai-clinical-case-draft";

const sections: { title: string; description: string; fields: Field[] }[] = [
  { title: "Case Information", description: "Start with the basic identifiers for this consultation.", fields: [{ label: "Case ID", name: "caseId", placeholder: "e.g. CASE-001" }, { label: "Age", name: "age", placeholder: "Years" }, { label: "Sex", name: "sex", type: "select" }] },
  { title: "Chief Complaint", description: "What is the patient’s primary concern today?", fields: [{ label: "Chief complaint", name: "complaint", placeholder: "Describe the patient’s main concern in their own words...", type: "textarea" }] },
  { title: "History of Presenting Complaint", description: "Document the timeline and behavior of the presenting concern.", fields: [{ label: "Duration", name: "duration", placeholder: "e.g. 3 days" }, { label: "Onset", name: "onset", placeholder: "Sudden, gradual, recurrent..." }, { label: "Symptoms", name: "symptoms", placeholder: "Pain, swelling, sensitivity..." }, { label: "Aggravating factors", name: "aggravating", placeholder: "What makes it worse?" }, { label: "Relieving factors", name: "relieving", placeholder: "What provides relief?" }] },
  { title: "Medical History", description: "Record relevant systemic conditions and medications.", fields: [{ label: "Medical conditions", name: "conditions", placeholder: "Include relevant diagnoses..." }, { label: "Current medications", name: "medications", placeholder: "Medication and dosage..." }, { label: "Allergies", name: "allergies", placeholder: "Known allergies or sensitivities..." }] },
  { title: "Dental History", description: "Add relevant treatment history and oral hygiene context.", fields: [{ label: "Previous treatment", name: "previousTreatment", placeholder: "Relevant previous dental care..." }, { label: "Previous extractions", name: "extractions", placeholder: "Details, dates, complications..." }, { label: "Endodontic treatment", name: "endo", placeholder: "Teeth and treatment details..." }, { label: "Prosthetic treatment", name: "prosthetic", placeholder: "Crowns, bridges, dentures..." }, { label: "Orthodontic treatment", name: "ortho", placeholder: "Current or previous treatment..." }, { label: "Oral hygiene", name: "hygiene", placeholder: "Home care and hygiene observations..." }] },
  { title: "Clinical Examination", description: "Structure your objective findings for a complete clinical picture.", fields: [{ label: "Tooth / region", name: "region", placeholder: "e.g. Tooth 36 / lower left" }, { label: "Extraoral findings", name: "extraoral", placeholder: "Facial asymmetry, swelling, lymph nodes..." }, { label: "Intraoral findings", name: "intraoral", placeholder: "Mucosa, swelling, sinus tract..." }, { label: "Hard tissue findings", name: "hardTissue", placeholder: "Caries, fracture, restoration..." }, { label: "Soft tissue findings", name: "softTissue", placeholder: "Lesion, color, texture..." }, { label: "Periodontal findings", name: "periodontal", placeholder: "Probing depths, bleeding, recession..." }, { label: "Pulpal findings", name: "pulpal", placeholder: "Pulpal diagnosis observations..." }, { label: "Percussion", name: "percussion", placeholder: "Positive, negative, or details..." }, { label: "Palpation", name: "palpation", placeholder: "Positive, negative, or details..." }, { label: "Mobility", name: "mobility", placeholder: "Grade or observations..." }, { label: "Probing", name: "probing", placeholder: "Pocket depths and findings..." }, { label: "Vitality tests", name: "vitality", placeholder: "Test used and response..." }] },
];

export default function CaseForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [radiograph, setRadiograph] = useState<Radiograph | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(draftKey);
    if (!saved || !formRef.current) return;
    let timer: number | undefined;
    try {
      const draft = JSON.parse(saved) as Draft;
      Object.entries(draft.values).forEach(([name, value]) => {
        const field = formRef.current?.elements.namedItem(name);
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) field.value = value;
      });
      timer = window.setTimeout(() => {
        if (draft.radiograph) {
          setRadiograph(draft.radiograph);
          setFileName(draft.radiograph.fileName);
        }
        setDraftMessage("Draft restored from this browser session.");
      }, 0);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
    return () => window.clearTimeout(timer);
  }, []);

  function readValues(): FormValues {
    const formData = new FormData(formRef.current ?? undefined);
    return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, typeof value === "string" ? value : ""])) as FormValues;
  }

  function setValidationErrors(issues: ZodIssue[]) {
    const nextErrors: Record<string, string> = {};
    issues.forEach((issue) => {
      const path = issue.path.join(".");
      const fieldName = path === "caseInformation.caseId" ? "caseId" : path === "caseInformation.age" ? "age" : path === "caseInformation.sex" ? "sex" : path === "historyOfPresentingComplaint.duration" ? "duration" : path === "historyOfPresentingComplaint.symptoms" ? "symptoms" : path === "clinicalExamination.toothOrRegion" ? "region" : "";
      if (fieldName && !nextErrors[fieldName]) nextErrors[fieldName] = issue.message;
    });
    setErrors(nextErrors);
    const firstField = Object.keys(nextErrors)[0];
    if (firstField) {
      const element = document.getElementById(`field-${firstField}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => element?.focus(), 250);
    }
  }

  function saveDraft() {
    const values = readValues();
    window.localStorage.setItem(draftKey, JSON.stringify({ values, radiograph }));
    setDraftMessage("Draft saved in this browser session.");
  }

  function handleRadiograph(file: File | undefined) {
    if (!file) return;
    const error = validateRadiograph(file);
    if (error) {
      setErrors((current) => ({ ...current, radiograph: error }));
      setFileName("");
      setRadiograph(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const nextRadiograph: Radiograph = { fileName: file.name, mimeType: file.type as Radiograph["mimeType"], size: file.size, dataUrl: typeof reader.result === "string" ? reader.result : undefined };
      setRadiograph(nextRadiograph);
      setFileName(file.name);
      setErrors((current) => ({ ...current, radiograph: "" }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clinicalCase = normalizeClinicalCase(readValues(), radiograph);
    const result = clinicalCaseSchema.safeParse(clinicalCase);
    if (!result.success) {
      setIsAnalyzing(false);
      setValidationErrors(result.error.issues);
      return;
    }
    setErrors({});
    setIsAnalyzing(true);
    window.localStorage.removeItem(draftKey);
    const requestCase = JSON.parse(JSON.stringify(result.data, (key, value) => key === "dataUrl" ? undefined : value)) as typeof result.data;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestCase),
      });
      const payload = await response.json() as ClinicalAnalysis | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Analysis could not be completed.");
      }
      window.sessionStorage.setItem("dentai-clinical-analysis", JSON.stringify(payload));
      window.sessionStorage.setItem("dentai-clinical-case", JSON.stringify(requestCase));
      router.push("/cases/demo");
    } catch (error) {
      setIsAnalyzing(false);
      setErrors({ submit: error instanceof TypeError ? "Network error. Check your connection and try again." : error instanceof Error ? error.message : "Analysis could not be completed. Please try again." });
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="flex items-start gap-2 rounded-lg border border-teal-100 bg-teal-50/70 px-4 py-3 text-xs leading-5 text-teal-950"><Icon name="folder" size={15} /><span>Use de-identified or synthetic patient information during early testing.</span></div>
      {sections.map((section, index) => <FormSection key={section.title} index={index + 1} {...section} errors={errors} />)}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-7">
        <SectionHeading title="Radiograph" description="Attach an image if one is available for the case." index={7} />
        <label htmlFor="radiograph" className="mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center transition hover:border-teal-400 hover:bg-teal-50/30">
          {radiograph?.dataUrl ? <Image src={radiograph.dataUrl} alt={`Preview of ${fileName}`} width={320} height={128} unoptimized className="mb-3 max-h-32 w-auto max-w-full rounded object-contain" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-teal-700 shadow-sm"><Icon name="plus" size={20} /></span>}
          <span className="mt-3 text-sm font-semibold text-slate-800">{fileName || "Drop a radiograph here or browse"}</span>
          <span className="mt-1 text-xs text-slate-500">PNG, JPG up to 10MB</span>
          <input id="radiograph" type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => handleRadiograph(event.target.files?.[0])} />
        </label>
        {radiograph && <button type="button" onClick={() => { setRadiograph(null); setFileName(""); }} className="mt-3 text-xs font-semibold text-slate-600 underline hover:text-red-700">Remove image</button>}
        {errors.radiograph && <p className="mt-2 text-sm text-red-700">{errors.radiograph}</p>}
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"><Icon name="spark" size={14} /><span>AI image analysis will be added later. This prototype does not interpret or send uploaded images.</span></p>
      </section>
      {errors.submit && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">{errors.submit}</p>}
      <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
        <div><p className="text-xs leading-5 text-slate-500">You can review and edit your findings before any future analysis.</p>{draftMessage && <p role="status" className="mt-1 text-xs font-medium text-teal-700">{draftMessage}</p>}</div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button type="button" onClick={saveDraft} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-800"><Icon name="folder" size={17} />Save Draft</button>
          <button type="submit" disabled={isAnalyzing} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-75"><Icon name="spark" size={17} />{isAnalyzing ? "Preparing prototype..." : "Analyze Case"}</button>
        </div>
      </div>
    </form>
  );
}

function FormSection({ title, description, fields, index, errors }: { title: string; description: string; fields: Field[]; index: number; errors: Record<string, string> }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-7"><SectionHeading title={title} description={description} index={index} /><div className={`mt-6 grid gap-5 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>{fields.map((field) => <FieldControl key={field.name} {...field} error={errors[field.name]} />)}</div></section>;
}
function SectionHeading({ title, description, index }: { title: string; description: string; index: number }) {
  return <div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{index}</span><div><h2 className="text-base font-semibold text-slate-950">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div></div>;
}
function FieldControl({ label, name, placeholder, type = "input", error }: Field & { error?: string }) {
  const id = `field-${name}`;
  const className = `w-full rounded-lg border ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"} bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2`;
  return <div className={type === "textarea" ? "sm:col-span-2" : ""}><label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">{label}</label>{type === "textarea" ? <textarea id={id} name={name} placeholder={placeholder} rows={4} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`${className} resize-y py-3`} /> : type === "select" ? <select id={id} name={name} defaultValue="" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`${className} h-11`}><option value="" disabled>Select sex</option><option>Female</option><option>Male</option><option>Intersex</option><option>Prefer not to say</option></select> : <input id={id} name={name} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`${className} h-11`} />}{error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">{error}</p>}</div>;
}
