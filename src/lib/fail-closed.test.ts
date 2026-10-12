/**
 * Sprint 4.2 Fail-Closed Production Security & Configuration Tests.
 *
 * Verifies:
 * - Production startup/invocation fails closed when DATABASE_URL is missing.
 * - In-memory store is NEVER used as a fallback in production.
 * - Database outage errors return safe, generic HTTP 503 without revealing connection strings or credentials.
 * - Distributed rate limiter configuration validation.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCloudRepository } from "./cloud-repository";
import { getUserStore } from "./auth-service";
import {
  DatabaseConfigurationError,
  DatabaseConnectionError,
  DatabaseError,
  handleDatabaseError,
} from "./db-client";
import { evaluateRateLimit, isDistributedRateLimiterConfigured } from "./security";

describe("Production Fail-Closed Guardrails & Safe Error Handling", () => {
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

  describe("Repository & User Store Production Fail-Closed Enforcement", () => {
    it("fails closed when getCloudRepository() is invoked in production without DATABASE_URL", () => {
      setEnv("NODE_ENV", "production");
      delete process.env.DATABASE_URL;

      expect(() => getCloudRepository()).toThrow(DatabaseConfigurationError);
      expect(() => getCloudRepository()).toThrow(
        "CRITICAL SECURITY CONFIGURATION ERROR: Cloud persistence is enabled in production, but DATABASE_URL is not configured"
      );
    });

    it("fails closed when getUserStore() is invoked in production without DATABASE_URL", () => {
      setEnv("NODE_ENV", "production");
      delete process.env.DATABASE_URL;

      expect(() => getUserStore()).toThrow(DatabaseConfigurationError);
      expect(() => getUserStore()).toThrow(
        "CRITICAL SECURITY CONFIGURATION ERROR: Authentication persistence is enabled in production, but DATABASE_URL is not configured"
      );
    });
  });

  describe("Safe Error Response Formatting (Zero Credential Leakage)", () => {
    it("formats DatabaseConfigurationError as safe HTTP 503 response without leaking internals", async () => {
      const err = new DatabaseConfigurationError(
        "Internal secret: postgresql://admin:super_secret_password@db.prod.internal:5432/clinical"
      );

      const response = handleDatabaseError(err);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(503);

      const body = await response?.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("DATABASE_UNCONFIGURED");
      expect(body.error.message).toBe("Durable database persistence is not configured on this server.");

      // Ensure secret credentials are NOT in the response body
      expect(JSON.stringify(body)).not.toContain("super_secret_password");
      expect(JSON.stringify(body)).not.toContain("postgresql://");
    });

    it("formats DatabaseConnectionError as safe HTTP 503 response", async () => {
      const err = new DatabaseConnectionError("Connection timeout to 10.0.0.42:5432");

      const response = handleDatabaseError(err);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(503);

      const body = await response?.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("DATABASE_UNAVAILABLE");
      expect(body.error.message).toBe("Unable to connect to durable database storage.");
      expect(JSON.stringify(body)).not.toContain("10.0.0.42");
    });

    it("formats generic DatabaseError as safe HTTP 503 response", async () => {
      const err = new DatabaseError("syntax error at or near 'SELECT'", "QUERY_FAILED");

      const response = handleDatabaseError(err);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(503);

      const body = await response?.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("DATABASE_ERROR");
      expect(body.error.message).toBe("Database operation failed. Please try again later.");
    });
  });

  describe("Distributed Rate Limiter Infrastructure Detection", () => {
    it("returns false for isDistributedRateLimiterConfigured when credentials are missing", () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      expect(isDistributedRateLimiterConfigured()).toBe(false);
    });

    it("fails closed in production when distributed rate limiter is missing", async () => {
      setEnv("NODE_ENV", "production");
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const result = await evaluateRateLimit("test-ip-check", 5, 60);
      expect(result.isDistributed).toBe(false);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("RATE_LIMITER_UNCONFIGURED");
      expect(result.warning).toContain(
        "CRITICAL CONFIGURATION ERROR: Distributed rate limiting"
      );
    });

    it("falls back to in-memory rate limiting with warning in development/test environments", async () => {
      setEnv("NODE_ENV", "test");
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const result = await evaluateRateLimit("test-ip-dev-check", 5, 60);
      expect(result.isDistributed).toBe(false);
      expect(result.allowed).toBe(true);
      expect(result.warning).toContain("DEVELOPMENT NOTICE: In-memory rate limiting is in effect");
    });
  });
});
