import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Reduce timeouts for faster feedback
  timeout: 15000, // 15s instead of default 30s
  expect: { timeout: 5000 }, // 5s for assertions

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',

    // Faster navigation and actions
    navigationTimeout: 10000,
    actionTimeout: 5000,
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
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
