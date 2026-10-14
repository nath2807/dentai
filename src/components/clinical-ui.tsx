"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { formatToothWithSystem } from "@/lib/tooth-numbering";
import { getCloudSyncClient, type SyncClientState } from "@/lib/cloud-sync-client";

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
  | "close"
  | "cloud"
  | "sync";

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
    cloud: (
      <>
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </>
    ),
    sync: (
      <>
        <path d="M21.5 2v6h-6M21.34 15.57a9 9 0 1 1-.57-8.38l5.67-5.67" />
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

export function CloudSyncBadge() {
  const [syncState, setSyncState] = useState<SyncClientState | null>(null);

  useEffect(() => {
    const client = getCloudSyncClient();
    const unsubscribe = client.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  if (!syncState) return null;

  if (syncState.isAuthenticated && syncState.currentUser) {
    const statusLabel =
      syncState.status === "syncing"
        ? "Syncing..."
        : syncState.status === "conflict"
        ? "Conflict"
        : syncState.status === "error"
        ? "Sync Error"
        : "Cloud Synced";

    const statusDotColor =
      syncState.status === "syncing"
        ? "bg-blue-500 animate-pulse"
        : syncState.status === "conflict"
        ? "bg-amber-500"
        : syncState.status === "error"
        ? "bg-red-500"
        : "bg-emerald-500";

    return (
      <Link
        href="/settings"
        className="glass-chip block rounded-lg border border-teal-200/90 bg-teal-50/70 p-2.5 backdrop-blur-md transition hover:bg-teal-100/80 shadow-xs"
        title="Manage cloud storage and account settings"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-800 text-[10px] font-bold text-white uppercase shadow-xs">
              {syncState.currentUser.name.slice(0, 2)}
            </span>
            <div className="min-w-0 truncate">
              <p className="truncate text-xs font-semibold text-slate-900 leading-tight">
                {syncState.currentUser.name}
              </p>
              <p className="truncate text-[10px] text-teal-800 leading-tight">
                {syncState.currentUser.organization || syncState.currentUser.role}
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-600 pl-1">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor}`} />
            <span>{statusLabel}</span>
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/settings"
      className="glass-chip flex items-center justify-between rounded-lg border border-slate-200/80 bg-white/70 p-2 backdrop-blur-md transition hover:bg-white/90 text-xs shadow-xs"
      title="Configure cloud storage or sign in"
    >
      <div className="flex items-center gap-1.5 text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-[11px] font-medium">Local Browser Storage</span>
      </div>
      <span className="text-[10px] font-semibold text-teal-700 underline">Sign in</span>
    </Link>
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
    <div className="min-h-screen text-slate-900 bg-transparent">
      {/* Desktop Sidebar */}
      <aside className="glass-panel fixed inset-y-0 left-0 z-30 hidden w-64 flex-col lg:flex !rounded-none !border-y-0 !border-l-0 border-r border-slate-200/80 shadow-[4px_0_24px_rgba(15,23,42,0.03)]">
        <div className="flex h-20 items-center border-b border-slate-100/80 px-6">
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
                    className={`glass-chip flex h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition ${
                      isActive
                        ? "bg-teal-50/90 text-teal-900 border border-teal-300/80 shadow-xs ring-1 ring-teal-500/20"
                        : "text-slate-600 hover:bg-white/80 hover:text-slate-950 border border-transparent"
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

          <div className="pt-2 border-t border-slate-100/80 px-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-teal-800 transition"
            >
              <span>←</span>
              <span>Back to Public Site</span>
            </Link>
          </div>
        </nav>

        {/* Cloud Sync & Identity Badge */}
        <div className="px-4 pb-2">
          <CloudSyncBadge />
        </div>

        {/* Workspace Governance & Safety Card */}
        <div className="m-4 rounded-xl glass-card-subtle p-3.5 border border-slate-200/80 text-xs">
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
        <header className="glass-pill sticky top-0 z-20 flex h-16 items-center justify-between !rounded-none !border-x-0 !border-t-0 border-b border-slate-200/80 px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white transition"
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
            className="glass-button glass-shine flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white shadow-xs hover:bg-teal-800"
          >
            <Icon name="plus" size={14} />
            <span>New Case</span>
          </Link>
        </header>

        {/* Mobile Slide-Over Drawer Navigation */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="glass-modal-backdrop fixed inset-0"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />
            <div className="glass-modal-content glass-panel fixed inset-y-0 left-0 w-72 p-5 shadow-2xl flex flex-col justify-between !rounded-none !border-y-0 !border-l-0">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100/80 pb-4">
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
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/80 transition"
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
                      className={`glass-chip flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                        activeItem === item.label
                          ? "bg-teal-50/90 text-teal-900 border border-teal-300 shadow-xs"
                          : "text-slate-600 hover:bg-white/80 border border-transparent"
                      }`}
                    >
                      <Icon name={item.icon} size={18} />
                      {item.label}
                    </Link>
                  ))}
                  <div className="pt-4 border-t border-slate-100/80">
                    <Link
                      href="/"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-white/80 transition"
                    >
                      <span>←</span>
                      <span>Public Website</span>
                    </Link>
                  </div>
                </nav>
              </div>

              <div className="space-y-3">
                <CloudSyncBadge />

                <div className="rounded-xl glass-card-subtle p-3 border border-slate-200/80 text-xs">
                  <span className="font-bold text-teal-800 text-[11px] uppercase">
                    Assistive Decision Support
                  </span>
                  <p className="mt-1 text-[11px] text-slate-500 leading-4">
                    Preserves clinician oversight. Local browser storage only.
                  </p>
                </div>
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
    <div className="glass-card p-5 transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          {label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50/80 text-teal-800 border border-slate-100">
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
    high: "bg-teal-50/90 text-teal-950 border-teal-300 font-bold ring-1 ring-teal-500/20 shadow-xs",
    moderate: "bg-amber-50/90 text-amber-950 border-amber-300 font-semibold ring-1 ring-amber-500/20 shadow-xs",
    low: "bg-slate-100/90 text-slate-800 border-slate-300 font-medium shadow-xs",
  };
  const key = likelihood.toLowerCase();
  const cls = styles[key] || "bg-slate-100/90 text-slate-800 border-slate-300";

  return (
    <span
      className={`glass-pill inline-flex items-center backdrop-blur-md px-3 py-0.5 text-[11px] capitalize tracking-wide ${cls}`}
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
    <span className="glass-chip inline-flex items-center rounded-lg bg-slate-100/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 border border-slate-200/90 backdrop-blur-md shadow-xs">
      {labels[category] || category}
    </span>
  );
}

export function ToothPill({ toothNumber }: { toothNumber?: string }) {
  if (!toothNumber) return null;
  const formatted = formatToothWithSystem(toothNumber);

  return (
    <span
      className="glass-pill inline-flex items-center gap-1.5 bg-teal-50/90 px-3 py-1 text-xs font-bold text-teal-950 border border-teal-200/90 shadow-xs ring-1 ring-teal-500/15"
      title={formatted}
    >
      <Icon name="tooth" size={13} className="text-teal-700" />
      <span>Tooth #{toothNumber}</span>
    </span>
  );
}

export function CaseStatusPill({
  status,
  analysisStatus,
  reviewStatus,
}: {
  status?: string;
  analysisStatus?: "current" | "stale";
  reviewStatus?: "pending" | "needs_review" | "reviewed";
}) {
  if (reviewStatus === "reviewed" || status === "reviewed") {
    return (
      <span className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-950 bg-emerald-50/90 border border-emerald-300 shadow-xs ring-1 ring-emerald-500/20">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>Reviewed &amp; Verified</span>
      </span>
    );
  }

  if (analysisStatus === "stale") {
    return (
      <span className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-950 bg-amber-50/90 border border-amber-300 shadow-xs ring-1 ring-amber-500/20">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span>Stale Analysis</span>
      </span>
    );
  }

  if (status === "analyzed" || reviewStatus === "needs_review") {
    return (
      <span className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-teal-950 bg-teal-50/90 border border-teal-300 shadow-xs ring-1 ring-teal-500/20">
        <span className="h-2 w-2 rounded-full bg-teal-500" />
        <span>Current Analysis</span>
      </span>
    );
  }

  return (
    <span className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100/90 border border-slate-300/80 shadow-xs">
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      <span>Draft</span>
    </span>
  );
}

export function LiquidGlassSkeleton({
  title = "Analyzing Clinical Findings...",
  subtitle = "Dentarith reasoning pipeline is structuring diagnostic hypotheses and evidence mapping",
  elapsedSeconds,
}: {
  title?: string;
  subtitle?: string;
  elapsedSeconds?: number;
}) {
  const steps = [
    { label: "1. Anatomy & Quadrant Concordance", desc: "Validating tooth numbering (UNS/FDI) & arch orientation" },
    { label: "2. Sensibility & Periodontal Evaluation", desc: "Synthesizing thermal, periapical, and probing depth markers" },
    { label: "3. Differential Ranking & Likelihood", desc: "Calculating primary vs secondary diagnostic hypotheses" },
    { label: "4. Contradiction & Evidence Synthesis", desc: "Detecting clinical conflicts & prioritizing missing information" },
  ];

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-md ring-2 ring-teal-500/30 animate-pulse">
            <Icon name="spark" size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
              <span>{title}</span>
              <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-ping" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {typeof elapsedSeconds === "number" && (
          <span className="glass-pill px-3 py-1 text-xs font-semibold text-slate-600 self-start sm:self-center">
            {elapsedSeconds}s elapsed (28s budget)
          </span>
        )}
      </div>

      {/* Multi-stage progressive steps */}
      <div className="grid gap-3 sm:grid-cols-2">
        {steps.map((st, i) => (
          <div key={i} className="glass-card-subtle p-3.5 rounded-xl border border-slate-200/80 flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100/90 text-teal-800 text-[11px] font-bold border border-teal-200 shadow-xs">
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 leading-tight">{st.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{st.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Glass shimmer bars */}
      <div className="space-y-3 pt-2">
        <div className="liquid-shimmer h-3.5 rounded-full w-full" />
        <div className="liquid-shimmer h-3.5 rounded-full w-5/6" />
        <div className="liquid-shimmer h-3.5 rounded-full w-3/4" />
      </div>
    </div>
  );
}

