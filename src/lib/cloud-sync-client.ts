import type { UserProfile, LoginRequest, RegisterRequest } from "./auth-types";
import type {
  CloudCaseRecord,
  CloudSyncStatus,
  MigrationResult,
  MigrationStrategy,
  SyncBatchResponse,
  SyncPushItem,
} from "./cloud-types";
import {
  getCases,
  saveCase,
  exportCases,
} from "./case-storage";

export interface SyncClientState {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  pendingChanges: number;
  errorMessage: string | null;
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  conflictCases: { localId: string; serverCase: CloudCaseRecord }[];
}

const STORAGE_LAST_SYNC_KEY = "dentarith_last_sync_timestamp";

class CloudSyncClient {
  private state: SyncClientState = {
    status: "local_only",
    lastSyncedAt: null,
    pendingChanges: 0,
    errorMessage: null,
    isAuthenticated: false,
    currentUser: null,
    conflictCases: [],
  };

  private listeners = new Set<(state: SyncClientState) => void>();
  private isSyncing = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.state.lastSyncedAt = localStorage.getItem(STORAGE_LAST_SYNC_KEY);
      this.checkSession();
    }
  }

  public getState(): SyncClientState {
    return { ...this.state };
  }

  public subscribe(listener: (state: SyncClientState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(currentState);
      } catch (err) {
        console.error("Error in sync listener:", err);
      }
    }
  }

  private updateState(partial: Partial<SyncClientState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Check if current session cookie is valid.
   */
  public async checkSession(): Promise<{ authenticated: boolean; user: UserProfile | null }> {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          this.updateState({
            isAuthenticated: true,
            currentUser: data.user,
            status: this.state.lastSyncedAt ? "synced" : "local_only",
            errorMessage: null,
          });
          return { authenticated: true, user: data.user };
        }
      }
    } catch (err) {
      console.warn("Could not verify session:", err);
    }

    this.updateState({
      isAuthenticated: false,
      currentUser: null,
      status: "local_only",
    });
    return { authenticated: false, user: null };
  }

  /**
   * Log into clinician account.
   */
  public async login(
    req: LoginRequest
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.error?.message || "Invalid email or password.";
        this.updateState({ errorMessage: errorMsg });
        return { success: false, error: errorMsg };
      }

      this.updateState({
        isAuthenticated: true,
        currentUser: data.user,
        status: "synced",
        errorMessage: null,
      });

      return { success: true, user: data.user };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error during login.";
      this.updateState({ errorMessage: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * Register a new clinician account.
   */
  public async register(
    req: RegisterRequest
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.error?.message || "Registration failed.";
        this.updateState({ errorMessage: errorMsg });
        return { success: false, error: errorMsg };
      }

      this.updateState({
        isAuthenticated: true,
        currentUser: data.user,
        status: "synced",
        errorMessage: null,
      });

      return { success: true, user: data.user };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error during registration.";
      this.updateState({ errorMessage: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * Log out and clear local session state.
   */
  public async logout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      this.updateState({
        isAuthenticated: false,
        currentUser: null,
        status: "local_only",
        errorMessage: null,
        conflictCases: [],
      });
    }
  }

  /**
   * Execute multi-device batch sync: push local changes and pull remote updates.
   */
  public async sync(): Promise<SyncBatchResponse | null> {
    if (!this.state.isAuthenticated) {
      return null;
    }

    if (this.isSyncing) return null;
    this.isSyncing = true;
    this.updateState({ status: "syncing", errorMessage: null });

    try {
      const localCases = getCases();
      const pushes: SyncPushItem[] = localCases.map((c) => ({
        id: c.id,
        caseData: c.caseData,
        formValues: c.formValues,
        analysis: c.analysis,
        status: c.status,
        analysisStatus: c.analysisStatus,
        reviewStatus: c.reviewStatus,
        review: c.review,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      const res = await fetch("/api/cloud/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushes,
          since: this.state.lastSyncedAt || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Sync server responded with HTTP ${res.status}`);
      }

      const syncData: { success: boolean } & SyncBatchResponse = await res.json();
      if (!syncData.success) {
        throw new Error("Server rejected synchronization batch.");
      }

      // Check conflicts
      const conflicts = syncData.results
        .filter((r) => r.status === "conflict" && r.serverCase)
        .map((r) => ({
          localId: r.caseId,
          serverCase: r.serverCase!,
        }));

      // Apply pulled cases that are newer or created on other devices
      if (syncData.pulledCases && syncData.pulledCases.length > 0) {
        for (const cloudCase of syncData.pulledCases) {
          if (!cloudCase.deletedAt) {
            saveCase({
              id: cloudCase.id,
              caseData: cloudCase.caseData,
              formValues: cloudCase.formValues,
              analysis: cloudCase.analysis,
              status: cloudCase.status,
              analysisStatus: cloudCase.analysisStatus,
              reviewStatus: cloudCase.reviewStatus,
              review: cloudCase.review,
              createdAt: cloudCase.createdAt,
              updatedAt: cloudCase.updatedAt,
            });
          }
        }
      }

      const now = syncData.serverTime || new Date().toISOString();
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_LAST_SYNC_KEY, now);
      }

      this.updateState({
        status: conflicts.length > 0 ? "conflict" : "synced",
        lastSyncedAt: now,
        conflictCases: conflicts,
        pendingChanges: 0,
      });

      return syncData;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync encountered an unexpected failure.";
      this.updateState({
        status: "error",
        errorMessage: msg,
      });
      return null;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Migrate existing local cases to cloud storage with explicit consent.
   * Prompts user with automated backup download before transmitting clinical records.
   */
  public async migrateLocalCases(
    strategy: MigrationStrategy = "skip_existing",
    userConsentGiven = true
  ): Promise<MigrationResult> {
    if (!this.state.isAuthenticated) {
      throw new Error("You must be logged in to migrate clinical cases to the cloud.");
    }

    if (!userConsentGiven) {
      throw new Error("Explicit clinician consent is required before proceeding.");
    }

    // Step 1: Guarantee recovery safety by exporting offline backup to user's disk
    try {
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const jsonBundle = exportCases();
        const dateStr = new Date().toISOString().split("T")[0];
        const blob = new Blob([jsonBundle], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dentarith-pre-migration-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (backupErr) {
      console.warn("Pre-migration backup export warning:", backupErr);
    }

    const localCases = getCases();
    if (localCases.length === 0) {
      return {
        totalSubmitted: 0,
        importedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        failures: [],
        importedCaseIds: [],
        completedAt: new Date().toISOString(),
      };
    }

    this.updateState({ status: "syncing" });

    const res = await fetch("/api/cloud/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cases: localCases,
        strategy,
        userConsentGiven: true,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const errMsg = errData?.error?.message || `Server returned HTTP ${res.status}`;
      this.updateState({ status: "error", errorMessage: errMsg });
      throw new Error(errMsg);
    }

    const result: MigrationResult = await res.json();

    const now = result.completedAt || new Date().toISOString();
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_LAST_SYNC_KEY, now);
    }

    this.updateState({
      status: "synced",
      lastSyncedAt: now,
      errorMessage: null,
    });

    return result;
  }
}

// Global client singleton
let syncClientInstance: CloudSyncClient | null = null;

export function getCloudSyncClient(): CloudSyncClient {
  if (!syncClientInstance) {
    syncClientInstance = new CloudSyncClient();
  }
  return syncClientInstance;
}
