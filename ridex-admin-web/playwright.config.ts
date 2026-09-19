import { defineConfig, devices } from '@playwright/test';

// Run through e2e/run.sh, which starts the test backend (8090) and console (5175) first.
export default defineConfig({
  testDir: './e2e',
  // One at a time: the specs share one database, and later ones build on routes earlier ones made.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]],
  outputDir: 'e2e/.results',
  use: {
    baseURL: 'http://localhost:5175',
    screenshot: 'on',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium', viewport: { width: 1440, height: 900 } } }],
});
