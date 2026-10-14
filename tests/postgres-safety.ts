/** Validate an explicit disposable local test target before any pool is created. */
export function getPostgresTestUrl(env: Record<string, string | undefined>): string {
  if (env.RUN_POSTGRES_INTEGRATION_TESTS !== "true") {
    throw new Error("PostgreSQL integration requires RUN_POSTGRES_INTEGRATION_TESTS=true.");
  }

  const raw = env.TEST_DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("PostgreSQL integration requires TEST_DATABASE_URL; DATABASE_URL is never used as a fallback.");
  }

  // Never include a supplied URL, parser cause, or credentials in validation errors.
  try {
    const url = new URL(raw);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.username ||
      !/^dentarith_test(?:_[a-zA-Z0-9_]+)?$/.test(database) ||
      url.search || url.hash
    ) {
      throw new Error("Invalid disposable target.");
    }
    return url.toString();
  } catch {
    throw new Error(
      "TEST_DATABASE_URL must use PostgreSQL on loopback, an explicit user, and a dentarith_test or dentarith_test_* database, without query options or fragments."
    );
  }
}
