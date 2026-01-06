import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.(js|ts)/, // Only run Playwright spec files, exclude vitest test files
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html'], ['github']] // GitHub Actions reporter for CI
    : 'html', // HTML reporter for local development

  // Timeouts - increased for CI stability
  timeout: process.env.CI ? 60000 : 15000, // 60s in CI, 15s locally
  expect: { timeout: 10000 }, // 10s for assertions

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',

    // Navigation and action timeouts - increased for CI
    navigationTimeout: process.env.CI ? 30000 : 10000, // 30s in CI, 10s locally
    actionTimeout: process.env.CI ? 15000 : 5000, // 15s in CI, 5s locally
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.js/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-no-auth',
      use: {
        ...devices['Desktop Chrome'],
        // No storageState = no authentication
      },
    },
  ],

  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180 * 1000 : 120 * 1000, // 180s in CI, 120s locally
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
