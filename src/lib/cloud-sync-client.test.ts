import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudSyncClient } from "./cloud-sync-client";
import { CloudRepository, ConcurrencyError } from "./cloud-repository";
import { BENCHMARK_CASE_PULPITIS } from "./benchmark-cases";
import { deleteCase, getCases, getUnassignedCases, getWorkspaceRecords, LEGACY_CASES_STORAGE_KEY, saveCase, type StoredCase } from "./case-storage";
import { getWorkspaceUserId, workspaceStorageKey } from "./browser-workspace";
import { syncBatchRequestSchema, type CloudCaseRecord } from "./cloud-types";
import type { UserProfile } from "./auth-types";

class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string) { return this.items.get(key) ?? null; }
  setItem(key: string, value: string) { this.items.set(key, value); }
  removeItem(key: string) { this.items.delete(key); }
}
const profile = (id: string): UserProfile => ({ id, email: `${id}@example.test`, name: `Synthetic ${id}`, role: "clinician",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });
function caseInput(id: string): StoredCase {
  return { ...BENCHMARK_CASE_PULPITIS, id, analysis: null, review: null, status: "draft", reviewStatus: "pending", analysisStatus: "current",
    caseData: { ...BENCHMARK_CASE_PULPITIS.caseData, chiefComplaint: "Synthetic local finding" } };
}

describe("account-scoped cloud synchronization", () => {
  let client: CloudSyncClient;
  let repo: CloudRepository;
  let storage: MemoryStorage;
  let signedIn = "a";
  let afterServerWrite: (() => void | Promise<void>) | undefined;
  let transformResponse: ((data: unknown) => unknown) | undefined;
  const requests: { expectedUserId?: string; pushes: { id: string; version?: number; deleted?: boolean }[]; since?: string }[] = [];
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    repo = new CloudRepository();
    signedIn = "a"; afterServerWrite = undefined; transformResponse = undefined; requests.length = 0;
    fetchMock.mockReset().mockImplementation(async (input, options) => {
      if (String(input).includes("/api/auth/login")) {
        signedIn = JSON.parse(String(options?.body)).email.split("@")[0];
        return Response.json({ success: true, user: profile(signedIn) });
      }
      if (String(input).includes("/api/auth/logout")) return Response.json({ success: true });
      if (String(input).includes("/api/auth/me")) return Response.json({ authenticated: true, user: profile(signedIn) });
      if (String(input).includes("/api/cloud/sync")) {
        const body = syncBatchRequestSchema.parse(JSON.parse(String(options?.body)));
        requests.push(body);
        if (body.expectedUserId !== signedIn) return Response.json({ success: false }, { status: 409 });
        const data = { success: true, ...await repo.syncBatch(signedIn, body) };
        const hook = afterServerWrite; afterServerWrite = undefined;
        await hook?.();
        return Response.json(transformResponse ? transformResponse(data) : data);
      }
      throw new Error("Unexpected synthetic request");
    });
    vi.stubGlobal("fetch", fetchMock);
    client = new CloudSyncClient({ autoCheckSession: false });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  const login = (id: string) => client.login({ email: `${id}@example.test`, password: "Synthetic123!" });

  it("preserves legacy/local cases without assigning or uploading them on login", async () => {
    const legacy = JSON.stringify([caseInput("legacy")]);
    storage.setItem(LEGACY_CASES_STORAGE_KEY, legacy);
    saveCase(caseInput("local"));
    await login("a");
    expect(getCases()).toEqual([]);
    await client.sync();
    expect(requests[0].pushes).toEqual([]);
    expect(getUnassignedCases().map((c) => c.id)).toEqual(["legacy", "local"]);
    expect(storage.getItem(LEGACY_CASES_STORAGE_KEY)).toBe(legacy);
  });

  it("isolates accounts, drafts, and successful-sync timestamps across login/logout", async () => {
    await login("a"); saveCase(caseInput("a-case"));
    storage.setItem(workspaceStorageKey("draft"), "synthetic A draft");
    await client.sync();
    const aTime = client.getState().lastSyncedAt;
    await client.logout(); expect(getCases()).toEqual([]);
    await login("b"); expect(getCases()).toEqual([]); expect(client.getState().lastSyncedAt).toBeNull();
    expect(storage.getItem(workspaceStorageKey("draft"))).toBeNull();
    await client.sync(); expect(requests.at(-1)?.pushes).toEqual([]);
    await login("a"); expect(getCases()[0].id).toBe("a-case");
    expect(client.getState().lastSyncedAt).toBe(aTime);
    expect(storage.getItem(workspaceStorageKey("draft"))).toBe("synthetic A draft");
  });

  it("sends the acknowledged version on edits and sends no unchanged cases", async () => {
    await login("a"); saveCase(caseInput("case")); await client.sync();
    expect(getCases()[0].sync).toMatchObject({ serverVersion: 1, dirty: false });
    saveCase({ ...getCases()[0], caseData: { ...getCases()[0].caseData, chiefComplaint: "Synthetic edited finding" } });
    await client.sync(); expect(requests[1].pushes[0].version).toBe(1);
    expect((await repo.getCase("a", "case"))?.caseData.chiefComplaint).toBe("Synthetic edited finding");
    await client.sync(); expect(requests[2].pushes).toEqual([]);
    expect((await repo.getCase("a", "case"))?.version).toBe(2);
    expect(client.getState().status).toBe("synced");
  });

  it("retains divergent local and remote edits, including after a session reload", async () => {
    await login("a"); saveCase(caseInput("case")); await client.sync();
    const remote = (await repo.getCase("a", "case"))!;
    await repo.updateCase("a", "case", { caseData: { ...remote.caseData, chiefComplaint: "Synthetic remote edit" } }, 1);
    saveCase({ ...getCases()[0], caseData: { ...getCases()[0].caseData, chiefComplaint: "Synthetic local edit" } });
    await client.sync();
    expect(getCases()[0].caseData.chiefComplaint).toBe("Synthetic local edit");
    expect(client.getState()).toMatchObject({ status: "conflict", pendingChanges: 1 });
    expect(client.getState().conflictCases[0].serverCase.caseData.chiefComplaint).toBe("Synthetic remote edit");
    const reloaded = new CloudSyncClient({ autoCheckSession: false }); await reloaded.checkSession();
    expect(reloaded.getState().conflictCases).toHaveLength(1);
  });

  it("keeps an edit made during an in-flight acknowledgement pending", async () => {
    await login("a"); saveCase(caseInput("case"));
    afterServerWrite = () => { saveCase({ ...getCases()[0], caseData: { ...getCases()[0].caseData, chiefComplaint: "Typed while syncing" } }); };
    await client.sync();
    expect(getCases()[0]).toMatchObject({ caseData: { chiefComplaint: "Typed while syncing" }, sync: { serverVersion: 1, dirty: true } });
    await client.sync(); expect((await repo.getCase("a", "case"))?.caseData.chiefComplaint).toBe("Typed while syncing");
    expect(client.getState().pendingChanges).toBe(0);
  });

  it("keeps a deletion made during a create request and sends it next", async () => {
    await login("a"); saveCase(caseInput("case")); afterServerWrite = () => { deleteCase("case"); };
    await client.sync(); expect(getCases()).toEqual([]); expect(client.getState().pendingChanges).toBe(1);
    await client.sync(); expect(requests[1].pushes[0]).toMatchObject({ deleted: true, version: 1 });
    expect(await repo.getCase("a", "case")).toBeNull(); expect(client.getState().pendingChanges).toBe(0);
  });

  it("applies remote deletion only to a clean local copy", async () => {
    await login("a"); saveCase(caseInput("case")); await client.sync();
    await repo.deleteCase("a", "case", undefined, 1); await client.sync();
    expect(getCases()).toEqual([]); expect(getWorkspaceRecords()[0].sync?.dirty).toBe(false);
    await client.sync(); expect(requests.at(-1)?.pushes).toEqual([]);
  });

  it("does not let a stale deletion remove a newer remote edit", async () => {
    await login("a"); saveCase(caseInput("case")); await client.sync();
    const remote = (await repo.getCase("a", "case"))!;
    await repo.updateCase("a", "case", { caseData: { ...remote.caseData, chiefComplaint: "Remote finding after local sync" } }, 1);
    deleteCase("case"); await client.sync();
    expect(await repo.getCase("a", "case")).not.toBeNull();
    expect(getWorkspaceRecords()[0].sync?.conflict?.version).toBe(2);
    await expect(repo.deleteCase("a", "case", undefined, 1)).rejects.toThrow(ConcurrencyError);
  });

  it("acknowledges successful items while leaving failed items and the cursor pending", async () => {
    await login("a"); saveCase(caseInput("failed")); saveCase(caseInput("successful"));
    const original = repo.createCase.bind(repo);
    const failure = vi.spyOn(repo, "createCase").mockImplementation(async (userId, record, email) => {
      if (record.id === "failed") throw new Error("Synthetic transient failure");
      return original(userId, record, email);
    });
    await client.sync(); expect(client.getState()).toMatchObject({ pendingChanges: 1, lastSyncedAt: null, status: "error" });
    expect(getCases().find((c) => c.id === "successful")?.sync?.dirty).toBe(false);
    failure.mockRestore(); await client.sync();
    expect(requests[1].pushes.map((c) => c.id)).toEqual(["failed"]);
    expect(client.getState()).toMatchObject({ pendingChanges: 0, status: "synced" });
  });

  it("chunks more than 100 pending cases without exceeding the server limit", async () => {
    await login("a"); for (let i = 0; i < 101; i++) saveCase(caseInput(`case-${i}`));
    await client.sync(); expect(requests.map((r) => r.pushes.length)).toEqual([100, 1]);
    expect(client.getState()).toMatchObject({ pendingChanges: 0, status: "synced" });
  });

  it("ignores a response after switching accounts during the request", async () => {
    await login("a"); saveCase(caseInput("a-case")); afterServerWrite = async () => { await login("b"); };
    expect(await client.sync()).toBeNull();
    expect(getWorkspaceUserId()).toBe("b"); expect(getCases()).toEqual([]);
    expect(getWorkspaceRecords("a")[0].sync?.dirty).toBe(true);
    expect(storage.getItem(workspaceStorageKey("last-sync", "a"))).toBeNull();
  });

  it("rejects an unexpected record owner before applying any response data", async () => {
    await login("a"); saveCase(caseInput("case"));
    transformResponse = (raw) => {
      const data = raw as { pulledCases: CloudCaseRecord[] };
      data.pulledCases[0].userId = "b"; return raw;
    };
    expect(await client.sync()).toBeNull(); expect(getCases()[0].sync?.serverVersion).toBe(0);
    expect(client.getState().pendingChanges).toBe(1);
  });

  it("rejects incomplete acknowledgements and malformed response bodies", async () => {
    await login("a"); saveCase(caseInput("case"));
    transformResponse = () => ({ success: true, userId: "a", results: [], pulledCases: [], serverTime: new Date().toISOString() });
    expect(await client.sync()).toBeNull(); expect(getCases()[0].sync?.dirty).toBe(true);
    transformResponse = () => ({ success: true });
    expect(await client.sync()).toBeNull(); expect(getCases()[0].sync?.dirty).toBe(true);
  });

  it("does not use the successful-sync timestamp as a lossy delta cursor", async () => {
    await login("a"); await client.sync(); expect(client.getState().lastSyncedAt).not.toBeNull();
    await repo.createCase("a", caseInput("late-commit")); await client.sync();
    expect(requests[1].since).toBeUndefined(); expect(getCases()[0].id).toBe("late-commit");
  });

  it("requires explicit consent before reading or transmitting recovery cases", async () => {
    await login("a"); storage.setItem(LEGACY_CASES_STORAGE_KEY, JSON.stringify([caseInput("legacy")]));
    const calls = fetchMock.mock.calls.length;
    await expect(client.migrateLocalCases("skip_existing", false, "unassigned")).rejects.toThrow("Explicit clinician consent");
    expect(fetchMock).toHaveBeenCalledTimes(calls); expect(getCases()).toEqual([]);
  });
});
