"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, Icon, StatCard } from "@/components/clinical-ui";
import { getCases, type StoredCase } from "@/lib/case-storage";

export default function Home() {
  const [cases, setCases] = useState<StoredCase[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCases(getCases());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totalCases = cases.length;
  const analyzedCasesCount = cases.filter((c) => Boolean(c.analysis)).length;
  const recentCases = cases.slice(0, 4);

  return (
    <AppShell activeItem="Dashboard">
      <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Dentarith Clinical Copilot
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Good morning
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Clinical Intelligence for Dentistry.
          </p>
        </div>
        <Link
          href="/cases/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          <Icon name="plus" size={17} />
          New Clinical Case
        </Link>
      </header>

      <section aria-label="Case overview" className="grid gap-4 sm:grid-cols-3 mt-6">
        <StatCard
          label="Total Cases"
          value={String(totalCases)}
          icon="folder"
          detail={totalCases === 1 ? "1 stored case" : `${totalCases} stored cases`}
        />
        <StatCard
          label="Cases Analyzed"
          value={String(analyzedCasesCount)}
          icon="spark"
          detail="Clinical reasoning ready"
        />
        <StatCard
          label="Reports Available"
          value={String(analyzedCasesCount)}
          icon="report"
          detail="Print / PDF ready"
        />
      </section>

      <section className="mt-9" aria-labelledby="recent-cases-heading">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="recent-cases-heading" className="text-lg font-semibold text-slate-950">
              Recent Cases
            </h2>
            <p className="mt-1 text-sm text-slate-500">Your latest clinical work appears here.</p>
          </div>
          {totalCases > 0 && (
            <Link href="/cases" className="text-xs font-semibold text-teal-700 hover:underline">
              View all cases →
            </Link>
          )}
        </div>

        {recentCases.length === 0 ? (
          <div className="mt-5 flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <Icon name="folder" size={25} />
            </div>
            <h3 className="mt-5 text-base font-semibold text-slate-950">No clinical cases yet</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Create your first case to begin. Keep your findings structured and ready for clinical review.
            </p>
            <Link
              href="/cases/new"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-teal-400 hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            >
              <Icon name="plus" size={16} />
              New Clinical Case
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {recentCases.map((item) => {
              const tooth =
                item.caseData.toothAssessment?.toothNumber ||
                item.caseData.clinicalExamination.toothOrRegion ||
                "Unspecified";
              const leadingDiag =
                item.analysis?.possibleDiagnoses?.find((d) => d.rank === 1) ||
                item.analysis?.possibleDiagnoses?.[0];

              return (
                <Link
                  key={item.id}
                  href={`/cases/${encodeURIComponent(item.id)}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition hover:border-teal-500 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-950 group-hover:text-teal-700">
                      {item.id}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Patient: {item.caseData.caseInformation.age}y {item.caseData.caseInformation.sex} • Tooth {tooth}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-medium text-slate-800">
                      {leadingDiag ? leadingDiag.diagnosis : "Draft — not analyzed"}
                    </span>
                    <span className="text-xs font-semibold text-teal-700 group-hover:translate-x-0.5 transition">
                      Open →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
