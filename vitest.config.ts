import { configDefaults, defineConfig } from "vitest/config";
import { isolatedTestEnvironment } from "./tests/test-environment";

import path from "node:path";

// The default suite uses synthetic data and mocks. Never inherit credentials:
// Live integration uses a separate, explicitly opted-in local test target.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    env: isolatedTestEnvironment,
    exclude: [...configDefaults.exclude, "**/postgres-integration.test.ts"],
  },
});
