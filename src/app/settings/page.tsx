"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell, Icon, StatCard } from "@/components/clinical-ui";
import {
  clearCases,
  exportCases,
  getStorageStats,
  getUnassignedCases,
  importCasesSafely,
  seedBenchmarkCases,
  type StorageStats,
} from "@/lib/case-storage";
import { getCloudSyncClient, type SyncClientState } from "@/lib/cloud-sync-client";
import type { MigrationStrategy, AuditEvent } from "@/lib/cloud-types";

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

  // Sprint 4 Cloud & Sync State
  const [syncState, setSyncState] = useState<SyncClientState>({
    sessionReady: false,
    status: "local_only",
    lastSyncedAt: null,
    pendingChanges: 0,
    errorMessage: null,
    isAuthenticated: false,
    currentUser: null,
    conflictCases: [],
  });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("dr.chen@dentarith.clinic");
  const [loginPassword, setLoginPassword] = useState("ClinicalPassword123!");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLicense, setRegLicense] = useState("");
  const [regOrg, setRegOrg] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Migration Wizard State
  const [migrationConsent, setMigrationConsent] = useState(false);
  const [migrationStrategy, setMigrationStrategy] = useState<MigrationStrategy>("skip_existing");
  const [migrationSource, setMigrationSource] = useState<"workspace" | "unassigned">("workspace");
  const migrationCaseCount = migrationSource === "unassigned" ? getUnassignedCases().length : stats.caseCount;
  const [isMigrating, setIsMigrating] = useState(false);

  // Audit Log State
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  function refreshStats() {
    setStats(getStorageStats());
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshStats();
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

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setIsSubmittingAuth(true);
    setErrorMessage("");
    setFeedbackMessage("");

    const client = getCloudSyncClient();
    const res = await client.login({
      email: loginEmail,
      password: loginPassword,
    });

    setIsSubmittingAuth(false);
    if (res.success && res.user) {
      setFeedbackMessage(`Welcome back, ${res.user.name}. Cloud workspace connected.`);
    } else {
      setErrorMessage(res.error || "Authentication failed.");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingAuth(true);
    setErrorMessage("");
    setFeedbackMessage("");

    const client = getCloudSyncClient();
    const res = await client.register({
      name: regName,
      email: regEmail,
      password: regPassword,
      licenseNumber: regLicense || undefined,
      organization: regOrg || undefined,
    });

    setIsSubmittingAuth(false);
    if (res.success && res.user) {
      setFeedbackMessage(`Account created! Welcome to Dentarith, ${res.user.name}.`);
    } else {
      setErrorMessage(res.error || "Registration failed.");
    }
  }

  async function handleLogout() {
    const client = getCloudSyncClient();
    try {
      await client.logout();
      setFeedbackMessage("You have been signed out. Switched to local browser mode.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Server sign-out failed.");
    }
    setAuditEvents([]);
  }

  async function handleTriggerSync() {
    setFeedbackMessage("");
    setErrorMessage("");
    const client = getCloudSyncClient();
    const res = await client.sync();
    if (res && client.getState().status === "synced") {
      setFeedbackMessage(
        `Cloud sync complete. Processed ${res.results.length} cases; pulled ${res.pulledCases.length} updates.`
      );
      refreshStats();
    } else {
      setErrorMessage(client.getState().errorMessage || "Some changes remain pending.");
      refreshStats();
    }
  }

  async function handleMigrateToCloud() {
    if (!migrationConsent) {
      setErrorMessage("Please confirm clinician consent before initiating migration.");
      return;
    }

    setIsMigrating(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const client = getCloudSyncClient();
      const result = await client.migrateLocalCases(migrationStrategy, true, migrationSource);
      setFeedbackMessage(
        `Migration successful: ${result.importedCount} cases uploaded, ${result.skippedCount} skipped, ${result.failedCount} failed.`
      );
      refreshStats();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Migration failed.");
    } finally {
      setIsMigrating(false);
    }
  }

  async function handleLoadAuditEvents() {
    setIsLoadingAudit(true);
    try {
      const res = await fetch("/api/cloud/audit");
      if (res.ok) {
        const data = await res.json();
        setAuditEvents(data.events || []);
        setShowAuditModal(true);
      } else {
        setErrorMessage("Could not load clinical audit events. Please ensure you are logged in.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Network error fetching audit log.");
    } finally {
      setIsLoadingAudit(false);
    }
  }

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
              Workspace, Accounts &amp; Cloud Architecture
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Configure clinician authentication, persistent cloud synchronization, safe consent-driven migrations, and audit trails.
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

        {/* CLOUD IDENTITY & AUTHENTICATION SECTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-200">
                <Icon name="shield" size={20} />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Clinician Authentication &amp; Multi-Tenant Cloud Identity
                </h2>
                <p className="text-xs text-slate-500">
                  Server-validated sessions with salted PBKDF2 password hashing and HttpOnly SameSite=Strict cookies.
                </p>
              </div>
            </div>

            {syncState.isAuthenticated && syncState.currentUser && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadAuditEvents}
                  disabled={isLoadingAudit}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Icon name="report" size={13} />
                  {isLoadingAudit ? "Loading..." : "View Audit Log"}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <div className="mt-5">
            {syncState.isAuthenticated && syncState.currentUser ? (
              <div className="grid gap-4 sm:grid-cols-3 rounded-xl bg-teal-50/50 p-4 border border-teal-200/80">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Clinician Profile
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {syncState.currentUser.name}
                  </p>
                  <p className="text-xs text-slate-600">{syncState.currentUser.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    License &amp; Organization
                  </p>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5">
                    {syncState.currentUser.licenseNumber || "Standard License"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {syncState.currentUser.organization || "Private Practice"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Tenant Isolation
                  </p>
                  <p className="text-xs font-mono font-medium text-slate-700 mt-0.5">
                    ID: {syncState.currentUser.id}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 mt-1">
                    ✓ Role: {syncState.currentUser.role}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className={`pb-1 text-xs font-bold transition ${
                      authMode === "login"
                        ? "border-b-2 border-teal-700 text-teal-900"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Sign In to Cloud
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode("register")}
                    className={`pb-1 text-xs font-bold transition ${
                      authMode === "register"
                        ? "border-b-2 border-teal-700 text-teal-900"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Register New Account
                  </button>
                </div>

                {authMode === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Clinician Email
                        </label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                          placeholder="doctor@clinic.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail("dr.chen@dentarith.clinic");
                          setLoginPassword("ClinicalPassword123!");
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
                      >
                        ⚡ Autofill Demo Clinician (Dr. Sarah Chen, DDS)
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmittingAuth}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                      >
                        {isSubmittingAuth ? "Verifying..." : "Sign In"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Full Name (with credentials)
                        </label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                          placeholder="Dr. Jane Smith, DDS"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Work Email
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                          placeholder="doctor@clinic.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Password (min 8 chars, 1 uppercase, 1 number)
                        </label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                          placeholder="SecurePass123!"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Dental License # (Optional)
                        </label>
                        <input
                          type="text"
                          value={regLicense}
                          onChange={(e) => setRegLicense(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                          placeholder="DDS-CA-12345"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Clinic / Practice Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={regOrg}
                          onChange={(e) => setRegOrg(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-600 focus:outline-none"
                          placeholder="City Dental Associates"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingAuth}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                      >
                        {isSubmittingAuth ? "Creating Account..." : "Register Clinician Account"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CLOUD SYNCHRONIZATION & CONSENT-DRIVEN MIGRATION WIZARD */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Cloud Synchronization Status */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Icon name="cloud" size={16} />
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Multi-Device Synchronization
                  </h2>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    syncState.status === "synced"
                      ? "bg-emerald-100 text-emerald-800"
                      : syncState.status === "syncing"
                      ? "bg-blue-100 text-blue-800"
                      : syncState.status === "conflict"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      syncState.status === "synced"
                        ? "bg-emerald-500"
                        : syncState.status === "syncing"
                        ? "bg-blue-500 animate-pulse"
                        : syncState.status === "conflict"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    }`}
                  />
                  {syncState.status === "synced"
                    ? "Cloud Synced"
                    : syncState.status === "syncing"
                    ? "Syncing in Progress"
                    : syncState.status === "conflict"
                    ? "Revision Conflict"
                    : "Local Storage Mode"}
                </span>
              </div>

              <p className="text-xs leading-5 text-slate-500">
                Pushes local case additions or clinician review sign-offs to your secure account and pulls updates made across operatory tablets or clinic computers.
              </p>

              <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1 border border-slate-100">
                <div className="flex justify-between">
                  <span>Last server sync:</span>
                  <span className="font-semibold text-slate-800">
                    {syncState.lastSyncedAt
                      ? new Date(syncState.lastSyncedAt).toLocaleString()
                      : "Never synced"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Source of truth:</span>
                  <span className="font-semibold text-slate-800">
                    {syncState.isAuthenticated ? "Multi-Tenant Cloud DB" : "Local Browser"}
                  </span>
                </div>
              </div>

              {syncState.conflictCases.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                  <p className="font-bold">⚠️ Concurrency Conflict Detected</p>
                  <p className="mt-1 text-[11px]">
                    {syncState.conflictCases.length} case(s) need review. Your local edits and the server copies are both retained; neither is silently overwritten.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {syncState.isAuthenticated ? "Account active" : "Sign in required"}
              </span>
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={!syncState.isAuthenticated || syncState.status === "syncing"}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="sync" size={14} />
                {syncState.status === "syncing" ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>

          {/* Local-to-Cloud Migration Wizard */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Icon name="upload" size={16} />
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Safe Local-to-Cloud Migration Wizard
                </h2>
              </div>

              <p className="text-xs leading-5 text-slate-500">
                Import cases into this account only with your authority and consent. Unassigned cases remain separate until you choose to import them. A recovery download is initiated before transmission; keep that file safely.
              </p>

              <div>
                <label htmlFor="migration-source" className="mb-1 block text-xs font-semibold text-slate-600">Import source</label>
                <select id="migration-source" value={migrationSource}
                  onChange={(e) => { setMigrationSource(e.target.value as "workspace" | "unassigned"); setMigrationConsent(false); }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800">
                  <option value="workspace">Current account workspace</option>
                  <option value="unassigned">Preserved unassigned browser cases</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Duplicate Resolution Strategy
                </label>
                <select
                  value={migrationStrategy}
                  onChange={(e) => setMigrationStrategy(e.target.value as MigrationStrategy)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-teal-600 focus:outline-none"
                >
                  <option value="skip_existing">Skip Existing Cases (Preserve cloud records)</option>
                  <option value="overwrite_existing">Overwrite Existing Cases (Update cloud records)</option>
                  <option value="clone_as_new">Clone as New Distinct Cases (Keep both)</option>
                </select>
              </div>

              <label className="flex items-start gap-2 pt-1 text-[11px] text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={migrationConsent}
                  onChange={(e) => setMigrationConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  <strong>Explicit Clinician Consent:</strong> I verify that I have authority to persist these de-identified cases to secure cloud storage and have reviewed data governance policies.
                </span>
              </label>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {migrationCaseCount} {migrationCaseCount === 1 ? "case" : "cases"} in selected source
              </span>
              <button
                type="button"
                onClick={handleMigrateToCloud}
                disabled={
                  !syncState.isAuthenticated ||
                  !migrationConsent ||
                  migrationCaseCount === 0 ||
                  isMigrating
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-700 px-4 text-xs font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="arrow" size={14} />
                {isMigrating ? "Migrating..." : "Migrate to Cloud"}
              </button>
            </div>
          </div>
        </div>

        {/* Storage Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Cases"
            value={String(stats.caseCount)}
            detail="Stored in workspace"
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

        {/* Existing Data Management Cards Grid */}
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
                <span className="font-bold">⚠️ Backup Scope Notice:</span> To prevent browser quota exhaustion, raw radiograph pixel image binaries (base64) are deliberately excluded. Case metadata, clinical text, and review traces are saved.
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {stats.caseCount} {stats.caseCount === 1 ? "case" : "cases"} ready
              </span>
              <button
                type="button"
                onClick={handleExportAll}
                disabled={stats.caseCount === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="download" size={14} />
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
                Restore a previously exported Dentarith JSON backup file. Uploaded records are strictly validated against the clinical schema.
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
                Load synthetic educational benchmark cases (Symptomatic Irreversible Pulpitis, Reversible Pulpitis, and Pulpal Necrosis) to evaluate reasoning, differential mapping, clinician review traces, and periodontal charts.
              </p>
              <p className="text-[11px] font-medium text-amber-800">
                Notice: These cases are simulated educational examples, not real patient records.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                3 Reference Archetypes
              </span>
              <button
                type="button"
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
                  <Icon name="trash" size={16} />
                </span>
                <h2 className="text-sm font-bold text-red-950">
                  Reset Local Workspace
                </h2>
              </div>
              <p className="text-xs leading-5 text-red-900/80">
                Purge all locally stored case intake data, AI differential analyses, and clinician decision traces from this browser session.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-red-200/60 flex items-center justify-between">
              <span className="text-[11px] text-red-700 font-medium">
                Irreversible Action
              </span>
              <button
                type="button"
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

        {/* Clinical Audit Log Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white p-6 shadow-2xl flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Icon name="shield" size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      Immutable Append-Only Clinical Audit Trail
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tenant-isolated activity events logged for compliance and clinical traceability.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {auditEvents.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-500">
                    No cloud audit events recorded yet for this session.
                  </p>
                ) : (
                  auditEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                          Action: {evt.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{evt.details || "No extra details"}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                        {evt.caseId && <span>Case: {evt.caseId}</span>}
                        {evt.version && <span>v{evt.version}</span>}
                        <span>User: {evt.userId}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Close Audit Trail
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
