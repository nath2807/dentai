import { defineConfig } from "vitest/config";
import { getPostgresTestUrl } from "./tests/postgres-safety";
import { isolatedTestEnvironment } from "./tests/test-environment";

// Fail during configuration, before importing stores or opening a connection.
const testUrl = getPostgresTestUrl(process.env);

export default defineConfig({
  test: {
    include: ["src/lib/postgres-integration.test.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 30000,
    testTimeout: 10000,
    env: {
      ...isolatedTestEnvironment,
      RUN_POSTGRES_INTEGRATION_TESTS: "true",
      TEST_DATABASE_URL: testUrl,
      DATABASE_URL: testUrl,
    },
  },
});
