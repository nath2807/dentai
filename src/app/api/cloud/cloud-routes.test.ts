import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "../auth/register/route";
import { POST as loginHandler } from "../auth/login/route";
import { GET as meHandler } from "../auth/me/route";
import { POST as logoutHandler } from "../auth/logout/route";
import { GET as listCasesHandler, POST as createCaseHandler } from "./cases/route";
import {
  GET as getCaseHandler,
  PUT as updateCaseHandler,
  DELETE as deleteCaseHandler,
} from "./cases/[id]/route";
import { POST as syncHandler } from "./sync/route";
import { POST as migrateHandler } from "./migrate/route";
import { GET as auditHandler } from "./audit/route";
import { userStore } from "../../../lib/auth-service";
import { cloudRepository } from "../../../lib/cloud-repository";
import { BENCHMARK_CASE_PULPITIS } from "../../../lib/benchmark-cases";
import type { StoredCase } from "../../../lib/case-storage";

function createSyntheticCase(id: string): StoredCase {
  return {
    ...BENCHMARK_CASE_PULPITIS,
    id,
    caseData: {
      ...BENCHMARK_CASE_PULPITIS.caseData,
      caseInformation: {
        ...BENCHMARK_CASE_PULPITIS.caseData.caseInformation,
        caseId: `SYNTH-API-${id}`,
      },
      chiefComplaint: "Api route validation test case",
    },
    status: "draft",
    analysisStatus: "current",
    reviewStatus: "pending",
    analysis: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("Sprint 4 Cloud API Endpoints & Security Enforcement", () => {
  beforeEach(() => {
    userStore.clear();
    cloudRepository.clear();
  });

  describe("Authentication Flow (/api/auth/*)", () => {
    it("registers new clinician and returns session cookie", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.newton@dentarith.clinic",
          password: "SecurePass123!",
          name: "Dr. Isaac Newton, DDS",
          licenseNumber: "DDS-UK-001",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe("dr.newton@dentarith.clinic");

      const cookieHeader = res.headers.get("Set-Cookie");
      expect(cookieHeader).toContain("dentarith_session=");
      expect(cookieHeader).toContain("HttpOnly");
      expect(cookieHeader).toContain("SameSite=Strict");
    });

    it("authenticates seeded clinician and returns session cookie", async () => {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.chen@dentarith.clinic",
          password: "ClinicalPassword123!",
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.name).toContain("Dr. Sarah Chen");
    });

    it("verifies active session via /api/auth/me", async () => {
      // 1. Login to get cookie
      const loginReq = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.chen@dentarith.clinic",
          password: "ClinicalPassword123!",
        }),
      });
      const loginRes = await loginHandler(loginReq);
      const cookie = loginRes.headers.get("Set-Cookie")?.split(";")[0] || "";

      // 2. Query /api/auth/me
      const meReq = new Request("http://localhost:3000/api/auth/me", {
        headers: { cookie },
      });
      const meRes = await meHandler(meReq);
      const meData = await meRes.json();
      expect(meData.authenticated).toBe(true);
      expect(meData.user.email).toBe("dr.chen@dentarith.clinic");
    });

    it("clears session cookie on logout", async () => {
      const res = await logoutHandler();
      expect(res.status).toBe(200);
      const cookieHeader = res.headers.get("Set-Cookie");
      expect(cookieHeader).toContain("Max-Age=0");
    });
  });

  describe("Tenant Isolation on /api/cloud/cases", () => {
    it("rejects unauthenticated requests with HTTP 401", async () => {
      const req = new Request("http://localhost:3000/api/cloud/cases");
      const res = await listCasesHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("enforces cross-user isolation: User A cannot read or modify User B's case by URL ID", async () => {
      // 1. Create User A and User B
      const regAReq = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "usera@dentarith.clinic",
          password: "SecureUserA123!",
          name: "Dr. User A",
        }),
      });
      const resA = await registerHandler(regAReq);
      const cookieA = resA.headers.get("Set-Cookie")?.split(";")[0] || "";

      const regBReq = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "userb@dentarith.clinic",
          password: "SecureUserB123!",
          name: "Dr. User B",
        }),
      });
      const resB = await registerHandler(regBReq);
      const cookieB = resB.headers.get("Set-Cookie")?.split(";")[0] || "";

      // 2. User A creates a case
      const createReq = new Request("http://localhost:3000/api/cloud/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieA,
        },
        body: JSON.stringify(createSyntheticCase("case-tenant-a1")),
      });
      const createRes = await createCaseHandler(createReq);
      expect(createRes.status).toBe(201);
      const createdCase = (await createRes.json()).case;

      // 3. User B tries to read User A's case -> MUST return 404 NOT_FOUND (no leakage)
      const readReq = new Request(`http://localhost:3000/api/cloud/cases/${createdCase.id}`, {
        headers: { cookie: cookieB },
      });
      const readRes = await getCaseHandler(readReq, {
        params: Promise.resolve({ id: createdCase.id }),
      });
      expect(readRes.status).toBe(404);

      // 4. User B tries to edit User A's case -> MUST return 404 NOT_FOUND
      const updateReq = new Request(`http://localhost:3000/api/cloud/cases/${createdCase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie: cookieB,
        },
        body: JSON.stringify({ status: "reviewed" }),
      });
      const updateRes = await updateCaseHandler(updateReq, {
        params: Promise.resolve({ id: createdCase.id }),
      });
      expect(updateRes.status).toBe(404);

      // 5. User B tries to delete User A's case -> MUST return 404 NOT_FOUND
      const deleteReq = new Request(`http://localhost:3000/api/cloud/cases/${createdCase.id}`, {
        method: "DELETE",
        headers: { cookie: cookieB },
      });
      const deleteRes = await deleteCaseHandler(deleteReq, {
        params: Promise.resolve({ id: createdCase.id }),
      });
      expect(deleteRes.status).toBe(404);
    });

    it("returns HTTP 409 CONCURRENCY_CONFLICT on stale optimistic version updates", async () => {
      // Login as demo user
      const loginReq = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.chen@dentarith.clinic",
          password: "ClinicalPassword123!",
        }),
      });
      const loginRes = await loginHandler(loginReq);
      const cookie = loginRes.headers.get("Set-Cookie")?.split(";")[0] || "";

      // Create case (starts at version 1)
      const createReq = new Request("http://localhost:3000/api/cloud/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify(createSyntheticCase("case-conflict-test")),
      });
      const createRes = await createCaseHandler(createReq);
      const caseId = (await createRes.json()).case.id;

      // Update 1 (moves to version 2)
      const update1Req = new Request(`http://localhost:3000/api/cloud/cases/${caseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({ status: "analyzed", version: 1 }),
      });
      const update1Res = await updateCaseHandler(update1Req, {
        params: Promise.resolve({ id: caseId }),
      });
      expect(update1Res.status).toBe(200);

      // Update 2 with stale version 1 -> MUST return HTTP 409
      const update2Req = new Request(`http://localhost:3000/api/cloud/cases/${caseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({ status: "reviewed", version: 1 }),
      });
      const update2Res = await updateCaseHandler(update2Req, {
        params: Promise.resolve({ id: caseId }),
      });
      expect(update2Res.status).toBe(409);
      const conflictData = await update2Res.json();
      expect(conflictData.error.code).toBe("CONCURRENCY_CONFLICT");
      expect(conflictData.error.serverVersion).toBe(2);
      expect(conflictData.error.clientVersion).toBe(1);
    });
  });

  describe("Batch Sync & Migration Endpoints (/api/cloud/sync & /api/cloud/migrate)", () => {
    it("handles batch sync requests for authenticated users", async () => {
      const loginReq = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.chen@dentarith.clinic",
          password: "ClinicalPassword123!",
        }),
      });
      const loginRes = await loginHandler(loginReq);
      const cookie = loginRes.headers.get("Set-Cookie")?.split(";")[0] || "";

      const syncReq = new Request("http://localhost:3000/api/cloud/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          pushes: [createSyntheticCase("case-batch-sync-1")],
        }),
      });

      const syncRes = await syncHandler(syncReq);
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.success).toBe(true);
      expect(syncData.results[0].status).toBe("created");
    });

    it("verifies explicit clinician consent requirement on /api/cloud/migrate", async () => {
      const loginReq = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.chen@dentarith.clinic",
          password: "ClinicalPassword123!",
        }),
      });
      const loginRes = await loginHandler(loginReq);
      const cookie = loginRes.headers.get("Set-Cookie")?.split(";")[0] || "";

      // Attempt migration without consent
      const noConsentReq = new Request("http://localhost:3000/api/cloud/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          cases: [createSyntheticCase("case-consent-1")],
          strategy: "skip_existing",
          userConsentGiven: false,
        }),
      });

      const resNoConsent = await migrateHandler(noConsentReq);
      expect(resNoConsent.status).toBe(400);

      // Attempt migration WITH explicit consent
      const consentReq = new Request("http://localhost:3000/api/cloud/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          cases: [createSyntheticCase("case-consent-1")],
          strategy: "skip_existing",
          userConsentGiven: true,
        }),
      });

      const resConsent = await migrateHandler(consentReq);
      expect(resConsent.status).toBe(200);
      const resultData = await resConsent.json();
      expect(resultData.importedCount).toBe(1);
    });

    it("lists audit events for the authenticated user via /api/cloud/audit", async () => {
      const loginReq = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.chen@dentarith.clinic",
          password: "ClinicalPassword123!",
        }),
      });
      const loginRes = await loginHandler(loginReq);
      const cookie = loginRes.headers.get("Set-Cookie")?.split(";")[0] || "";

      const auditReq = new Request("http://localhost:3000/api/cloud/audit", {
        headers: { cookie },
      });
      const auditRes = await auditHandler(auditReq);
      expect(auditRes.status).toBe(200);
      const auditData = await auditRes.json();
      expect(auditData.success).toBe(true);
      expect(Array.isArray(auditData.events)).toBe(true);
    });

    it("prevents user enumeration: duplicate registration does not leak whether account exists", async () => {
      // First registration
      const req1 = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.unique@dentarith.clinic",
          password: "SecurePass123!",
          name: "Dr. Unique Clinician",
        }),
      });
      const res1 = await registerHandler(req1);
      expect(res1.status).toBe(201);

      // Attempt duplicate registration
      const req2 = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.unique@dentarith.clinic",
          password: "AnotherPassword123!",
          name: "Duplicate Attempt",
        }),
      });
      const res2 = await registerHandler(req2);
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      // Verifies error message is generic and does NOT say "already exists"
      expect(data2.error.message).not.toContain("already exists");
      expect(data2.error.message).toContain("Registration could not be completed");
    });

    it("correctly pulls cases using server syncedAt cursor even when client updatedAt is older", async () => {
      const loginReq = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dr.chen@dentarith.clinic",
          password: "ClinicalPassword123!",
        }),
      });
      const loginRes = await loginHandler(loginReq);
      const cookie = loginRes.headers.get("Set-Cookie")?.split(";")[0] || "";

      // Push case with an old client updatedAt (offline edit from 3 days ago)
      const oldUpdatedAt = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      const offlineCase = {
        ...createSyntheticCase("case-offline-timestamp"),
        updatedAt: oldUpdatedAt,
      };

      const syncReq = new Request("http://localhost:3000/api/cloud/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          pushes: [offlineCase],
          // Client queries for changes since 1 hour ago
          since: new Date(Date.now() - 3600 * 1000).toISOString(),
        }),
      });

      const syncRes = await syncHandler(syncReq);
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.success).toBe(true);
      // Even though client updatedAt was 3 days ago, server synced it now, so it is in pulledCases
      expect(syncData.pulledCases.some((c: { id: string }) => c.id === "case-offline-timestamp")).toBe(true);
    });
  });
});
