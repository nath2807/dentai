import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateRateLimit } from "./security";

describe("distributed rate limiter failures", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "synthetic-test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([401, 429, 500, 503])("fails closed on provider HTTP %i", async (status) => {
    fetchMock.mockResolvedValue(new Response("provider unavailable", { status }));

    expect(await evaluateRateLimit(`http-${status}`, 5, 60)).toMatchObject({
      allowed: false,
      remaining: 0,
      isDistributed: true,
      code: "RATE_LIMITER_UNAVAILABLE",
    });
  });

  it.each([
    null,
    {},
    { error: "ERR invalid command" },
    { result: "1" },
    { result: 0 },
    { result: -1 },
    { result: 1.5 },
    { result: Number.MAX_SAFE_INTEGER + 1 },
    { result: 1, error: "ERR provider failure" },
  ])("fails closed on malformed provider data %j", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));

    expect(await evaluateRateLimit("malformed", 5, 60)).toMatchObject({
      allowed: false,
      isDistributed: true,
      code: "RATE_LIMITER_UNAVAILABLE",
    });
  });

  it("fails closed when the provider returns invalid JSON", async () => {
    fetchMock.mockResolvedValue(new Response("not JSON"));
    expect(await evaluateRateLimit("invalid-json", 5, 60)).toMatchObject({
      allowed: false,
      code: "RATE_LIMITER_UNAVAILABLE",
    });
  });

  it.each(["network failure", "request timeout"])("fails closed on %s", async (message) => {
    fetchMock.mockRejectedValue(new Error(message));
    expect(await evaluateRateLimit(message, 5, 60)).toMatchObject({
      allowed: false,
      code: "RATE_LIMITER_UNAVAILABLE",
    });
  });

  it("allows a valid counter below the limit with a bounded provider request", async () => {
    fetchMock.mockResolvedValue(Response.json({ result: 2 }));
    expect(await evaluateRateLimit("valid", 5, 60)).toMatchObject({
      allowed: true,
      remaining: 3,
      isDistributed: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://redis.example.test",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("rejects a valid counter above the limit", async () => {
    fetchMock.mockResolvedValue(Response.json({ result: 6 }));
    expect(await evaluateRateLimit("exceeded", 5, 60)).toMatchObject({
      allowed: false,
      remaining: 0,
      isDistributed: true,
      code: "RATE_LIMITED",
    });
  });

  it("retains the local fallback outside production on provider failure", async () => {
    vi.stubEnv("NODE_ENV", "test");
    fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }));
    expect(await evaluateRateLimit("development-fallback", 5, 60)).toMatchObject({
      allowed: true,
      isDistributed: false,
    });
  });
});
