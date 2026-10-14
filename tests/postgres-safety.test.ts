import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPostgresTestUrl } from "./postgres-safety";
import { PostgresCloudRepository } from "../src/lib/postgres-cloud-repository";
import { PostgresUserStore } from "../src/lib/postgres-user-store";
import * as dbClient from "../src/lib/db-client";

vi.mock("../src/lib/db-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/db-client")>();
  return {
    ...actual,
    isDatabaseConfigured: vi.fn(() => true),
    query: vi.fn(),
    withTransaction: vi.fn(),
  };
});

const localUrl = "postgresql://synthetic:synthetic@127.0.0.1:5432/dentarith_test";
const optedIn = { RUN_POSTGRES_INTEGRATION_TESTS: "true" };

describe("PostgreSQL integration target safety", () => {
  it.each([undefined, "", "false", "1"])("rejects opt-in value %s", (flag) => {
    expect(() => getPostgresTestUrl({
      RUN_POSTGRES_INTEGRATION_TESTS: flag,
      TEST_DATABASE_URL: localUrl,
    })).toThrow("RUN_POSTGRES_INTEGRATION_TESTS=true");
  });

  it("never falls back to the application DATABASE_URL", () => {
    expect(() => getPostgresTestUrl({ ...optedIn, DATABASE_URL: localUrl }))
      .toThrow("TEST_DATABASE_URL");
  });

  it("uses only the test target when application database credentials are inherited", () => {
    expect(getPostgresTestUrl({
      ...optedIn,
      TEST_DATABASE_URL: localUrl,
      DATABASE_URL: "postgresql://synthetic:secret@production.example.test/dentarith",
    })).toBe(localUrl);
  });

  it.each([
    "postgresql://synthetic:secret@db.example.test/dentarith_test",
    "postgresql://synthetic:secret@127.0.0.1/dentarith",
    "postgresql://synthetic:secret@127.0.0.1/postgres",
    "postgresql://synthetic:secret@127.0.0.1/dentarith_test_prod/path",
    "postgresql://synthetic:secret@127.0.0.1/dentarith_test?host=db.example.test",
    "postgresql://synthetic:secret@127.0.0.1/dentarith_test?dbname=dentarith",
    "postgresql://synthetic:secret@127.0.0.1/dentarith_test?options=-csearch_path=public",
    "postgresql://synthetic:secret@127.0.0.1/dentarith_test#fragment",
    "postgresql://127.0.0.1/dentarith_test",
    "https://synthetic:secret@127.0.0.1/dentarith_test",
    "not-a-url-with-secret",
  ])("rejects unsafe target %s without exposing its value", (url) => {
    let failure: unknown;
    try {
      getPostgresTestUrl({ ...optedIn, TEST_DATABASE_URL: url });
    } catch (err) {
      failure = err;
    }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).not.toContain(url);
    expect((failure as Error).message).not.toContain("secret");
  });

  it.each([
    localUrl,
    "postgres://synthetic:synthetic@localhost:5433/dentarith_test_ci",
    "postgresql://synthetic:synthetic@[::1]:5432/dentarith_test_local",
  ])("accepts explicit disposable loopback target %s", (url) => {
    expect(getPostgresTestUrl({ ...optedIn, TEST_DATABASE_URL: url })).toBe(url);
  });
});

describe("persistent stores cannot perform bulk test cleanup", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it.each(["test", "production"])("disables fixture seeding and bulk clear in %s", async (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    const cases = new PostgresCloudRepository({ seedDemo: false });
    const users = new PostgresUserStore({ seedDemo: false });
    await expect(cases.clear()).rejects.toThrow("Bulk clearing PostgreSQL");
    await expect(users.clear()).rejects.toThrow("Bulk clearing PostgreSQL");
    expect(dbClient.query).not.toHaveBeenCalled();
    expect(dbClient.withTransaction).not.toHaveBeenCalled();
  });
});
