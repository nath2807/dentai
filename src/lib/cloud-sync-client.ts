import { userProfileSchema, type UserProfile, type LoginRequest, type RegisterRequest } from "./auth-types";
import { migrationResponseSchema, syncBatchResponseSchema, type CloudCaseRecord, type CloudSyncStatus,
  type MigrationResult, type MigrationStrategy, type SyncBatchResponse, type SyncPushItem } from "./cloud-types";
import { acknowledgeDeletedCase, applySyncedCase, exportCaseRecords, getCases, getUnassignedCases,
  getWorkspaceRecords, retainSyncConflict } from "./case-storage";
import { assertWorkspaceCurrent, getWorkspaceUserId, setWorkspaceUserId, subscribeWorkspace, workspaceStorageKey } from "./browser-workspace";

export interface SyncClientState {
  sessionReady: boolean;
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  pendingChanges: number;
  errorMessage: string | null;
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  conflictCases: { localId: string; serverCase: CloudCaseRecord }[];
}

const initialState = (): SyncClientState => ({
  sessionReady: false, status: "local_only", lastSyncedAt: null, pendingChanges: 0,
  errorMessage: null, isAuthenticated: false, currentUser: null, conflictCases: [],
});

export class CloudSyncClient {
  private state = initialState();
  private listeners = new Set<(state: SyncClientState) => void>();
  private generation = 0;
  private isSyncing = false;

  constructor(options: { autoCheckSession?: boolean } = {}) {
    subscribeWorkspace(() => this.notify());
    if (typeof window !== "undefined" && options.autoCheckSession !== false) void this.checkSession();
  }

  public getState(): SyncClientState {
    if (!this.state.currentUser || getWorkspaceUserId() !== this.state.currentUser.id) return { ...this.state };
    try {
      const records = getWorkspaceRecords(this.state.currentUser.id);
      const conflictCases = records.filter((c) => c.sync?.conflict).map((c) => ({ localId: c.id, serverCase: c.sync!.conflict! }));
      const pendingChanges = records.filter((c) => c.sync?.dirty !== false).length;
      return { ...this.state, pendingChanges, conflictCases,
        lastSyncedAt: window.localStorage.getItem(workspaceStorageKey("last-sync")),
        status: this.state.status === "syncing" || this.state.status === "error" ? this.state.status
          : conflictCases.length ? "conflict" : pendingChanges ? "local_only" : this.state.status,
      };
    } catch {
      return { ...this.state, status: "error", errorMessage: "Browser storage is unavailable. Changes have not been synchronized." };
    }
  }

  public subscribe(listener: (state: SyncClientState) => void): () => void {
    this.listeners.add(listener); listener(this.getState());
    return () => this.listeners.delete(listener);
  }
  private notify() {
    for (const listener of this.listeners) {
      try { listener(this.getState()); } catch { /* Observers do not control synchronization. */ }
    }
  }
  private updateState(updates: Partial<SyncClientState>) { this.state = { ...this.state, ...updates }; this.notify(); }

  private beginSessionChange(): number {
    this.generation++;
    this.state = initialState();
    // Keep the previous scope while pages are hidden for verification. Background
    // work can only finish in that same scope, never in the next account's cache.
    this.notify();
    return this.generation;
  }
  private activate(user: UserProfile | null) {
    this.state = { ...initialState(), sessionReady: true, currentUser: user, isAuthenticated: Boolean(user) };
    setWorkspaceUserId(user?.id ?? null);
    this.notify();
  }
  private assertCurrent(userId: string, generation: number) {
    if (this.generation !== generation || this.state.currentUser?.id !== userId || !this.state.isAuthenticated)
      throw new Error("The clinician session changed. Retry synchronization in the current account.");
    assertWorkspaceCurrent(userId);
  }

  public async checkSession(): Promise<{ authenticated: boolean; user: UserProfile | null }> {
    const previousUserId = getWorkspaceUserId();
    const generation = this.beginSessionChange();
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (generation !== this.generation) return { authenticated: false, user: null };
      const user = res.ok && data.authenticated ? userProfileSchema.parse(data.user) : null;
      this.activate(user);
      return { authenticated: Boolean(user), user };
    } catch {
      if (generation === this.generation) {
        if (previousUserId === null) this.activate(null);
        else this.updateState({ errorMessage: "Session verification is unavailable. Account data stays hidden; retry to reopen it." });
      }
      return { authenticated: false, user: null };
    }
  }

  private async authenticate(path: string, req: LoginRequest | RegisterRequest): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const generation = this.beginSessionChange();
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
      const data = await res.json();
      if (generation !== this.generation) throw new Error("A newer session action has replaced this request.");
      if (!res.ok || !data.success) throw new Error("Authentication could not be completed. Please check your details and try again.");
      const user = userProfileSchema.parse(data.user);
      this.activate(user);
      return { success: true, user };
    } catch {
      const message = "Authentication could not be completed. Please check your details and try again.";
      if (generation === this.generation) { this.activate(null); this.updateState({ errorMessage: message }); }
      return { success: false, error: message };
    }
  }
  public login(req: LoginRequest) { return this.authenticate("/api/auth/login", req); }
  public register(req: RegisterRequest) { return this.authenticate("/api/auth/register", req); }

  public async logout(): Promise<void> {
    const generation = this.beginSessionChange();
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed.");
    } catch {
      if (generation === this.generation) {
        this.activate(null);
        this.updateState({ errorMessage: "Account data is hidden, but server sign-out failed. Please retry sign-out." });
      }
      throw new Error("Server sign-out failed. Please retry.");
    }
    if (generation === this.generation) this.activate(null);
  }

  private async requestSync(userId: string, generation: number, pushes: SyncPushItem[]): Promise<SyncBatchResponse> {
    this.assertCurrent(userId, generation);
    const res = await fetch("/api/cloud/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      // Full pulls intentionally avoid timestamp cursor gaps during concurrent commits.
      body: JSON.stringify({ expectedUserId: userId, pushes }), signal: AbortSignal.timeout(30000),
    });
    this.assertCurrent(userId, generation);
    if (!res.ok) throw new Error(`Cloud synchronization failed (HTTP ${res.status}). Pending changes are retained.`);
    const parsed = syncBatchResponseSchema.safeParse(await res.json());
    this.assertCurrent(userId, generation);
    if (!parsed.success) throw new Error("Invalid cloud synchronization response. Pending changes are retained.");
    const data = parsed.data;
    if (data.userId !== userId || [...data.pulledCases, ...data.results.flatMap((r) => r.serverCase ? [r.serverCase] : [])].some((c) => c.userId !== userId))
      throw new Error("Unexpected cloud record owner. No response data was applied.");
    return data;
  }

  public async sync(): Promise<SyncBatchResponse | null> {
    const userId = this.state.currentUser?.id;
    if (!userId || !this.state.isAuthenticated || this.isSyncing) return null;
    const generation = this.generation;
    this.isSyncing = true;
    this.updateState({ status: "syncing", errorMessage: null });
    try {
      const pending = getWorkspaceRecords(userId).filter((c) => c.sync?.dirty !== false);
      const chunks = pending.length ? Array.from({ length: Math.ceil(pending.length / 100) }, (_, i) => pending.slice(i * 100, (i + 1) * 100)) : [[]];
      const aggregate: SyncBatchResponse = { userId, results: [], pulledCases: [], serverTime: "" };
      const pulled = new Map<string, CloudCaseRecord>();
      let failed = false;
      for (const snapshots of chunks) {
        const pushes = snapshots.map((c): SyncPushItem => ({
          id: c.id, caseData: c.caseData, formValues: c.formValues, analysis: c.analysis,
          status: c.status, analysisStatus: c.analysisStatus, reviewStatus: c.reviewStatus, review: c.review,
          createdAt: c.createdAt, updatedAt: c.updatedAt, version: c.sync?.serverVersion ?? 0, deleted: Boolean(c.deletedAt),
        }));
        const data = await this.requestSync(userId, generation, pushes);
        if (data.results.length !== snapshots.length || new Set(data.results.map((r) => r.caseId)).size !== snapshots.length ||
          data.results.some((r) => !snapshots.some((c) => c.id === r.caseId))) throw new Error("Incomplete synchronization acknowledgement. Pending changes are retained.");
        for (const result of data.results) {
          const snapshot = snapshots.find((c) => c.id === result.caseId)!;
          if (!["created", "updated", "up_to_date"].includes(result.status)) continue;
          if ((!snapshot.deletedAt && (!result.serverCase || result.serverCase.deletedAt ||
            (result.serverVersion !== undefined && result.serverVersion !== result.serverCase.version))) ||
            (snapshot.deletedAt && (result.status === "created" || (result.status === "updated" &&
              (result.serverVersion === undefined || result.serverVersion <= (snapshot.sync?.serverVersion ?? 0))))))
            throw new Error("Invalid synchronization acknowledgement. Pending changes are retained.");
        }
        for (const result of data.results) {
          const snapshot = snapshots.find((c) => c.id === result.caseId)!;
          if (result.status === "error" || result.status === "conflict") {
            failed = true;
            if (result.serverCase) retainSyncConflict(userId, result.serverCase);
          } else if (snapshot.deletedAt) {
            acknowledgeDeletedCase(userId, snapshot.id, snapshot.sync!.revision, result.serverVersion ?? snapshot.sync?.serverVersion ?? 0);
          } else if (result.serverCase) {
            applySyncedCase(userId, result.serverCase, snapshot.sync?.revision, snapshot.id);
          } else throw new Error("Missing synchronized case data. Pending changes are retained.");
        }
        for (const record of data.pulledCases) { applySyncedCase(userId, record); pulled.set(record.id, record); }
        aggregate.results.push(...data.results);
        aggregate.serverTime = data.serverTime;
      }
      this.assertCurrent(userId, generation);
      aggregate.pulledCases = [...pulled.values()];
      const current = this.getState();
      if (!failed && current.pendingChanges === 0 && current.conflictCases.length === 0) {
        window.localStorage.setItem(workspaceStorageKey("last-sync", userId), aggregate.serverTime);
        this.updateState({ status: "synced" });
      } else this.updateState({ status: current.conflictCases.length ? "conflict" : "error",
        errorMessage: "Some changes remain pending. Local edits and server conflict copies have been retained." });
      return aggregate;
    } catch (err) {
      if (generation === this.generation) this.updateState({ status: "error", errorMessage: err instanceof Error ? err.message : "Synchronization failed. Pending changes are retained." });
      return null;
    } finally { this.isSyncing = false; }
  }

  public async migrateLocalCases(strategy: MigrationStrategy = "skip_existing", consent = false, source: "workspace" | "unassigned" = "workspace"): Promise<MigrationResult> {
    const userId = this.state.currentUser?.id;
    if (!userId || !this.state.isAuthenticated) throw new Error("Sign in before importing cases.");
    if (!consent) throw new Error("Explicit clinician consent is required before importing cases.");
    if (this.isSyncing) throw new Error("Wait for the current synchronization to finish.");
    const generation = this.generation;
    const records = source === "unassigned" ? getUnassignedCases() : getCases();
    const result: MigrationResult = { totalSubmitted: records.length, importedCount: 0, skippedCount: 0,
      failedCount: 0, failures: [], importedCaseIds: [], completedAt: new Date().toISOString() };
    if (!records.length) return result;
    // Failure to create the recovery download aborts transmission.
    if (typeof document === "undefined") throw new Error("A browser recovery download is required before importing cases.");
    const url = URL.createObjectURL(new Blob([exportCaseRecords(records)], { type: "application/json" }));
    try {
      const anchor = document.createElement("a"); anchor.href = url;
      anchor.download = `dentarith-pre-import-${Date.now()}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } finally { URL.revokeObjectURL(url); }
    this.assertCurrent(userId, generation);
    this.isSyncing = true;
    this.updateState({ status: "syncing", errorMessage: null });
    try {
      for (let i = 0; i < records.length; i += 100) {
        this.assertCurrent(userId, generation);
        const res = await fetch("/api/cloud/migrate", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedUserId: userId, cases: records.slice(i, i + 100), strategy, userConsentGiven: true }) });
        this.assertCurrent(userId, generation);
        if (!res.ok) throw new Error(`Case import failed (HTTP ${res.status}). Source records are retained.`);
        const parsed = migrationResponseSchema.safeParse(await res.json());
        this.assertCurrent(userId, generation);
        if (!parsed.success || parsed.data.userId !== userId) throw new Error("Invalid case import response. Source records are retained.");
        const part = parsed.data;
        result.importedCount += part.importedCount; result.skippedCount += part.skippedCount;
        result.failedCount += part.failedCount; result.failures.push(...part.failures);
        result.importedCaseIds.push(...part.importedCaseIds); result.completedAt = part.completedAt;
      }
      const data = await this.requestSync(userId, generation, []);
      for (const serverCase of data.pulledCases) {
        const snapshot = source === "workspace" && result.importedCaseIds.includes(serverCase.id) ? records.find((c) => c.id === serverCase.id) : undefined;
        applySyncedCase(userId, serverCase, snapshot?.sync?.revision);
      }
      this.updateState({ status: result.failedCount ? "error" : "local_only", errorMessage: result.failedCount ? "Some imports failed. Source records are retained." : null });
      return result;
    } catch (err) {
      if (generation === this.generation) this.updateState({ status: "error", errorMessage: "Case import did not complete. Source records and any successful server imports are retained." });
      throw err;
    } finally { this.isSyncing = false; }
  }
}

let syncClientInstance: CloudSyncClient | null = null;
export function getCloudSyncClient(): CloudSyncClient {
  if (!syncClientInstance) syncClientInstance = new CloudSyncClient();
  return syncClientInstance;
}
