import { defineConfig } from "vitest/config";
import react from "@astrojs/react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: "happy-dom",
    globals: true,

    // Setup
    setupFiles: ["./src/tests/setup.ts"],

    // Do not run Playwright E2E tests in Vitest
    exclude: ["**/node_modules/**", "**/dist/**", "playwright.config.*", "src/tests/**/*.e2e.*"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json", "json-summary"],
      exclude: [
        "node_modules/",
        "src/tests/",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.config.*",
        "**/types.ts",
        "**/dist/**",
      ],
      thresholds: {
        statements: 65,
        branches: 50,
        functions: 70,
        lines: 65,
      },
    },

    // Reporter
    reporters: ["verbose"],

    // Timeout
    testTimeout: 10000,
    hookTimeout: 10000,

    // Isolated test environment per file
    isolate: true,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
