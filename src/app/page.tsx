import Link from "next/link";
import { AppShell, Icon, StatCard } from "@/components/clinical-ui";

export default function Home() {
  return (
    <AppShell activeItem="Dashboard">
      <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Clinical workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Good morning
          </h1>
          <p className="mt-2 text-base text-slate-500">
            Clinical intelligence for better dental decisions.
          </p>
        </div>
        <Link
          href="/cases/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        >
          <Icon name="plus" size={17} />
          New Clinical Case
        </Link>
      </header>

      <section aria-label="Case overview" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Cases" value="0" icon="folder" detail="No open cases" />
        <StatCard label="Cases Analyzed" value="0" icon="spark" detail="Prototype ready" />
        <StatCard label="Reports" value="0" icon="report" detail="No reports yet" />
      </section>

      <section className="mt-9" aria-labelledby="recent-cases-heading">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="recent-cases-heading" className="text-lg font-semibold text-slate-950">
              Recent Cases
            </h2>
            <p className="mt-1 text-sm text-slate-500">Your latest clinical work will appear here.</p>
          </div>
        </div>

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
      </section>
    </AppShell>
  );
}
