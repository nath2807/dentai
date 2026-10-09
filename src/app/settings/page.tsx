"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell, Icon, StatCard } from "@/components/clinical-ui";
import {
  clearCases,
  exportCases,
  getStorageStats,
  importCasesSafely,
  seedBenchmarkCases,
  type StorageStats,
} from "@/lib/case-storage";

export default function SettingsPage() {
  const [stats, setStats] = useState<StorageStats>({
    caseCount: 0,
    analyzedCount: 0,
    reviewedCount: 0,
    estimatedBytes: 0,
    formattedSize: "0 KB",
    isNearQuota: false,
  });
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshStats() {
    setStats(getStorageStats());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshStats();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function handleExportAll() {
    try {
      const jsonBundle = exportCases();
      const dateStr = new Date().toISOString().split("T")[0];
      const blob = new Blob([jsonBundle], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dentarith-clinical-cases-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedbackMessage(
        `Successfully exported ${stats.caseCount} clinical cases as a backup file.`
      );
      setErrorMessage("");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to export cases."
      );
    }
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : "";
        const result = importCasesSafely(text, { overwriteExisting });
        if (result.success) {
          const parts: string[] = [];
          if (result.importedCount > 0) parts.push(`${result.importedCount} new`);
          if (result.updatedCount > 0) parts.push(`${result.updatedCount} updated`);
          if (result.skippedCount > 0) parts.push(`${result.skippedCount} skipped`);
          setFeedbackMessage(
            `Import complete: ${parts.join(", ") || "No changes"}.`
          );
          setErrorMessage("");
          refreshStats();
        } else {
          setErrorMessage(
            result.errors.length
              ? result.errors.join("; ")
              : "Import could not be completed."
          );
          setFeedbackMessage("");
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to process backup file."
        );
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  function handleSeedBenchmarks() {
    setFeedbackMessage("");
    setErrorMessage("");
    const result = seedBenchmarkCases(false);
    refreshStats();
    if (result.addedCount > 0) {
      setFeedbackMessage(
        `Added ${result.addedCount} synthetic benchmark cases (Total in workspace: ${result.totalCount}).`
      );
    } else {
      setFeedbackMessage(
        `All benchmark cases are already present in workspace (Total: ${result.totalCount}).`
      );
    }
  }

  function handleConfirmClear() {
    clearCases();
    setShowClearModal(false);
    refreshStats();
    setFeedbackMessage("All locally stored cases have been safely removed from this browser session.");
    setErrorMessage("");
  }

  return (
    <AppShell activeItem="Settings">
      <div className="mx-auto max-w-5xl space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Workspace Administration
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Workspace &amp; Data Management
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage local case storage, export backups, import clinical bundles, and load synthetic benchmarks.
            </p>
          </div>
          <Link
            href="/cases"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-800"
          >
            <Icon name="folder" size={15} />
            View Cases
          </Link>
        </div>

        {/* Feedback alerts */}
        {feedbackMessage && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-medium text-emerald-900">
            ✓ {feedbackMessage}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs font-medium text-red-900">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Privacy & Storage Architecture Notice */}
        <div className="flex items-start gap-3.5 rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-950">
          <Icon name="folder" size={18} />
          <div className="space-y-1">
            <p className="font-bold">
              Privacy-Conscious Local-First Storage Architecture
            </p>
            <p className="leading-relaxed text-teal-900/90">
              Dentarith operates as an offline-capable, browser-local clinical decision copilot. Clinical case findings, differential analyses, clinician decision traces, and report drafts are persisted exclusively in your web browser&apos;s local storage. No patient information is stored in any external cloud database.
            </p>
            <p className="text-[11px] font-medium text-teal-800">
              Note: Do not enter direct patient identifying data (PHI/PII). Use de-identified or synthetic case identifiers.
            </p>
          </div>
        </div>

        {/* Storage Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Cases"
            value={String(stats.caseCount)}
            detail="Stored locally"
            icon="folder"
          />
          <StatCard
            label="Analyzed Cases"
            value={String(stats.analyzedCount)}
            detail="With AI reasoning"
            icon="spark"
          />
          <StatCard
            label="Reviewed Cases"
            value={String(stats.reviewedCount)}
            detail="Clinician decision trace"
            icon="report"
          />
          <StatCard
            label="Storage Footprint"
            value={stats.formattedSize}
            detail={stats.isNearQuota ? "⚠️ Near quota" : "Healthy margin"}
            icon="settings"
          />
        </div>

        {/* Data Management Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Export & Backup */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon name="report" size={16} />
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Backup &amp; Export Cases
                </h2>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Download a de-identified JSON backup file containing structured clinical findings, AI differential reasoning, and clinician decision traces.
              </p>
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-950">
                <span className="font-bold">⚠️ Backup Scope Notice:</span> To prevent browser quota exhaustion, raw radiograph pixel image binaries (base64) are deliberately excluded. Case metadata, clinical text, and review traces are saved, but raw radiograph images cannot be restored from this file.
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {stats.caseCount} {stats.caseCount === 1 ? "case" : "cases"} ready
              </span>
              <button
                onClick={handleExportAll}
                disabled={stats.caseCount === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="arrow" size={14} />
                Export Backup (.json)
              </button>
            </div>
          </div>

          {/* Import & Restore */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Icon name="folder" size={16} />
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Restore &amp; Import Cases
                </h2>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Restore a previously exported Dentarith JSON backup file. Uploaded records are strictly validated against the clinical schema. Note: Excluded radiograph binary images cannot be restored.
              </p>
              <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Overwrite existing cases if case IDs match</span>
              </label>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
                id="import-file-input"
              />
              <span className="text-[11px] text-slate-400">
                Format: Dentarith JSON
              </span>
              <label
                htmlFor="import-file-input"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Icon name="plus" size={14} />
                Select File to Import
              </label>
            </div>
          </div>

          {/* Synthetic Benchmarks */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon name="spark" size={16} />
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Synthetic Educational Benchmark Cases
                </h2>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Load synthetic educational benchmark cases (Symptomatic Irreversible Pulpitis, Reversible Pulpitis, and Pulpal Necrosis) to evaluate reasoning, differential mapping, clinician review traces, and printable reports.
              </p>
              <p className="text-[11px] font-medium text-amber-800">
                Notice: These cases are simulated educational examples, not clinically validated reference standards or real patient records.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                3 Reference Archetypes
              </span>
              <button
                onClick={handleSeedBenchmarks}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-4 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
              >
                <Icon name="spark" size={14} />
                Load Benchmark Cases
              </button>
            </div>
          </div>

          {/* Reset Workspace */}
          <div className="flex flex-col justify-between rounded-xl border border-red-200 bg-red-50/40 p-5 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  <Icon name="folder" size={16} />
                </span>
                <h2 className="text-sm font-bold text-red-950">
                  Reset Local Workspace
                </h2>
              </div>
              <p className="text-xs leading-5 text-red-900/80">
                Purge all locally stored case intake data, AI differential analyses, and clinician decision traces from this browser session. This action cannot be undone unless you have created a backup.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-red-200/60 flex items-center justify-between">
              <span className="text-[11px] text-red-700 font-medium">
                Irreversible Action
              </span>
              <button
                onClick={() => setShowClearModal(true)}
                disabled={stats.caseCount === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All Cases
              </button>
            </div>
          </div>
        </div>

        {/* Clear Workspace Confirmation Modal */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
                  ⚠️
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Purge All Clinical Cases?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Confirm deletion of all {stats.caseCount} locally stored cases.
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Are you sure you want to permanently clear all cases from this browser session? This includes all structured findings, AI reasoning analyses, and clinician decision traces.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirm &amp; Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
