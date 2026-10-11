"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, Icon, StatCard, ToothPill } from "@/components/clinical-ui";
import { getCases, type StoredCase } from "@/lib/case-storage";

export default function ReportsPage() {
  const [cases, setCases] = useState<StoredCase[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCases(getCases());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const analyzedCases = cases.filter((c) => Boolean(c.analysis));
  const staleCases = analyzedCases.filter((c) => c.analysisStatus === "stale");

  return (
    <AppShell activeItem="Reports">
      <div className="mx-auto max-w-6xl space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Clinical Workspace / Reports
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Clinical Decision Reports
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Generate, print, or export professional PDF clinical decision support summaries.
            </p>
          </div>
          <Link
            href="/cases"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-800"
          >
            <Icon name="folder" size={15} />
            View All Cases
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Reports Available"
            value={String(analyzedCases.length)}
            detail="Analyzed cases"
            icon="report"
          />
          <StatCard
            label="Up-to-Date Reports"
            value={String(analyzedCases.length - staleCases.length)}
            detail="Current reasoning"
            icon="spark"
          />
          <StatCard
            label="Reports Requiring Review"
            value={String(staleCases.length)}
            detail="Clinical data updated"
            icon="folder"
          />
        </div>

        {/* Reports List */}
        {analyzedCases.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <Icon name="report" size={26} />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-950">
              No Clinical Reports Available Yet
            </h2>
            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
              Reports are automatically generated when a clinical case is analyzed. Create and analyze a case to view and print clinical reports.
            </p>
            <Link
              href="/cases/new"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800"
            >
              <Icon name="plus" size={16} />
              New Clinical Case
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Case ID</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Patient / Tooth</th>
                    <th className="px-4 py-3.5">Leading Consideration</th>
                    <th className="px-4 py-3.5">Report Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {analyzedCases.map((item) => {
                    const tooth =
                      item.caseData.toothAssessment?.toothNumber ||
                      item.caseData.clinicalExamination.toothOrRegion;
                    const leadingDiag =
                      item.analysis?.possibleDiagnoses?.find((d) => d.rank === 1) ||
                      item.analysis?.possibleDiagnoses?.[0];
                    const isStale = item.analysisStatus === "stale";

                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-4 font-bold text-slate-950">
                          <Link
                            href={`/cases/${encodeURIComponent(item.id)}/report`}
                            className="text-teal-700 hover:underline"
                          >
                            {item.id}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                          {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          <p className="font-medium text-slate-900">
                            {item.caseData.caseInformation.age}y / {item.caseData.caseInformation.sex}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {tooth ? (
                              <ToothPill toothNumber={tooth} />
                            ) : (
                              <span className="text-slate-400 text-[11px]">Unspecified tooth</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {leadingDiag ? (
                            <div>
                              <span className="font-semibold text-slate-900">
                                {leadingDiag.diagnosis}
                              </span>
                              <span className="ml-1.5 inline-block rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200">
                                {leadingDiag.diagnosticCategory}
                              </span>
                            </div>
                          ) : (
                            <span className="italic text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                item.reviewStatus === "reviewed" || item.status === "reviewed"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  : item.reviewStatus === "needs_review"
                                  ? "border-amber-300 bg-amber-50 text-amber-800"
                                  : "border-slate-300 bg-slate-50 text-slate-700"
                              }`}
                            >
                              {item.reviewStatus === "reviewed" || item.status === "reviewed"
                                ? "Reviewed"
                                : item.reviewStatus === "needs_review"
                                ? "Needs Review"
                                : "Pending"}
                            </span>
                            {isStale && (
                              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-900">
                                ⚠️ Stale Data
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/cases/${encodeURIComponent(item.id)}/report`}
                              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800"
                            >
                              View / Print Report
                            </Link>
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
      </div>
    </AppShell>
  );
}
