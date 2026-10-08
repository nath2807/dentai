"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AppShell, Icon, StatCard } from "@/components/clinical-ui";
import {
  getCases,
  deleteCase,
  type StoredCase,
  type CaseStatus,
} from "@/lib/case-storage";

export default function CasesPage() {
  const [cases, setCases] = useState<StoredCase[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [caseToDelete, setCaseToDelete] = useState<StoredCase | null>(null);

  function refreshCases() {
    setCases(getCases());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshCases();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totalCases = cases.length;
  const analyzedCasesCount = cases.filter((c) => c.status === "analyzed").length;
  const staleCasesCount = cases.filter(
    (c) => c.analysisStatus === "stale" && c.analysis !== null
  ).length;

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "stale") {
          if (item.analysisStatus !== "stale") return false;
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

  return (
    <AppShell activeItem="Clinical Cases">
      <div className="mx-auto max-w-6xl space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Dentarith / Case Management
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Clinical Cases Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage saved cases, track Dentarith diagnostic analyses, and export clinical decision reports.
            </p>
          </div>
          <Link
            href="/cases/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            <Icon name="plus" size={16} />
            New Clinical Case
          </Link>
        </div>

        {/* Privacy Notice */}
        <div className="flex items-start gap-3 rounded-xl border border-teal-200/80 bg-teal-50/60 p-4 text-xs text-teal-950">
          <Icon name="folder" size={17} />
          <div>
            <span className="font-bold">Dentarith Local Storage Notice:</span> Cases are stored locally in your web browser for this clinical decision-support demonstration. Do not enter direct patient identifying data (PHI/PII). This demonstration is not a HIPAA/GDPR-compliant electronic health record system.
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Cases"
            value={String(totalCases)}
            detail="Stored in this browser"
            icon="folder"
          />
          <StatCard
            label="Analyzed with Dentarith"
            value={String(analyzedCasesCount)}
            detail="With clinical reasoning"
            icon="spark"
          />
          <StatCard
            label="Stale / Needing Review"
            value={String(staleCasesCount)}
            detail="Clinical data changed"
            icon="report"
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by Case ID, tooth, complaint, or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-status" className="text-xs font-semibold text-slate-600">
              Status:
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="all">All Cases</option>
              <option value="analyzed">Analyzed</option>
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="stale">Stale Analysis</option>
            </select>
          </div>
        </div>

        {/* Case List or Empty State */}
        {filteredCases.length === 0 ? (
          <EmptyCasesState hasTotalCases={totalCases > 0} onClearFilters={() => { setSearchQuery(""); setStatusFilter("all"); }} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Case ID</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Patient</th>
                    <th className="px-4 py-3.5">Tooth / Region</th>
                    <th className="px-4 py-3.5">Leading Consideration</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCases.map((item) => {
                    const tooth =
                      item.caseData.toothAssessment?.toothNumber ||
                      item.caseData.clinicalExamination.toothOrRegion ||
                      "Unspecified";
                    const leadingDiag =
                      item.analysis?.possibleDiagnoses?.find((d) => d.rank === 1) ||
                      item.analysis?.possibleDiagnoses?.[0];
                    const dateFormatted = new Date(
                      item.updatedAt || item.createdAt
                    ).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-4 font-bold text-slate-950">
                          <Link
                            href={`/cases/${encodeURIComponent(item.id)}`}
                            className="text-teal-700 hover:underline"
                          >
                            {item.id}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                          {dateFormatted}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.caseData.caseInformation.age}y / {item.caseData.caseInformation.sex}
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-800">
                          {tooth}
                        </td>
                        <td className="px-4 py-4">
                          {leadingDiag ? (
                            <div>
                              <span className="font-semibold text-slate-900">
                                {leadingDiag.diagnosis}
                              </span>
                              <span className="ml-1.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                                {leadingDiag.diagnosticCategory}
                              </span>
                            </div>
                          ) : (
                            <span className="italic text-slate-400">Not analyzed yet</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={item.status} analysisStatus={item.analysisStatus} hasAnalysis={Boolean(item.analysis)} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/cases/${encodeURIComponent(item.id)}`}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-teal-500 hover:text-teal-800"
                            >
                              Open
                            </Link>
                            {item.analysis && (
                              <Link
                                href={`/cases/${encodeURIComponent(item.id)}/report`}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 transition hover:bg-teal-50"
                              >
                                Report
                              </Link>
                            )}
                            <button
                              onClick={() => setCaseToDelete(item)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300"
                              title="Delete case"
                            >
                              Delete
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 text-red-600">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 font-bold">
                  !
                </span>
                <h3 className="text-base font-bold text-slate-950">
                  Delete Clinical Case?
                </h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                Are you sure you want to delete <span className="font-bold text-slate-900">{caseToDelete.id}</span>? This will permanently remove the locally stored case data and clinical reasoning assessment from this browser session.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCaseToDelete(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700"
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

function StatusBadge({
  status,
  analysisStatus,
  hasAnalysis,
}: {
  status: CaseStatus;
  analysisStatus?: "current" | "stale";
  hasAnalysis: boolean;
}) {
  if (analysisStatus === "stale") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
        Stale Analysis
      </span>
    );
  }
  if (status === "analyzed" || hasAnalysis) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
        Analyzed
      </span>
    );
  }
  if (status === "reviewed") {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
        Reviewed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
      Draft
    </span>
  );
}

function EmptyCasesState({
  hasTotalCases,
  onClearFilters,
}: {
  hasTotalCases: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Icon name="folder" size={26} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-950">
        {hasTotalCases ? "No matching cases found" : "No clinical cases yet"}
      </h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
        {hasTotalCases
          ? "No saved cases match your current search query or status filter."
          : "Create your first dental consultation to capture findings, request decision-support analysis, and generate reports."}
      </p>
      {hasTotalCases ? (
        <button
          onClick={onClearFilters}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 transition hover:border-teal-500"
        >
          Clear Filters
        </button>
      ) : (
        <Link
          href="/cases/new"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800"
        >
          <Icon name="plus" size={16} />
          New Clinical Case
        </Link>
      )}
    </div>
  );
}
