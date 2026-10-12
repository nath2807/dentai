"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  AppShell,
  Icon,
  StatCard,
  LikelihoodBadge,
  ToothPill,
} from "@/components/clinical-ui";
import {
  getCases,
  deleteCase,
  seedBenchmarkCases,
  getStorageStats,
  type StoredCase,
  type StorageStats,
} from "@/lib/case-storage";
import { formatToothWithSystem } from "@/lib/tooth-numbering";
import { getCloudSyncClient, type SyncClientState } from "@/lib/cloud-sync-client";

export default function CasesPage() {
  const [syncState, setSyncState] = useState<SyncClientState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cases, setCases] = useState<StoredCase[]>([]);
  const [stats, setStats] = useState<StorageStats>({
    caseCount: 0,
    analyzedCount: 0,
    reviewedCount: 0,
    estimatedBytes: 0,
    formattedSize: "0 KB",
    isNearQuota: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [caseToDelete, setCaseToDelete] = useState<StoredCase | null>(null);

  function refreshCases() {
    setCases(getCases());
    setStats(getStorageStats());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshCases();
    }, 0);
    const client = getCloudSyncClient();
    const unsubscribe = client.subscribe((state) => {
      setSyncState(state);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  async function handleCloudSync() {
    setIsSyncing(true);
    try {
      const client = getCloudSyncClient();
      await client.sync();
      refreshCases();
    } finally {
      setIsSyncing(false);
    }
  }

  const totalCases = cases.length;
  const analyzedCasesCount = cases.filter((c) => c.status === "analyzed" || c.analysis !== null).length;
  const reviewedCasesCount = cases.filter(
    (c) => c.reviewStatus === "reviewed" || c.status === "reviewed"
  ).length;
  const staleCasesCount = cases.filter(
    (c) => c.analysisStatus === "stale" && c.analysis !== null
  ).length;

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "stale") {
          if (item.analysisStatus !== "stale") return false;
        } else if (statusFilter === "reviewed") {
          if (item.reviewStatus !== "reviewed" && item.status !== "reviewed") return false;
        } else if (statusFilter === "needs_review") {
          if (item.reviewStatus !== "needs_review" && item.review?.status !== "needs_review") return false;
        } else if (statusFilter === "analyzed") {
          if (!item.analysis) return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const idMatch = item.id.toLowerCase().includes(query);
        const tooth = (
          item.caseData.toothAssessment?.toothNumber ||
          item.caseData.clinicalExamination.toothOrRegion ||
          ""
        ).toLowerCase();
        const complaint = item.caseData.chiefComplaint.toLowerCase();
        const leadingDiag =
          item.analysis?.possibleDiagnoses?.[0]?.diagnosis.toLowerCase() || "";

        return (
          idMatch ||
          tooth.includes(query) ||
          complaint.includes(query) ||
          leadingDiag.includes(query)
        );
      }

      return true;
    });
  }, [cases, searchQuery, statusFilter]);

  function confirmDelete() {
    if (!caseToDelete) return;
    deleteCase(caseToDelete.id);
    setCaseToDelete(null);
    refreshCases();
  }

  function handleLoadBenchmarks() {
    seedBenchmarkCases(false);
    refreshCases();
  }

  return (
    <AppShell activeItem="Clinical Cases">
      <div className="mx-auto max-w-6xl space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200/90 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-teal-600" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800">
                Dentarith Workspace / Clinical Registry
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Clinical Cases Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage saved dental assessments, review diagnostic reasoning, and generate printable reports.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {syncState?.isAuthenticated && (
              <button
                type="button"
                onClick={handleCloudSync}
                disabled={isSyncing}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3.5 text-xs font-bold text-teal-800 transition hover:bg-teal-50 disabled:opacity-50"
              >
                <Icon name="sync" size={14} className={isSyncing ? "animate-spin" : ""} />
                <span>{isSyncing ? "Syncing..." : "Sync Cloud"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLoadBenchmarks}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3.5 text-xs font-bold text-teal-900 transition hover:bg-teal-100"
            >
              <Icon name="spark" size={14} />
              <span>Seed Reference Benchmarks</span>
            </button>
            <Link
              href="/cases/new"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-teal-800"
            >
              <Icon name="plus" size={14} />
              <span>New Clinical Case</span>
            </Link>
          </div>
        </div>

        {/* Local Storage & Non-Autonomous Mode Notice */}
        <div className="flex items-start justify-between gap-3 rounded-xl border border-teal-200/90 bg-teal-50/70 p-4 text-xs text-teal-950">
          <div className="flex items-start gap-2.5">
            <Icon name="shield" size={17} className="text-teal-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Dentarith Local Storage &amp; Clinician Oversight:</span>
              <p className="mt-0.5 text-teal-900/90 leading-relaxed">
                Cases are stored in your local browser ({stats.formattedSize} currently utilized). Never enter unprotected PHI. Dentarith operates strictly as decision support; the licensed clinician retains ultimate diagnosis and treatment responsibility.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-xs font-bold text-teal-800 hover:text-teal-950 underline shrink-0 hidden sm:inline"
          >
            Manage Storage
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Cases"
            value={String(totalCases)}
            detail="Stored locally"
            icon="folder"
          />
          <StatCard
            label="Analyzed"
            value={String(analyzedCasesCount)}
            detail="AI reasoning generated"
            icon="spark"
          />
          <StatCard
            label="Clinician Verified"
            value={String(reviewedCasesCount)}
            detail="Dentist signed off"
            icon="check"
          />
          <StatCard
            label="Pending Review / Stale"
            value={String(staleCasesCount)}
            detail="Needs clinician check"
            icon="alert"
          />
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case ID, tooth number, symptoms, or diagnosis..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Cases" },
              { id: "analyzed", label: "Analyzed" },
              { id: "needs_review", label: "Needs Review" },
              { id: "reviewed", label: "Reviewed" },
              { id: "stale", label: "Stale" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === tab.id
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cases Table / Empty State */}
        {filteredCases.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-800 border border-teal-100">
              <Icon name="folder" size={26} />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-950">
              {searchQuery || statusFilter !== "all"
                ? "No matching clinical cases found"
                : "No clinical cases stored yet"}
            </h2>
            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
              {searchQuery || statusFilter !== "all"
                ? "Try clearing your search query or switching your status filter."
                : "Create your first dental assessment or load our synthetic reference benchmark cases to explore the clinical reasoning copilot."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/cases/new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition"
              >
                <Icon name="plus" size={15} />
                Create New Case
              </Link>
              <button
                type="button"
                onClick={handleLoadBenchmarks}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <Icon name="spark" size={15} />
                Seed Reference Benchmarks
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Case Identification</th>
                    <th className="px-4 py-3.5">Tooth / Region</th>
                    <th className="px-4 py-3.5">Chief Complaint</th>
                    <th className="px-4 py-3.5">Leading Diagnostic Consideration</th>
                    <th className="px-4 py-3.5">Review Status</th>
                    <th className="px-5 py-3.5 text-right">Clinical Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCases.map((c) => {
                    const toothNum =
                      c.caseData.toothAssessment?.toothNumber ||
                      c.caseData.clinicalExamination.toothOrRegion ||
                      "";
                    const leadingDiag =
                      c.analysis?.possibleDiagnoses?.[0]?.diagnosis || "Pending Analysis";
                    const likelihood =
                      c.analysis?.possibleDiagnoses?.[0]?.likelihood;
                    const isStale = c.analysisStatus === "stale" && Boolean(c.analysis);
                    const isReviewed =
                      c.reviewStatus === "reviewed" || c.status === "reviewed";

                    return (
                      <tr
                        key={c.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        {/* Case ID & Date */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/cases/${encodeURIComponent(c.id)}`}
                            className="font-bold text-slate-950 hover:text-teal-800 transition"
                          >
                            {c.id}
                          </Link>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {new Date(c.updatedAt || c.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </td>

                        {/* Tooth & Arch */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {toothNum ? (
                            <div>
                              <ToothPill toothNumber={toothNum} />
                              <p
                                className="mt-0.5 text-[10px] text-slate-400 font-medium truncate max-w-[150px]"
                                title={formatToothWithSystem(toothNum)}
                              >
                                {formatToothWithSystem(toothNum)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">Not specified</span>
                          )}
                        </td>

                        {/* Chief Complaint */}
                        <td className="px-4 py-4 max-w-xs">
                          <p className="truncate font-medium text-slate-900" title={c.caseData.chiefComplaint}>
                            {c.caseData.chiefComplaint}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Age: {c.caseData.caseInformation.age}y • {c.caseData.caseInformation.sex}
                          </p>
                        </td>

                        {/* Leading Diagnosis */}
                        <td className="px-4 py-4 max-w-xs">
                          {c.analysis ? (
                            <div>
                              <p className="font-semibold text-slate-950 truncate" title={leadingDiag}>
                                {leadingDiag}
                              </p>
                              {likelihood && (
                                <div className="mt-1">
                                  <LikelihoodBadge likelihood={likelihood} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not yet analyzed</span>
                          )}
                        </td>

                        {/* Review Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isStale ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Stale Analysis
                            </span>
                          ) : isReviewed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              Clinician Verified
                            </span>
                          ) : c.analysis ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 border border-teal-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                              Needs Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                              Draft Intake
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/cases/${encodeURIComponent(c.id)}`}
                              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-800 transition"
                              title="Open case workspace"
                            >
                              Open
                            </Link>
                            {c.analysis && (
                              <Link
                                href={`/cases/${encodeURIComponent(c.id)}/report`}
                                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-800 transition"
                                title="Print clinical report"
                              >
                                <Icon name="printer" size={14} />
                              </Link>
                            )}
                            <Link
                              href={`/cases/new?id=${encodeURIComponent(c.id)}`}
                              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-800 transition"
                              title="Edit clinical findings"
                            >
                              <Icon name="edit" size={14} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setCaseToDelete(c)}
                              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50 transition"
                              title="Delete case"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {caseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
              onClick={() => setCaseToDelete(null)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
                <Icon name="trash" size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-950">
                Delete Clinical Case {caseToDelete.id}?
              </h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                This will permanently remove this case and its associated diagnostic reasoning and clinician review history from your local browser storage. This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCaseToDelete(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
