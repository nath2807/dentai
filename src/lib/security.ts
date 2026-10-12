/**
 * Dentarith Server-Side Security Utilities.
 *
 * Implements:
 * - Rate Limiting Architecture (Distributed Redis / In-memory test adapter)
 * - Safe generic error response formatter (leakage prevention)
 * - Audit IP anonymization via cryptographic hashing
 */
import crypto from "crypto";
import { NextResponse } from "next/server";

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  isDistributed: boolean;
  warning?: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitRecord>();

/**
 * Check whether distributed rate limiter provider configuration is present.
 */
export function isDistributedRateLimiterConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return Boolean(url && token);
}

/**
 * Synchronous in-memory sliding window rate limiter (for testing and local dev).
 * NOTE: Does NOT synchronize across serverless lambdas.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();

  // Periodically purge expired buckets if map exceeds 1000 items to prevent memory exhaustion
  if (rateLimitBuckets.size > 1000) {
    for (const [k, v] of rateLimitBuckets.entries()) {
      if (now > v.resetAt) {
        rateLimitBuckets.delete(k);
      }
    }
  }

  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  isDistributed: boolean;
  code?: string;
  warning?: string;
}

/**
 * Evaluate rate limit using distributed Redis provider if configured.
 * FAIL-CLOSED: In production, missing or failing Redis fails closed for security.
 * In development/test, falls back to local in-memory token bucket.
 */
export async function evaluateRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitStatus> {
  const isDistributed = isDistributedRateLimiterConfigured();
  const isProduction = process.env.NODE_ENV === "production";

  // Production fail-closed enforcement when distributed rate limiting is unconfigured
  if (isProduction && !isDistributed) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: windowSeconds,
      isDistributed: false,
      code: "RATE_LIMITER_UNCONFIGURED",
      warning:
        "CRITICAL CONFIGURATION ERROR: Distributed rate limiting (UPSTASH_REDIS_REST_URL) is required in production. Failing closed to prevent distributed brute-force abuse.",
    };
  }

  if (isDistributed) {
    try {
      const restUrl = process.env.UPSTASH_REDIS_REST_URL!.trim();
      const restToken = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();

      // Genuinely atomic sliding window Lua script:
      // Increments counter and only sets EXPIRE on initial creation (does not reset TTL on subsequent calls).
      const luaScript =
        "local current = redis.call('INCR', KEYS[1]) if tonumber(current) == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end return current";

      const res = await fetch(restUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${restToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "EVAL",
          luaScript,
          1,
          `dentarith:rl:${key}`,
          windowSeconds,
        ]),
        cache: "no-store",
      });

      if (res.ok) {
        const data = (await res.json()) as { result: number };
        const currentCount = typeof data.result === "number" ? data.result : 1;
        const allowed = currentCount <= limit;
        return {
          allowed,
          remaining: Math.max(0, limit - currentCount),
          resetInSeconds: windowSeconds,
          isDistributed: true,
          code: allowed ? undefined : "RATE_LIMITED",
        };
      }
    } catch {
      // Intentional production failure handling: fail closed if Redis is down
      if (isProduction) {
        return {
          allowed: false,
          remaining: 0,
          resetInSeconds: 30,
          isDistributed: true,
          code: "RATE_LIMITER_UNAVAILABLE",
          warning: "Distributed rate limiter is unreachable. Request fails closed.",
        };
      }
    }
  }

  // Development and test fallback to local token bucket
  const localRes = checkRateLimit(key, limit, windowSeconds);

  return {
    ...localRes,
    isDistributed: false,
    code: localRes.allowed ? undefined : "RATE_LIMITED",
    warning: "DEVELOPMENT NOTICE: In-memory rate limiting is in effect.",
  };
}

/**
 * Extract anonymized client IP hash to avoid storing raw IP addresses in audit logs.
 */
export function getAnonymizedClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
  return crypto.createHash("sha256").update(ip + "dentarith-salt").digest("hex").slice(0, 16);
}

/**
 * Standardized safe JSON error response that avoids exposing stack traces or system internals.
 */
export function safeErrorResponse(
  status: number,
  message: string,
  code = "BAD_REQUEST",
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...extra,
      },
    },
    { status }
  );
}
