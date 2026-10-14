"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/clinical-ui";
import {
  clinicalCaseSchema,
  normalizeClinicalCase,
  type ClinicalCase,
  type FormValues,
  type Radiograph,
  validateRadiograph,
} from "@/lib/clinical-case";
import type { ZodIssue } from "zod";
import type { ClinicalAnalysis } from "@/lib/clinical-analysis";
import { getCase, saveCase, type StoredCase } from "@/lib/case-storage";
import { ToothChart } from "@/components/tooth-chart";
import { PeriodontalChart } from "@/components/periodontal-chart";
import type { PeriodontalChartData } from "@/lib/periodontal-types";
import type { ToothInfo } from "@/lib/tooth-numbering";
import { assertWorkspaceCurrent, getWorkspaceUserId, workspaceStorageKey } from "@/lib/browser-workspace";

type Draft = {
  values: FormValues;
  radiograph: Radiograph | null;
  periodontalChart?: PeriodontalChartData | null;
};

function extractFormValuesFromStoredCase(storedCase: StoredCase): FormValues {
  if (storedCase.formValues && Object.keys(storedCase.formValues).length > 0) {
    return storedCase.formValues as FormValues;
  }
  const c = storedCase.caseData;
  return {
    caseId: c.caseInformation.caseId || "",
    age: String(c.caseInformation.age ?? ""),
    sex: c.caseInformation.sex || "",
    complaint: c.chiefComplaint || "",
    duration: c.historyOfPresentingComplaint.duration || "",
    onset: c.historyOfPresentingComplaint.onset || "",
    symptoms: c.historyOfPresentingComplaint.symptoms || "",
    aggravatingFactors: c.historyOfPresentingComplaint.aggravatingFactors || "",
    relievingFactors: c.historyOfPresentingComplaint.relievingFactors || "",
    toothNumber:
      c.toothAssessment?.toothNumber || c.clinicalExamination.toothOrRegion || "",
    arch: c.toothAssessment?.arch || "",
    quadrant: c.toothAssessment?.quadrant || "",
    coldTest: c.pulpalAssessment?.coldTest || "",
    lingeringDuration: c.pulpalAssessment?.lingeringDuration || "",
    ept: c.pulpalAssessment?.electricPulpTest || "",
    percussion:
      c.periapicalAssessment?.percussion || c.clinicalExamination.percussion || "",
    palpation:
      c.periapicalAssessment?.palpation || c.clinicalExamination.palpation || "",
    biteTest: c.periapicalAssessment?.biteTest || "",
    mobility:
      c.periapicalAssessment?.mobility || c.clinicalExamination.mobility || "",
    sinusTract: c.periapicalAssessment?.sinusTract || "",
    swelling: c.periapicalAssessment?.swelling || "",
    probingDepth:
      c.periodontalAssessment?.probingDepth || c.clinicalExamination.probing || "",
    caries: c.hardTissueAssessment?.caries || "",
    systemicConditions:
      c.structuredMedicalHistory?.systemicConditions ||
      c.medicalHistory.conditions ||
      "",
    relevantNegativeFindings:
      c.relevantNegatives?.relevantNegativeFindings || "",
    additionalClinicalNotes:
      c.clinicianNotes?.additionalClinicalNotes || "",
  } as FormValues;
}

export default function CaseForm() {
  const workspaceUserId = getWorkspaceUserId();
  const draftKey = workspaceStorageKey("draft", workspaceUserId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const formRef = useRef<HTMLFormElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [radiograph, setRadiograph] = useState<Radiograph | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftMessage, setDraftMessage] = useState("");
  const [editingCase, setEditingCase] = useState<StoredCase | null>(null);

  // Progressive disclosure toggles
  const [painPresent, setPainPresent] = useState<string>("yes");
  const [showPeriodontal, setShowPeriodontal] = useState<boolean>(false);
  const [periodontalChart, setPeriodontalChart] = useState<PeriodontalChartData | null>(null);
  const [showDentalHistory, setShowDentalHistory] = useState<boolean>(false);
  const [selectedToothChartNumber, setSelectedToothChartNumber] = useState<string>("");

  function handleToothChartSelect(tooth: ToothInfo | null) {
    if (!formRef.current) return;
    const tnField = formRef.current.elements.namedItem("toothNumber");
    const archField = formRef.current.elements.namedItem("arch");
    const quadField = formRef.current.elements.namedItem("quadrant");
    const regionField = formRef.current.elements.namedItem("region");

    if (!tooth) {
      if (tnField instanceof HTMLInputElement) tnField.value = "";
      if (archField instanceof HTMLSelectElement) archField.value = "";
      if (quadField instanceof HTMLSelectElement) quadField.value = "";
      if (regionField instanceof HTMLInputElement) regionField.value = "";
      setSelectedToothChartNumber("");
      return;
    }

    if (tnField instanceof HTMLInputElement) {
      tnField.value = tooth.universal;
    }
    if (archField instanceof HTMLSelectElement) {
      archField.value = tooth.arch;
    }
    if (quadField instanceof HTMLSelectElement) {
      if (tooth.quadrant === "upper_right") quadField.value = "Upper Right (Q1)";
      else if (tooth.quadrant === "upper_left") quadField.value = "Upper Left (Q2)";
      else if (tooth.quadrant === "lower_left") quadField.value = "Lower Left (Q3)";
      else if (tooth.quadrant === "lower_right") quadField.value = "Lower Right (Q4)";
    }
    if (regionField instanceof HTMLInputElement) {
      regionField.value = tooth.name;
    }
    setSelectedToothChartNumber(tooth.universal);
  }

  useEffect(() => {
    let timer: number | undefined;

    // If editId is provided, populate from stored case
    if (editId) {
      const stored = getCase(editId);
      if (stored && formRef.current) {
        setEditingCase(stored);
        const formVals = extractFormValuesFromStoredCase(stored);
        Object.entries(formVals).forEach(([name, value]) => {
          const field = formRef.current?.elements.namedItem(name);
          if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLTextAreaElement ||
            field instanceof HTMLSelectElement
          ) {
            field.value = value;
          }
        });
        timer = window.setTimeout(() => {
          if (formVals.painPresent) {
            setPainPresent(formVals.painPresent);
          }
          if (
            formVals.probingDepth ||
            stored.caseData.periodontalAssessment?.probingDepth ||
            stored.caseData.periodontalChart
          ) {
            setShowPeriodontal(true);
          }
          if (stored.caseData.periodontalChart) {
            setPeriodontalChart(stored.caseData.periodontalChart);
          }
          if (
            formVals.previousTreatment ||
            stored.caseData.structuredDentalHistory?.previousTreatment
          ) {
            setShowDentalHistory(true);
          }
          if (formVals.toothNumber) {
            setSelectedToothChartNumber(formVals.toothNumber);
          }
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }

    // Otherwise restore local draft if available
    const saved = window.localStorage.getItem(draftKey);
    if (!saved || !formRef.current) return;
    try {
      const draft = JSON.parse(saved) as Draft;
      Object.entries(draft.values).forEach(([name, value]) => {
        const field = formRef.current?.elements.namedItem(name);
        if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLSelectElement
        ) {
          field.value = value;
        }
      });
      timer = window.setTimeout(() => {
        if (draft.values.painPresent) {
          setPainPresent(draft.values.painPresent);
        }
        if (draft.values.toothNumber) {
          setSelectedToothChartNumber(draft.values.toothNumber);
        }
        if (draft.radiograph) {
          setRadiograph(draft.radiograph);
          setFileName(draft.radiograph.fileName);
        }
        if (draft.periodontalChart) {
          setPeriodontalChart(draft.periodontalChart);
          setShowPeriodontal(true);
        }
        setDraftMessage("Draft restored from this browser session.");
      }, 0);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
    return () => window.clearTimeout(timer);
  }, [editId, draftKey]);

  const readValues = useCallback((): FormValues => {
    const formData = new FormData(formRef.current ?? undefined);
    return Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [
        key,
        typeof value === "string" ? value : "",
      ])
    ) as FormValues;
  }, []);

  useEffect(() => {
    const preserve = () => {
      if (!formRef.current) return;
      const values = readValues();
      if (!values.caseId?.trim() && !values.complaint?.trim() && !values.toothNumber?.trim()) return;
      try { window.localStorage.setItem(draftKey, JSON.stringify({ values, radiograph, periodontalChart })); }
      catch { /* Existing saved cases remain intact if the browser quota is exhausted. */ }
    };
    window.addEventListener("dentarith-workspace-before-change", preserve);
    return () => {
      preserve();
      window.removeEventListener("dentarith-workspace-before-change", preserve);
    };
  }, [draftKey, readValues, radiograph, periodontalChart]);

  function setValidationErrors(issues: ZodIssue[]) {
    const nextErrors: Record<string, string> = {};
    issues.forEach((issue) => {
      const path = issue.path.join(".");
      let fieldName = "";
      if (path === "caseInformation.caseId") fieldName = "caseId";
      else if (path === "caseInformation.age") fieldName = "age";
      else if (path === "caseInformation.sex") fieldName = "sex";
      else if (path === "chiefComplaint") fieldName = "complaint";
      else if (path === "historyOfPresentingComplaint.duration") fieldName = "duration";
      else if (path === "historyOfPresentingComplaint.symptoms") fieldName = "symptoms";
      else if (path === "clinicalExamination.toothOrRegion") fieldName = "toothNumber";

      if (fieldName && !nextErrors[fieldName]) {
        nextErrors[fieldName] = issue.message;
      }
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
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({ values, radiograph, periodontalChart })
    );
    if (values.caseId?.trim()) {
      const clinicalCase = normalizeClinicalCase(values, radiograph, periodontalChart);
      saveCase({
        id: values.caseId.trim(),
        caseData: clinicalCase as unknown as ClinicalCase,
        formValues: values,
        analysis: editingCase?.analysis || null,
        status: "draft",
        analysisStatus: editingCase?.analysis ? "stale" : "stale",
        reviewStatus: editingCase?.analysis ? "needs_review" : "pending",
      });
    }
    setDraftMessage("Draft saved in this browser session.");
  }

  function handleSaveWithoutAnalyze() {
    const values = readValues();
    const clinicalCase = normalizeClinicalCase(values, radiograph, periodontalChart);
    const result = clinicalCaseSchema.safeParse(clinicalCase);

    if (!result.success) {
      setValidationErrors(result.error.issues);
      return;
    }

    const caseId = result.data.caseInformation.caseId;
    saveCase({
      id: caseId,
      caseData: result.data as unknown as ClinicalCase,
      formValues: values,
      analysis: editingCase?.analysis || null,
      status: editingCase?.analysis ? "analyzed" : "draft",
      analysisStatus: editingCase?.analysis ? "stale" : "stale",
      reviewStatus: editingCase?.analysis ? "needs_review" : "pending",
    });
    router.push(`/cases/${encodeURIComponent(caseId)}`);
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
      const nextRadiograph: Radiograph = {
        fileName: file.name,
        mimeType: file.type as Radiograph["mimeType"],
        size: file.size,
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
      };
      setRadiograph(nextRadiograph);
      setFileName(file.name);
      setErrors((current) => ({ ...current, radiograph: "" }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = readValues();
    const clinicalCase = normalizeClinicalCase(values, radiograph, periodontalChart);
    const result = clinicalCaseSchema.safeParse(clinicalCase);

    if (!result.success) {
      setIsAnalyzing(false);
      setValidationErrors(result.error.issues);
      return;
    }

    setErrors({});
    setIsAnalyzing(true);
    const requestCase = JSON.parse(
      JSON.stringify(result.data, (key, value) => (key === "dataUrl" ? undefined : value))
    ) as typeof result.data;

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
            : "Analysis could not be completed."
        );
      }
      const caseId = requestCase.caseInformation.caseId;
      saveCase({
        id: caseId,
        caseData: requestCase as unknown as ClinicalCase,
        formValues: values,
        analysis: payload as ClinicalAnalysis,
        status: "analyzed",
        analysisStatus: "current",
        reviewStatus: "needs_review",
      });
      // Remove draft only AFTER successful analysis and storage
      window.localStorage.removeItem(draftKey);
      window.sessionStorage.setItem(workspaceStorageKey("analysis", workspaceUserId), JSON.stringify(payload));
      window.sessionStorage.setItem(workspaceStorageKey("analysis-case", workspaceUserId), JSON.stringify(requestCase));
      router.push(`/cases/${encodeURIComponent(caseId)}`);
    } catch (error) {
      setIsAnalyzing(false);
      // Explicitly preserve entered data in localStorage on error
      try {
        if (getWorkspaceUserId() === workspaceUserId) window.localStorage.setItem(
          draftKey,
          JSON.stringify({ values, radiograph, periodontalChart })
        );
      } catch {
        // storage quota fallback
      }

      const isTimeout =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      setErrors({
        submit: isTimeout
          ? "Analysis timed out. Please check your connection and try again. (Your entered case data is preserved)"
          : error instanceof TypeError
          ? "Network error. Check your connection and try again. (Your entered case data is preserved)"
          : error instanceof Error
          ? `${error.message} (Your entered case data is preserved)`
          : "Analysis could not be completed. Please try again. (Your entered case data is preserved)",
      });
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Editing Existing Case Notice Banner */}
      {editingCase && (
        <div className="glass-card-subtle glass-tint-teal flex items-start justify-between gap-3 p-4 text-xs text-teal-950">
          <div>
            <span className="font-bold">Editing Case {editingCase.id}:</span> You are modifying a saved clinical consultation. Saving changes without re-analyzing will mark the diagnostic assessment as <strong className="text-amber-800">stale</strong> until re-analyzed.
          </div>
          <Link
            href={`/cases/${encodeURIComponent(editingCase.id)}`}
            className="font-semibold text-teal-800 underline shrink-0 hover:text-teal-950"
          >
            Cancel Editing
          </Link>
        </div>
      )}

      {/* Clinician Guidance Notice */}
      <div className="glass-card-subtle glass-tint-teal flex items-start gap-2.5 px-4 py-3 text-xs leading-5 text-teal-950">
        <Icon name="folder" size={16} />
        <div>
          <span className="font-semibold">Clinical workspace notice:</span> Complete the sections relevant to this consultation. Unfilled objective fields will be explicitly categorized as unobserved/missing rather than inferred.
        </div>
      </div>

      {/* Sticky Section Navigator */}
      <div className="glass-pill sticky top-20 z-10 -mx-1 mb-6 overflow-x-auto p-2 sm:mx-0 shadow-md">
        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Jump:</span>
          <a href="#sec-case" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">1. Info</a>
          <a href="#sec-complaint" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">2. Complaint</a>
          <a href="#sec-pain" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">3. Pain</a>
          <a href="#sec-tooth" className="glass-chip rounded-lg px-2.5 py-1 bg-teal-50/90 text-teal-900 font-bold border border-teal-300/80 hover:bg-teal-100 transition shadow-xs">4. Tooth Chart</a>
          <a href="#sec-pulpal" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">5. Pulpal</a>
          <a href="#sec-periapical" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">6. Periapical</a>
          <a href="#sec-periodontal" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">7. Periodontal</a>
          <a href="#sec-hard-tissue" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">8. Hard Tissue</a>
          <a href="#sec-medical" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">9. Medical</a>
          <a href="#sec-dental-history" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">10. Dental History</a>
          <a href="#sec-investigations" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">11. Investigations</a>
          <a href="#sec-radiograph" className="glass-chip rounded-lg px-2.5 py-1 text-slate-600 hover:bg-white/90 hover:text-slate-900 transition">12. Radiograph</a>
        </div>
      </div>

      {/* 1. Case Information */}
      <SectionContainer id="sec-case" index={1} title="Case Information" description="Basic consultation identifiers">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-caseId" className="mb-1.5 block text-xs font-semibold text-slate-700">Case ID *</label>
            <input id="field-caseId" name="caseId" placeholder="e.g. CASE-001" className={inputClass(errors.caseId)} />
            {errors.caseId && <p className="mt-1 text-xs text-red-600">{errors.caseId}</p>}
          </div>
          <div>
            <label htmlFor="field-age" className="mb-1.5 block text-xs font-semibold text-slate-700">Age (years) *</label>
            <input id="field-age" name="age" type="number" min="0" placeholder="Years" className={inputClass(errors.age)} />
            {errors.age && <p className="mt-1 text-xs text-red-600">{errors.age}</p>}
          </div>
          <div>
            <label htmlFor="field-sex" className="mb-1.5 block text-xs font-semibold text-slate-700">Biological Sex *</label>
            <select id="field-sex" name="sex" defaultValue="" className={selectClass(errors.sex)}>
              <option value="" disabled>Select sex</option>
              <option>Male</option>
              <option>Female</option>
              <option>Intersex</option>
              <option>Prefer not to say</option>
            </select>
            {errors.sex && <p className="mt-1 text-xs text-red-600">{errors.sex}</p>}
          </div>
        </div>
      </SectionContainer>

      {/* 2. Chief Complaint */}
      <SectionContainer id="sec-complaint" index={2} title="Chief Complaint" description="Patient's primary presenting concern">
        <div>
          <label htmlFor="field-complaint" className="mb-1.5 block text-xs font-semibold text-slate-700">Presenting complaint in patient&apos;s own words *</label>
          <textarea id="field-complaint" name="complaint" rows={3} placeholder="Describe the main complaint (e.g. Pain in lower right tooth when biting)..." className={textareaClass(errors.complaint)} />
          {errors.complaint && <p className="mt-1 text-xs text-red-600">{errors.complaint}</p>}
        </div>
      </SectionContainer>

      {/* 3. Pain Assessment */}
      <SectionContainer id="sec-pain" index={3} title="Pain Assessment" description="History and character of presenting discomfort">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-700">Is pain present?</span>
          <label className="flex items-center gap-1.5 text-xs text-slate-700">
            <input type="radio" name="painPresent" value="yes" checked={painPresent === "yes"} onChange={() => setPainPresent("yes")} className="text-teal-600" />
            Yes
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-700">
            <input type="radio" name="painPresent" value="no" checked={painPresent === "no"} onChange={() => setPainPresent("no")} className="text-teal-600" />
            No / Asymptomatic
          </label>
        </div>

        {painPresent === "yes" && (
          <div className="space-y-4 rounded-lg bg-slate-50/70 p-4 border border-slate-200/60">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="field-duration" className="mb-1.5 block text-xs font-medium text-slate-700">Duration *</label>
                <input id="field-duration" name="duration" placeholder="e.g. 3 days, 2 weeks" className={inputClass(errors.duration)} />
                {errors.duration && <p className="mt-1 text-xs text-red-600">{errors.duration}</p>}
              </div>
              <div>
                <label htmlFor="field-onset" className="mb-1.5 block text-xs font-medium text-slate-700">Onset</label>
                <select id="field-onset" name="onset" defaultValue="" className={selectClass()}>
                  <option value="">Select onset</option>
                  <option>Sudden</option>
                  <option>Gradual</option>
                  <option>Recurrent</option>
                  <option>Following recent dental work</option>
                  <option>Following trauma</option>
                </select>
              </div>
              <div>
                <label htmlFor="field-frequency" className="mb-1.5 block text-xs font-medium text-slate-700">Frequency</label>
                <select id="field-frequency" name="frequency" defaultValue="" className={selectClass()}>
                  <option value="">Select frequency</option>
                  <option>Constant</option>
                  <option>Intermittent</option>
                  <option>Spontaneous only</option>
                  <option>Provoked only</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="field-character" className="mb-1.5 block text-xs font-medium text-slate-700">Pain Character / Symptoms *</label>
                <input id="field-symptoms" name="symptoms" placeholder="e.g. Sharp, dull aching, throbbing" className={inputClass(errors.symptoms)} />
                {errors.symptoms && <p className="mt-1 text-xs text-red-600">{errors.symptoms}</p>}
              </div>
              <div>
                <label htmlFor="field-severity" className="mb-1.5 block text-xs font-medium text-slate-700">Severity</label>
                <select id="field-severity" name="severity" defaultValue="" className={selectClass()}>
                  <option value="">Select severity</option>
                  <option>Mild (1-3/10)</option>
                  <option>Moderate (4-6/10)</option>
                  <option>Severe (7-10/10)</option>
                </select>
              </div>
              <div>
                <label htmlFor="field-lingeringPain" className="mb-1.5 block text-xs font-medium text-slate-700">Lingering Thermal Pain</label>
                <select id="field-lingeringPain" name="lingeringPain" defaultValue="" className={selectClass()}>
                  <option value="">Select response</option>
                  <option>Lingers &gt;30 seconds</option>
                  <option>Transient (&lt;10 seconds)</option>
                  <option>No thermal sensitivity</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="field-aggravating" className="mb-1.5 block text-xs font-medium text-slate-700">Provoking / Aggravating Factors</label>
                <input id="field-aggravating" name="aggravating" placeholder="e.g. Cold drinks, chewing, heat" className={inputClass()} />
              </div>
              <div>
                <label htmlFor="field-relieving" className="mb-1.5 block text-xs font-medium text-slate-700">Relieving Factors</label>
                <input id="field-relieving" name="relieving" placeholder="e.g. Ibuprofen, cold water, avoiding area" className={inputClass()} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="field-spontaneousPain" className="mb-1.5 block text-xs font-medium text-slate-700">Spontaneous Pain</label>
                <select id="field-spontaneousPain" name="spontaneousPain" defaultValue="" className={selectClass()}>
                  <option value="">Select option</option>
                  <option>Yes (occurs without stimulus)</option>
                  <option>No (provoked only)</option>
                </select>
              </div>
              <div>
                <label htmlFor="field-nocturnalPain" className="mb-1.5 block text-xs font-medium text-slate-700">Nocturnal Pain (wakes patient)</label>
                <select id="field-nocturnalPain" name="nocturnalPain" defaultValue="" className={selectClass()}>
                  <option value="">Select option</option>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </SectionContainer>

      {/* 4. Tooth / Region */}
      <SectionContainer id="sec-tooth" index={4} title="Tooth / Region" description="Anatomical site under evaluation">
        {/* Interactive Dental Arch Selector */}
        <div className="mb-6">
          <ToothChart
            selectedToothNumber={selectedToothChartNumber}
            onSelectTooth={handleToothChartSelect}
            compact={true}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-toothNumber" className="mb-1.5 block text-xs font-semibold text-slate-700">Tooth Number (FDI or Universal)</label>
            <input id="field-toothNumber" name="toothNumber" placeholder="e.g. 46, 36, 11" className={inputClass(errors.toothNumber)} />
            {errors.toothNumber && <p className="mt-1 text-xs text-red-600">{errors.toothNumber}</p>}
          </div>
          <div>
            <label htmlFor="field-arch" className="mb-1.5 block text-xs font-medium text-slate-700">Dental Arch</label>
            <select id="field-arch" name="arch" defaultValue="" className={selectClass()}>
              <option value="">Select arch</option>
              <option value="maxillary">Maxillary (Upper)</option>
              <option value="mandibular">Mandibular (Lower)</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-quadrant" className="mb-1.5 block text-xs font-medium text-slate-700">Quadrant</label>
            <select id="field-quadrant" name="quadrant" defaultValue="" className={selectClass()}>
              <option value="">Select quadrant</option>
              <option>Upper Right (Q1)</option>
              <option>Upper Left (Q2)</option>
              <option>Lower Left (Q3)</option>
              <option>Lower Right (Q4)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="field-region" className="mb-1.5 block text-xs font-medium text-slate-700">Anatomical Region / Landmark</label>
            <input id="field-region" name="region" placeholder="e.g. Lower right posterior quadrant" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-toothStatus" className="mb-1.5 block text-xs font-medium text-slate-700">Tooth Status</label>
            <select id="field-toothStatus" name="toothStatus" defaultValue="" className={selectClass()}>
              <option value="">Select status</option>
              <option>Present &amp; intact</option>
              <option>Carious</option>
              <option>Restored</option>
              <option>Crowned</option>
              <option>Endodontically treated</option>
              <option>Fractured</option>
              <option>Implant</option>
            </select>
          </div>
        </div>
      </SectionContainer>

      {/* 5. Pulpal Assessment */}
      <SectionContainer id="sec-pulpal" index={5} title="Pulpal Assessment" description="Pulp vitality and sensibility testing findings">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-coldTest" className="mb-1.5 block text-xs font-medium text-slate-700">Cold Test (Endo-Ice / Ethyl Chloride)</label>
            <select id="field-coldTest" name="coldTest" defaultValue="" className={selectClass()}>
              <option value="">Not tested</option>
              <option>Normal (transient response)</option>
              <option>Exaggerated &amp; lingering (&gt;10s)</option>
              <option>Non-responsive / No sensation</option>
              <option>Intense sharp transient</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-heatTest" className="mb-1.5 block text-xs font-medium text-slate-700">Heat Test (Gutta-percha)</label>
            <select id="field-heatTest" name="heatTest" defaultValue="" className={selectClass()}>
              <option value="">Not tested</option>
              <option>Normal</option>
              <option>Exaggerated / lingering</option>
              <option>Non-responsive</option>
              <option>Relieved by cold</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-electricPulpTest" className="mb-1.5 block text-xs font-medium text-slate-700">Electric Pulp Test (EPT)</label>
            <input id="field-electricPulpTest" name="electricPulpTest" placeholder="e.g. Responsive at 35/80, or No response (80/80)" className={inputClass()} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="field-pulpTestResponse" className="mb-1.5 block text-xs font-medium text-slate-700">Pulp Test Observations</label>
            <input id="field-pulpTestResponse" name="pulpTestResponse" placeholder="e.g. Lingering dull ache after cold removal" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-lingeringDuration" className="mb-1.5 block text-xs font-medium text-slate-700">Lingering Duration</label>
            <input id="field-lingeringDuration" name="lingeringDuration" placeholder="e.g. >45 seconds, 2 minutes" className={inputClass()} />
          </div>
        </div>
      </SectionContainer>

      {/* 6. Periapical Assessment */}
      <SectionContainer id="sec-periapical" index={6} title="Periapical Assessment" description="Periapical tissues and mechanical testing">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-percussion" className="mb-1.5 block text-xs font-medium text-slate-700">Percussion Test</label>
            <select id="field-percussion" name="percussion" defaultValue="" className={selectClass()}>
              <option value="">Not tested</option>
              <option>Negative (-) Normal</option>
              <option>Tender / Positive (+)</option>
              <option>Extremely painful (++)</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-palpation" className="mb-1.5 block text-xs font-medium text-slate-700">Palpation (Apical Mucosa)</label>
            <select id="field-palpation" name="palpation" defaultValue="" className={selectClass()}>
              <option value="">Not tested</option>
              <option>Negative (-) Normal</option>
              <option>Tender in buccal sulcus (+)</option>
              <option>Fluctuant swelling felt</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-biteTest" className="mb-1.5 block text-xs font-medium text-slate-700">Bite Test (Tooth Slooth)</label>
            <select id="field-biteTest" name="biteTest" defaultValue="" className={selectClass()}>
              <option value="">Not tested</option>
              <option>Negative</option>
              <option>Pain on release (suggests fracture)</option>
              <option>Pain on biting pressure</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-mobility" className="mb-1.5 block text-xs font-medium text-slate-700">Mobility</label>
            <select id="field-mobility" name="mobility" defaultValue="" className={selectClass()}>
              <option value="">Not tested</option>
              <option>Normal (Grade 0)</option>
              <option>Grade I (&lt;1mm horizontal)</option>
              <option>Grade II (&gt;1mm horizontal)</option>
              <option>Grade III (vertical + horizontal)</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-sinusTract" className="mb-1.5 block text-xs font-medium text-slate-700">Sinus Tract / Stoma</label>
            <select id="field-sinusTract" name="sinusTract" defaultValue="" className={selectClass()}>
              <option value="">Not observed</option>
              <option>Absent</option>
              <option>Present (vestibular/buccal)</option>
              <option>Present (palatal/lingual)</option>
              <option>Present (cutaneous)</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-swelling" className="mb-1.5 block text-xs font-medium text-slate-700">Periapical Swelling</label>
            <select id="field-swelling" name="swelling" defaultValue="" className={selectClass()}>
              <option value="">None</option>
              <option>Localized intraoral (vestibular)</option>
              <option>Diffuse intraoral swelling</option>
              <option>Extraoral facial swelling</option>
            </select>
          </div>
        </div>
      </SectionContainer>

      {/* 7. Periodontal Assessment (Collapsible) */}
      <SectionContainer
        id="sec-periodontal"
        index={7}
        title="Periodontal Assessment"
        description="Structured 6-site probing matrix, attachment loss, and gingival evaluation"
        collapsible
        isOpen={showPeriodontal}
        onToggle={() => setShowPeriodontal(!showPeriodontal)}
      >
        <div className="space-y-5">
          {/* Structured 6-site Periodontal Chart */}
          <PeriodontalChart
            chartData={periodontalChart}
            onChange={(updated) => setPeriodontalChart(updated)}
            initialSelectedTooth={selectedToothChartNumber || "19"}
          />

          {/* Periodontal Summary Notes & Overrides */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Periodontal Examination Summary Notes &amp; Overrides
              </span>
              <span className="text-[10px] text-slate-500">
                Auto-derived from 6-site chart if left blank
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="field-probingDepth" className="mb-1.5 block text-xs font-medium text-slate-700">Probing Depths Summary</label>
                <select id="field-probingDepth" name="probingDepth" defaultValue="" className={selectClass()}>
                  <option value="">Auto-derive from 6-site chart</option>
                  <option>Within normal limits (&le;3mm)</option>
                  <option>Localized pocketing (4-5mm)</option>
                  <option>Deep pocketing (&ge;6mm)</option>
                  <option>Isolated deep narrow pocket (&gt;7mm)</option>
                </select>
              </div>
              <div>
                <label htmlFor="field-bleedingOnProbing" className="mb-1.5 block text-xs font-medium text-slate-700">Bleeding on Probing (BOP)</label>
                <select id="field-bleedingOnProbing" name="bleedingOnProbing" defaultValue="" className={selectClass()}>
                  <option value="">Auto-derive from 6-site chart</option>
                  <option>Absent</option>
                  <option>Localized positive</option>
                  <option>Generalized positive</option>
                </select>
              </div>
              <div>
                <label htmlFor="field-furcation" className="mb-1.5 block text-xs font-medium text-slate-700">Furcation Involvement</label>
                <select id="field-furcation" name="furcation" defaultValue="" className={selectClass()}>
                  <option value="">Auto-derive from 6-site chart</option>
                  <option>Class I (early)</option>
                  <option>Class II (partial)</option>
                  <option>Class III (through-and-through)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="field-recession" className="mb-1.5 block text-xs font-medium text-slate-700">Gingival Recession Notes</label>
                <input id="field-recession" name="recession" placeholder="e.g. 2mm buccal recession on #19" className={inputClass()} />
              </div>
              <div>
                <label htmlFor="field-attachmentLoss" className="mb-1.5 block text-xs font-medium text-slate-700">Clinical Attachment Loss (CAL) Notes</label>
                <input id="field-attachmentLoss" name="attachmentLoss" placeholder="e.g. 5mm CAL on #19 DB" className={inputClass()} />
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>

      {/* 8. Hard-Tissue Findings */}
      <SectionContainer id="sec-hard-tissue" index={8} title="Hard-Tissue Findings" description="Coronal tooth structure, restorations, and caries">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-caries" className="mb-1.5 block text-xs font-medium text-slate-700">Dental Caries</label>
            <select id="field-caries" name="caries" defaultValue="" className={selectClass()}>
              <option value="">None noted</option>
              <option>Deep carious lesion</option>
              <option>Moderate coronal caries</option>
              <option>Incipient enamel caries</option>
              <option>Recurrent / secondary caries</option>
              <option>Root caries</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-restoration" className="mb-1.5 block text-xs font-medium text-slate-700">Existing Restoration</label>
            <input id="field-restoration" name="restoration" placeholder="e.g. Amalgam, Composite, Crown" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-crack" className="mb-1.5 block text-xs font-medium text-slate-700">Crack / Craze Lines</label>
            <input id="field-crack" name="crack" placeholder="e.g. Mesiodistal marginal ridge crack" className={inputClass()} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-fracture" className="mb-1.5 block text-xs font-medium text-slate-700">Fractured Structure</label>
            <input id="field-fracture" name="fracture" placeholder="e.g. Fractured cusp, fractured restoration" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-toothWear" className="mb-1.5 block text-xs font-medium text-slate-700">Tooth Wear</label>
            <select id="field-toothWear" name="toothWear" defaultValue="" className={selectClass()}>
              <option value="">None / Normal</option>
              <option>Attrition (bruxism facets)</option>
              <option>Erosion (acid wear)</option>
              <option>Abfraction</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-discoloration" className="mb-1.5 block text-xs font-medium text-slate-700">Discoloration</label>
            <input id="field-discoloration" name="discoloration" placeholder="e.g. Grayish discoloration of crown" className={inputClass()} />
          </div>
        </div>
      </SectionContainer>

      {/* 9. Soft-Tissue Findings */}
      <SectionContainer index={9} title="Soft-Tissue Findings" description="Oral mucosa, gingiva, and extraoral observations">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-gingivalFinding" className="mb-1.5 block text-xs font-medium text-slate-700">Gingival Status</label>
            <input id="field-gingivalFinding" name="gingivalFinding" placeholder="e.g. Edematous, erythematous marginal gingiva" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-mucosalFinding" className="mb-1.5 block text-xs font-medium text-slate-700">Mucosal Findings</label>
            <input id="field-mucosalFinding" name="mucosalFinding" placeholder="e.g. Normal pink, aphthae, erythema" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-softTissueSwelling" className="mb-1.5 block text-xs font-medium text-slate-700">Soft Tissue Swelling</label>
            <input id="field-softTissueSwelling" name="softTissueSwelling" placeholder="e.g. 5mm fluctuant vestibular swelling" className={inputClass()} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="field-extraoral" className="mb-1.5 block text-xs font-medium text-slate-700">Extraoral Examination</label>
            <input id="field-extraoral" name="extraoral" placeholder="e.g. Facial symmetry, lymphadenopathy, TMJ" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-ulcer" className="mb-1.5 block text-xs font-medium text-slate-700">Ulcers or Lesions</label>
            <input id="field-ulcer" name="ulcer" placeholder="e.g. Ulceration on buccal mucosa" className={inputClass()} />
          </div>
        </div>
      </SectionContainer>

      {/* 10. Medical History */}
      <SectionContainer id="sec-medical" index={10} title="Medical History" description="Systemic conditions, medications, and allergies">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-systemicConditions" className="mb-1.5 block text-xs font-medium text-slate-700">Systemic Conditions</label>
            <textarea id="field-systemicConditions" name="systemicConditions" rows={2} placeholder="e.g. Hypertension, Diabetes, Asthma, None reported" className={textareaClass()} />
          </div>
          <div>
            <label htmlFor="field-medications" className="mb-1.5 block text-xs font-medium text-slate-700">Current Medications</label>
            <textarea id="field-medications" name="medications" rows={2} placeholder="e.g. Metformin, Amlodipine, None" className={textareaClass()} />
          </div>
          <div>
            <label htmlFor="field-allergies" className="mb-1.5 block text-xs font-medium text-slate-700">Allergies</label>
            <textarea id="field-allergies" name="allergies" rows={2} placeholder="e.g. Penicillin, Latex, NKDA" className={textareaClass()} />
          </div>
        </div>
      </SectionContainer>

      {/* 11. Dental History (Collapsible) */}
      <SectionContainer
        id="sec-dental-history"
        index={11}
        title="Dental History"
        description="Previous dental care, pain history, and extractions"
        collapsible
        isOpen={showDentalHistory}
        onToggle={() => setShowDentalHistory(!showDentalHistory)}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-previousTreatment" className="mb-1.5 block text-xs font-medium text-slate-700">Previous Treatment in Area</label>
            <input id="field-previousTreatment" name="previousTreatment" placeholder="e.g. Filling 2 years ago" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-previousPain" className="mb-1.5 block text-xs font-medium text-slate-700">Previous Pain Episodes</label>
            <input id="field-previousPain" name="previousPain" placeholder="e.g. Similar sensitivity months ago" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-traumaHistory" className="mb-1.5 block text-xs font-medium text-slate-700">Trauma History</label>
            <input id="field-traumaHistory" name="traumaHistory" placeholder="e.g. Sports impact 6 months ago" className={inputClass()} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="field-endodonticHistory" className="mb-1.5 block text-xs font-medium text-slate-700">Endodontic History</label>
            <input id="field-endodonticHistory" name="endodonticHistory" placeholder="e.g. Root canal on adjacent tooth" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-extractionHistory" className="mb-1.5 block text-xs font-medium text-slate-700">Extraction History</label>
            <input id="field-extractionHistory" name="extractionHistory" placeholder="e.g. Third molars removed" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-hygiene" className="mb-1.5 block text-xs font-medium text-slate-700">Oral Hygiene Level</label>
            <select id="field-hygiene" name="hygiene" defaultValue="" className={selectClass()}>
              <option value="">Select hygiene</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
            </select>
          </div>
        </div>
      </SectionContainer>

      {/* 12. Investigations */}
      <SectionContainer id="sec-investigations" index={12} title="Investigations" description="Diagnostic tests and radiographic records">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="field-investigationsPerformed" className="mb-1.5 block text-xs font-medium text-slate-700">Investigations Performed</label>
            <input id="field-investigationsPerformed" name="investigationsPerformed" placeholder="e.g. Cold test, Percussion, Palpation" className={inputClass()} />
          </div>
          <div>
            <label htmlFor="field-radiographAvailable" className="mb-1.5 block text-xs font-medium text-slate-700">Radiograph Taken for Consultation</label>
            <select id="field-radiographAvailable" name="radiographAvailable" defaultValue="" className={selectClass()}>
              <option value="">Select status</option>
              <option>No radiograph available</option>
              <option>Periapical radiograph taken</option>
              <option>Bitewing radiograph taken</option>
              <option>Panoramic radiograph taken</option>
              <option>CBCT taken</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="field-investigationResults" className="mb-1.5 block text-xs font-medium text-slate-700">Investigation Findings Summary</label>
          <textarea id="field-investigationResults" name="investigationResults" rows={2} placeholder="Summarize any clinical test responses..." className={textareaClass()} />
        </div>
      </SectionContainer>

      {/* 13. Relevant Negative Findings */}
      <SectionContainer index={13} title="Relevant Negative Findings" description="Explicitly ruled-out symptoms and signs">
        <div>
          <label htmlFor="field-relevantNegativeFindings" className="mb-1.5 block text-xs font-medium text-slate-700">Negative Findings (important for differential diagnosis)</label>
          <textarea id="field-relevantNegativeFindings" name="relevantNegativeFindings" rows={2} placeholder="e.g. No facial swelling, no vestibular sinus tract, no abnormal mobility, no lymphadenopathy..." className={textareaClass()} />
        </div>
      </SectionContainer>

      {/* 14. Additional Clinical Notes */}
      <SectionContainer index={14} title="Additional Clinical Notes" description="Clinician observations, patient preferences, or diagnostic questions">
        <div>
          <label htmlFor="field-additionalClinicalNotes" className="mb-1.5 block text-xs font-medium text-slate-700">Clinician Notes</label>
          <textarea id="field-additionalClinicalNotes" name="additionalClinicalNotes" rows={2} placeholder="Any additional context for clinical decision support..." className={textareaClass()} />
        </div>
      </SectionContainer>

      {/* 15. Radiograph Attachment */}
      <section id="sec-radiograph" className="glass-card p-5 sm:p-7 scroll-mt-24">
        <div className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50/90 text-xs font-bold text-teal-800 border border-teal-200/80 shadow-xs">15</span>
          <div>
            <h2 className="text-base font-semibold text-slate-950">Radiograph</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">Attach an image file if one is available for clinician reference.</p>
          </div>
        </div>
        <label htmlFor="radiograph" className="mt-6 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-teal-300/80 bg-white/40 px-6 py-8 text-center transition hover:border-teal-500 hover:bg-teal-50/40 backdrop-blur-xs">
          {radiograph?.dataUrl ? (
            <Image src={radiograph.dataUrl} alt={`Preview of ${fileName}`} width={320} height={128} unoptimized className="mb-3 max-h-32 w-auto max-w-full rounded object-contain shadow-xs" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-teal-700 shadow-sm border border-teal-100">
              <Icon name="plus" size={20} />
            </span>
          )}
          <span className="mt-3 text-sm font-semibold text-slate-800">{fileName || "Drop a radiograph here or browse"}</span>
          <span className="mt-1 text-xs text-slate-500">PNG, JPG up to 10MB</span>
          <input id="radiograph" type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => handleRadiograph(e.target.files?.[0])} />
        </label>
        {radiograph && (
          <button type="button" onClick={() => { setRadiograph(null); setFileName(""); }} className="mt-3 text-xs font-semibold text-slate-600 underline hover:text-red-700">
            Remove image
          </button>
        )}
        {errors.radiograph && <p className="mt-2 text-sm text-red-700">{errors.radiograph}</p>}
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
          <Icon name="spark" size={14} />
          <span>AI image interpretation will be added later. Radiographs are preserved locally and excluded from AI prompts in this prototype.</span>
        </p>
      </section>

      {errors.submit && (
        <p role="alert" className="glass-card-subtle glass-tint-rose rounded-lg border border-rose-300 px-4 py-3 text-sm leading-5 text-rose-900 shadow-xs">
          {errors.submit}
        </p>
      )}

      {/* Form Action Controls */}
      <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs leading-5 text-slate-500">
            {editingCase
              ? "Save clinical updates directly or trigger a fresh AI reasoning analysis."
              : "You can review and edit your clinical findings before submitting."}
          </p>
          {draftMessage && <p role="status" className="mt-1 text-xs font-medium text-teal-700">{draftMessage}</p>}
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {editingCase ? (
            <>
              <button
                type="button"
                onClick={handleSaveWithoutAnalyze}
                className="glass-button inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300/90 bg-white/80 px-4 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-800 shadow-xs"
              >
                <Icon name="folder" size={16} />
                Save Changes (Mark Stale)
              </button>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="glass-button glass-shine inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-75"
              >
                <Icon name="spark" size={16} />
                {isAnalyzing ? "Re-analyzing..." : "Re-analyze with Dentarith"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={saveDraft}
                className="glass-button inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300/90 bg-white/80 px-5 text-sm font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-800 shadow-xs"
              >
                <Icon name="folder" size={17} />
                Save Draft
              </button>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="glass-button glass-shine inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-75 shadow-xs"
              >
                <Icon name="spark" size={17} />
                {isAnalyzing ? "Analyzing case..." : "Analyze Case"}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}

function SectionContainer({
  id,
  index,
  title,
  description,
  collapsible = false,
  isOpen = true,
  onToggle,
  children,
}: {
  id?: string;
  index: number;
  title: string;
  description: string;
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="glass-card p-5 sm:p-7 scroll-mt-24">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50/90 text-xs font-bold text-teal-800 border border-teal-200/80 shadow-xs">
            {index}
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
          </div>
        </div>
        {collapsible && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="glass-button rounded-lg border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-950"
          >
            {isOpen ? "Collapse" : "Expand (optional)"}
          </button>
        )}
      </div>
      {(!collapsible || isOpen) && <div className="mt-5">{children}</div>}
    </section>
  );
}

function inputClass(error?: string) {
  return `w-full h-10 rounded-lg border ${
    error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300/90 focus:border-teal-600 focus:ring-teal-500/20"
  } bg-white/90 focus:bg-white px-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 shadow-xs`;
}

function selectClass(error?: string) {
  return `w-full h-10 rounded-lg border ${
    error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300/90 focus:border-teal-600 focus:ring-teal-500/20"
  } bg-white/90 focus:bg-white px-3 text-xs text-slate-900 outline-none transition focus:ring-2 shadow-xs`;
}

function textareaClass(error?: string) {
  return `w-full rounded-lg border ${
    error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300/90 focus:border-teal-600 focus:ring-teal-500/20"
  } bg-white/90 focus:bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 resize-y shadow-xs`;
}
