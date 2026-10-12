import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  userStore,
  ServerUserStore,
  authenticateUser,
  getSessionFromRequest,
  buildSessionCookie,
  buildLogoutCookie,
  getAuthSecret,
} from "./auth-service";
import type { AuthSession } from "./auth-types";

describe("Sprint 4 Auth Engine (Cryptographic Security & Identity)", () => {
  beforeEach(() => {
    userStore.clear();
  });

  describe("Password Hashing & Constant-Time Verification", () => {
    it("generates distinct salts and matching hashes for identical passwords", () => {
      const p1 = hashPassword("SecureClinicalPass123!");
      const p2 = hashPassword("SecureClinicalPass123!");

      expect(p1.salt).not.toBe(p2.salt);
      expect(p1.hash).not.toBe(p2.hash);

      expect(verifyPassword("SecureClinicalPass123!", p1.hash, p1.salt)).toBe(true);
      expect(verifyPassword("SecureClinicalPass123!", p2.hash, p2.salt)).toBe(true);
      expect(verifyPassword("WrongPassword!", p1.hash, p1.salt)).toBe(false);
    });

    it("fails cleanly on malformed or manipulated hash lengths", () => {
      const p = hashPassword("Test12345");
      expect(verifyPassword("Test12345", p.hash.slice(0, 10), p.salt)).toBe(false);
      expect(verifyPassword("Test12345", "not-a-hex-hash", p.salt)).toBe(false);
    });
  });

  describe("HMAC-SHA256 Session Signing & Tamper Proofing", () => {
    const baseSession: AuthSession = {
      userId: "usr_clinical_demo_01",
      email: "dr.chen@dentarith.clinic",
      name: "Dr. Sarah Chen, DDS",
      role: "clinician",
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    it("signs and verifies valid session token", () => {
      const token = signSessionToken(baseSession);
      const verified = verifySessionToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe("usr_clinical_demo_01");
      expect(verified?.email).toBe("dr.chen@dentarith.clinic");
      expect(verified?.role).toBe("clinician");
    });

    it("rejects token tampered in payload or role escalation", () => {
      const token = signSessionToken(baseSession);
      const [payloadB64, sig] = token.split(".");

      // Attacker attempts to escalate role to admin
      const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
      decoded.role = "admin";
      const tamperedB64 = Buffer.from(JSON.stringify(decoded), "utf-8").toString("base64url");
      const tamperedToken = `${tamperedB64}.${sig}`;

      expect(verifySessionToken(tamperedToken)).toBeNull();
    });

    it("rejects token with corrupted signature", () => {
      const token = signSessionToken(baseSession);
      const [payloadB64, sig] = token.split(".");
      const badSig = sig.slice(0, -2) + (sig.endsWith("a") ? "b" : "a");
      expect(verifySessionToken(`${payloadB64}.${badSig}`)).toBeNull();
    });

    it("rejects expired session tokens", () => {
      const expiredSession: AuthSession = {
        ...baseSession,
        expiresAt: Math.floor(Date.now() / 1000) - 100, // in the past
      };
      const token = signSessionToken(expiredSession);
      expect(verifySessionToken(token)).toBeNull();
    });
  });

  describe("User Account Management & Authentication Flow", () => {
    it("successfully authenticates default seeded demo clinician", async () => {
      const { user, token } = await authenticateUser({
        email: "dr.chen@dentarith.clinic",
        password: "ClinicalPassword123!",
      });

      expect(user.email).toBe("dr.chen@dentarith.clinic");
      expect(user.role).toBe("clinician");
      expect((user as Record<string, unknown>).passwordHash).toBeUndefined();
      expect((user as Record<string, unknown>).passwordSalt).toBeUndefined();
      expect(token).toBeTruthy();

      const session = verifySessionToken(token);
      expect(session?.userId).toBe(user.id);
    });

    it("rejects login with incorrect password without revealing account existence", async () => {
      await expect(
        authenticateUser({
          email: "dr.chen@dentarith.clinic",
          password: "IncorrectPassword123!",
        })
      ).rejects.toThrow("Invalid email or password.");
    });

    it("creates a new clinician account and enforces unique emails without exposing password hashes", async () => {
      const newClinician = await userStore.create({
        email: "dr.marcus@dentarith.clinic",
        password: "SecurePass2026!",
        name: "Dr. Marcus Vance, DMD",
        licenseNumber: "DMD-WA-45812",
        organization: "Pacific Northwest Dental Institute",
      });

      expect(newClinician.id).toMatch(/^usr_/);
      expect(newClinician.email).toBe("dr.marcus@dentarith.clinic");
      expect((newClinician as Record<string, unknown>).passwordHash).toBeUndefined();
      expect((newClinician as Record<string, unknown>).passwordSalt).toBeUndefined();

      // Verify second attempt throws duplicate error
      await expect(
        userStore.create({
          email: "dr.marcus@dentarith.clinic",
          password: "AnotherPassword123!",
          name: "Duplicate Clinician",
        })
      ).rejects.toThrow("already exists");
    });
  });

  describe("Request Extraction & Cookie Construction", () => {
    it("extracts session from Cookie header", async () => {
      const token = signSessionToken({
        userId: "usr_test_1",
        email: "test@dentarith.clinic",
        name: "Test Doctor",
        role: "clinician",
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      });

      const req = new Request("http://localhost:3000/api/cloud/cases", {
        headers: {
          cookie: `some_unrelated=1; dentarith_session=${token}; other=2`,
        },
      });

      const session = await getSessionFromRequest(req);
      expect(session).not.toBeNull();
      expect(session?.userId).toBe("usr_test_1");
    });

    it("extracts session from Authorization Bearer header", async () => {
      const token = signSessionToken({
        userId: "usr_bearer_1",
        email: "bearer@dentarith.clinic",
        name: "Bearer Doc",
        role: "clinician",
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      });

      const req = new Request("http://localhost:3000/api/cloud/cases", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const session = await getSessionFromRequest(req);
      expect(session?.userId).toBe("usr_bearer_1");
    });

    it("builds security-hardened HttpOnly SameSite=Strict cookies", () => {
      const cookie = buildSessionCookie("sample-token", 3600);
      expect(cookie).toContain("dentarith_session=sample-token");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Strict");
      expect(cookie).toContain("Path=/");

      const logoutCookie = buildLogoutCookie();
      expect(logoutCookie).toContain("Max-Age=0");
    });
  });

  describe("Sprint 4.1 Production Security Hardening & Safe Startup Guardrails", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    const setEnv = (key: string, val: string | undefined) => {
      (process.env as Record<string, string | undefined>)[key] = val;
    };

    it("fails safely when AUTH_SECRET is missing in production environment", () => {
      setEnv("NODE_ENV", "production");
      delete process.env.AUTH_SECRET;
      delete process.env.NEXTAUTH_SECRET;

      expect(() => getAuthSecret()).toThrow("Production configuration error: AUTH_SECRET must be set");
    });

    it("fails safely when AUTH_SECRET is shorter than 32 characters in production", () => {
      setEnv("NODE_ENV", "production");
      process.env.AUTH_SECRET = "short-insecure-secret";

      expect(() => getAuthSecret()).toThrow("must be at least 32 characters long");
    });

    it("accepts strong secrets (>= 32 characters) in production environment", () => {
      setEnv("NODE_ENV", "production");
      const strongKey = "a_super_strong_cryptographic_key_with_at_least_32_characters_123456";
      process.env.AUTH_SECRET = strongKey;

      expect(getAuthSecret()).toBe(strongKey);
    });

    it("prevents demo account seeding in production unless explicitly enabled", async () => {
      setEnv("NODE_ENV", "production");
      delete process.env.ENABLE_DEMO_ACCOUNTS;

      const testStore = new ServerUserStore();
      const demoUser = await testStore.findByEmail("dr.chen@dentarith.clinic");
      expect(demoUser).toBeNull();
    });

    it("allows demo account seeding in production only when ENABLE_DEMO_ACCOUNTS=true", async () => {
      setEnv("NODE_ENV", "production");
      process.env.ENABLE_DEMO_ACCOUNTS = "true";

      const testStore = new ServerUserStore();
      const demoUser = await testStore.findByEmail("dr.chen@dentarith.clinic");
      expect(demoUser).not.toBeNull();
      expect(demoUser?.email).toBe("dr.chen@dentarith.clinic");
    });

    it("fails closed when userStore is accessed in production without DATABASE_URL", () => {
      setEnv("NODE_ENV", "production");
      delete process.env.DATABASE_URL;

      expect(() => userStore.findByEmail("any@dentarith.clinic")).toThrow(
        "CRITICAL SECURITY CONFIGURATION ERROR"
      );
    });

    it("appends Secure attribute to logout cookie in production", () => {
      setEnv("NODE_ENV", "production");
      const logoutCookie = buildLogoutCookie();
      expect(logoutCookie).toContain("; Secure");
    });
  });
});
