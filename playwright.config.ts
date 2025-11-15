import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * Runs tests in Chromium, WebKit, and Firefox with visual regression support
 */
export default defineConfig({
  testDir: './src/tests/e2e',
  testMatch: '**/*.e2e.ts',
  
  // Timeout settings
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // Output
  outputDir: 'test-results/',
  
  // Screenshots and traces for debugging
  snapshotDir: 'src/tests/e2e/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-{platform}{ext}',
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',
  
  // Web server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // Retries and workers
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // Single worker in CI, auto in dev
  
  // Reporting
  reporter: [
    ['list'],
    ['html', { outputDir: 'test-results/html' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  
  // Browser launch options
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry', // Trace on first failure for debugging
    screenshot: 'only-on-failure', // Screenshot on failure
    video: 'retain-on-failure', // Video on failure
  },
  
  // Projects: Chromium + WebKit + Firefox
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    // Optional: Mobile testing
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],
  
  // Parallel execution
  fullyParallel: true,
});

