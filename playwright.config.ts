import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: ".env.test" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_STATE = path.resolve(__dirname, "src/tests/e2e/auth/auth.json");

const baseUse = {
  baseURL: "http://localhost:3000",
  trace: "on-first-retry",
  screenshot: "only-on-failure",
  video: "retain-on-failure",
};
const chromeUse = {
  ...baseUse,
  ...devices["Desktop Chrome"],
};

/**
 * Playwright configuration for E2E tests
 * Runs only Chromium with the dedicated test server
 */
export default defineConfig({
  testDir: "./src/tests/e2e",

  // Timeout settings
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  // Output
  outputDir: "test-results/",

  // Screenshots and traces for debugging
  snapshotDir: "src/tests/e2e/__snapshots__",
  snapshotPathTemplate: "{snapshotDir}/{testFileDir}/{testFileName}-{platform}{ext}",
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === "true" ? "all" : "missing",

  // Web server
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Retries and workers
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // Single worker in CI, auto in dev

  // Reporting
  reporter: [
    ["list"],
    ["html", { outputDir: "test-results/html" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  // Browser launch options (base)
  use: baseUse,

  /**
   * Projects
   *  1. setup – runs once to create storageState
   *  2. logged-in suites – depend on setup and reuse storageState
   *  3. generic e2e suites (not logged-in)
   */
  projects: [
    {
      name: "setup",
      testMatch: "**/setup/**/*.setup.ts",
      use: chromeUse,
      teardown: "cleanup db",
    },
    {
      name: "cleanup db",
      testMatch: "**/setup/**/*.teardown.ts",
      use: chromeUse,
    },
    {
      name: "e2e tests - logged in",
      dependencies: ["setup"],
      testMatch: "**/logged-in/**/*.e2e.ts",
      use: {
        ...chromeUse,
        storageState: STORAGE_STATE,
      },
    },
    {
      name: "e2e tests",
      testMatch: "**/not-logged-in/**/*.e2e.ts",
      use: chromeUse,
    },
  ],

  // Parallel execution
  fullyParallel: true,
});
