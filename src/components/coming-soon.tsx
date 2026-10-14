import Link from "next/link";
import { AppShell, Icon } from "@/components/clinical-ui";

export default function ComingSoon({ activeItem, title, description }: { activeItem: string; title: string; description: string }) {
  return (
    <AppShell activeItem={activeItem}>
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Dentarith / {activeItem}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-base leading-7 text-slate-500">{description}</p>
        <div className="glass-card mt-8 flex min-h-64 flex-col items-center justify-center border border-dashed border-teal-300/60 px-6 py-12 text-center shadow-xs">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50/90 text-teal-700 border border-teal-100 shadow-xs"><Icon name="spark" size={22} /></span>
          <h2 className="mt-4 text-base font-semibold text-slate-950">This workspace is coming next</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">The MVP keeps this area intentionally lightweight while the clinical case workflow is being validated.</p>
          <Link href="/cases" className="glass-button glass-shine mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 shadow-xs"><Icon name="folder" size={15} />Back to Cases</Link>
        </div>
      </div>
    </AppShell>
  );
}
