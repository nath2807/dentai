"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { formatToothWithSystem } from "@/lib/tooth-numbering";

export type IconName =
  | "dashboard"
  | "folder"
  | "plus"
  | "report"
  | "settings"
  | "spark"
  | "arrow"
  | "tooth"
  | "chart"
  | "check"
  | "alert"
  | "filter"
  | "search"
  | "download"
  | "upload"
  | "printer"
  | "trash"
  | "edit"
  | "chevronDown"
  | "chevronRight"
  | "shield"
  | "info"
  | "copy"
  | "menu"
  | "close";

export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    folder: (
      <>
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
        <path d="M3 10h18" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    report: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h6M9 8h2" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V19a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 11H2a2 2 0 0 1 0-4h.2a2 2 0 0 0 1.4-3.4l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1A2 2 0 0 0 9.8 2H10a2 2 0 0 1 4 0h.2a2 2 0 0 0 3.4-1.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1A2 2 0 0 0 21.8 7h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.4 3.4Z" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2z" />
        <path d="m5 17-.5 2.5L2 20l2.5.5L5 23l.5-2.5L8 20l-2.5-.5z" />
      </>
    ),
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    tooth: (
      <>
        <path d="M7.5 4.5c1.5-1.2 2.8-.8 4.5 0 1.7-.8 3-.9 4.5 0 2.4 1.5 2.2 4.4 1.5 6.8-.7 2.5-1.4 5.7-3.1 6.2-1.8.6-1.8-3-2.9-3s-1.1 3.6-2.9 3C7.4 17 6.7 13.8 6 11.3 5.3 8.9 5.1 6 7.5 4.5Z" />
        <path d="M12 4.5V14" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </>
    ),
    printer: (
      <>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
    chevronDown: <polyline points="6 9 12 15 18 9" />,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    menu: (
      <>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export const navItems = [
  { label: "Clinical Cases", href: "/cases", icon: "folder" as IconName },
  { label: "New Case", href: "/cases/new", icon: "plus" as IconName },
  { label: "Benchmark Cases", href: "/cases/demo", icon: "spark" as IconName },
  { label: "Reports", href: "/reports", icon: "report" as IconName },
  { label: "Settings", href: "/settings", icon: "settings" as IconName },
];

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-teal-900 text-white shadow-sm ring-1 ring-white/20"
      aria-hidden="true"
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M7.5 4.5c1.5-1.2 2.8-.8 4.5 0 1.7-.8 3-.9 4.5 0 2.4 1.5 2.2 4.4 1.5 6.8-.7 2.5-1.4 5.7-3.1 6.2-1.8.6-1.8-3-2.9-3s-1.1 3.6-2.9 3C7.4 17 6.7 13.8 6 11.3 5.3 8.9 5.1 6 7.5 4.5Z" />
        <path d="M12 4.5V14" />
      </svg>
    </div>
  );
}

export function AppShell({
  children,
  activeItem,
}: {
  children: ReactNode;
  activeItem: string;
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/90 bg-white lg:flex shadow-[1px_0_4px_rgba(15,23,42,0.02)]">
        <div className="flex h-20 items-center border-b border-slate-100 px-6">
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none"
            aria-label="Dentarith home"
          >
            <Logo size={34} />
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-slate-950 leading-none group-hover:text-teal-800 transition">
                Dentarith
              </span>
              <span className="text-[10px] font-semibold tracking-wide text-teal-800 leading-tight mt-1">
                Clinical Copilot
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6" aria-label="Primary clinical navigation">
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Clinical Workspace
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeItem === item.label;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition ${
                      isActive
                        ? "bg-teal-50/90 text-teal-900 border border-teal-200/60 shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      size={17}
                      className={isActive ? "text-teal-700" : "text-slate-400"}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 px-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-teal-800 transition"
            >
              <span>←</span>
              <span>Back to Public Site</span>
            </Link>
          </div>
        </nav>

        {/* Workspace Governance & Safety Card */}
        <div className="m-4 rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-1.5 text-teal-800">
            <Icon name="shield" size={15} />
            <span className="text-[11px] font-bold uppercase tracking-wide">
              Clinical Governance
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
            Dentarith is non-autonomous clinical decision support. The licensed dentist verifies all findings and retains care responsibility.
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Local Browser Storage Active</span>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Open workspace menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={28} />
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-950 leading-none">
                  Dentarith
                </span>
                <span className="text-[9px] font-semibold text-teal-800 leading-tight">
                  Clinical Workspace
                </span>
              </div>
            </Link>
          </div>

          <Link
            href="/cases/new"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white shadow-xs hover:bg-teal-800"
          >
            <Icon name="plus" size={14} />
            <span>New Case</span>
          </Link>
        </header>

        {/* Mobile Slide-Over Drawer Navigation */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-white p-5 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Logo size={32} />
                    <div>
                      <p className="text-base font-bold text-slate-950 leading-none">
                        Dentarith
                      </p>
                      <p className="text-[10px] font-semibold text-teal-800 mt-0.5">
                        Clinical Copilot
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                    aria-label="Close navigation drawer"
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>

                <nav className="mt-5 space-y-1.5" aria-label="Mobile workspace navigation">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                        activeItem === item.label
                          ? "bg-teal-50 text-teal-900 border border-teal-200"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon name={item.icon} size={18} />
                      {item.label}
                    </Link>
                  ))}
                  <div className="pt-4 border-t border-slate-100">
                    <Link
                      href="/"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <span>←</span>
                      <span>Public Website</span>
                    </Link>
                  </div>
                </nav>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
                <span className="font-bold text-teal-800 text-[11px] uppercase">
                  Assistive Decision Support
                </span>
                <p className="mt-1 text-[11px] text-slate-500 leading-4">
                  Preserves clinician oversight. Local browser storage only.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition hover:border-slate-300">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-teal-800 border border-slate-100">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-3xl font-extrabold tracking-tight text-slate-950">
          {value}
        </p>
        <p className="text-xs text-slate-400 font-medium">{detail}</p>
      </div>
    </div>
  );
}

export function LikelihoodBadge({
  likelihood,
}: {
  likelihood: "high" | "moderate" | "low" | string;
}) {
  const styles: Record<string, string> = {
    high: "bg-teal-50 text-teal-900 border-teal-300 font-bold",
    moderate: "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
    low: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
  };
  const key = likelihood.toLowerCase();
  const cls = styles[key] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] capitalize tracking-wide ${cls}`}
    >
      {likelihood} likelihood
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    pulpal: "Pulpal Pathology",
    apical: "Apical / Periapical",
    periodontal: "Periodontal",
    hard_tissue: "Hard Tissue / Coronal",
    soft_tissue: "Soft Tissue / Mucosa",
    other: "Other Pathology",
  };

  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 border border-slate-200/80">
      {labels[category] || category}
    </span>
  );
}

export function ToothPill({ toothNumber }: { toothNumber?: string }) {
  if (!toothNumber) return null;
  const formatted = formatToothWithSystem(toothNumber);

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-900 border border-teal-200"
      title={formatted}
    >
      <Icon name="tooth" size={13} className="text-teal-700" />
      <span>Tooth #{toothNumber}</span>
    </span>
  );
}
