import Link from "next/link";
import type { ReactNode } from "react";

type IconName = "dashboard" | "folder" | "plus" | "report" | "settings" | "spark" | "arrow";

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" /><path d="M3 10h18" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    report: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h6M9 8h2" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V19a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 11H2a2 2 0 0 1 0-4h.2a2 2 0 0 0 1.4-3.4l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1A2 2 0 0 0 9.8 2H10a2 2 0 0 1 4 0h.2a2 2 0 0 0 3.4-1.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1A2 2 0 0 0 21.8 7h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.4 3.4Z" /></>,
    spark: <><path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2z" /><path d="m5 17-.5 2.5L2 20l2.5.5L5 23l.5-2.5L8 20l-2.5-.5z" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const navItems = [
  { label: "Clinical Cases", href: "/cases", icon: "folder" as IconName },
  { label: "New Case", href: "/cases/new", icon: "plus" as IconName },
  { label: "Reports", href: "/reports", icon: "report" as IconName },
  { label: "Settings", href: "/settings", icon: "settings" as IconName },
];

export function AppShell({ children, activeItem }: { children: ReactNode; activeItem: string }) {
  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center border-b border-slate-100 px-7">
          <Link href="/" className="flex items-center gap-3" aria-label="Dentarith home">
            <Logo />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-950 leading-none">Dentarith</span>
              <span className="text-[10px] font-medium tracking-wide text-teal-700 leading-tight mt-0.5">Clinical Copilot</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-4 py-7" aria-label="Primary navigation">
          <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Clinical Workspace</p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${activeItem === item.label ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 px-3">
            <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-teal-700 transition">
              <span>←</span>
              <span>Back to Public Site</span>
            </Link>
          </div>
        </nav>
        <div className="m-4 rounded-xl bg-slate-50 p-4 border border-slate-200/60">
          <div className="flex items-center gap-2 text-teal-700"><Icon name="spark" size={16} /><span className="text-xs font-bold uppercase tracking-wide">Clinical Copilot</span></div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Clinical Intelligence for Dentistry. Non-autonomous decision support with local browser persistence.</p>
        </div>
      </aside>
      <div className="lg:pl-64">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={29} />
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-950 leading-none">Dentarith</span>
              <span className="text-[9px] font-medium text-teal-700 leading-tight">Clinical Copilot</span>
            </div>
          </Link>
          <Link href="/cases/new" className="flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-semibold text-white"><Icon name="plus" size={15} /> New case</Link>
        </div>
        <main className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 lg:px-12 lg:py-11">{children}</main>
      </div>
    </div>
  );
}

function Logo({ size = 32 }: { size?: number }) {
  return <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm"><svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7.5 4.5c1.5-1.2 2.8-.8 4.5 0 1.7-.8 3-.9 4.5 0 2.4 1.5 2.2 4.4 1.5 6.8-.7 2.5-1.4 5.7-3.1 6.2-1.8.6-1.8-3-2.9-3s-1.1 3.6-2.9 3C7.4 17 6.7 13.8 6 11.3 5.3 8.9 5.1 6 7.5 4.5Z" /><path d="M12 4.5V14" /></svg></div>;
}

export function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: IconName }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-teal-700"><Icon name={icon} size={17} /></span></div><div className="mt-5 flex items-end justify-between"><p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p><p className="text-xs text-slate-400">{detail}</p></div></div>;
}
