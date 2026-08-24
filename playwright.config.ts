import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Next.js loads .env.local for `pnpm dev`. Playwright is a separate Node
// process, so load the same files here. Existing env (CI secrets) wins.
loadEnv({ path: path.join(process.cwd(), ".env") });
loadEnv({ path: path.join(process.cwd(), ".env.local") });

export default defineConfig({
	testDir: "./tests",
	testMatch: /.*\.spec\.(js|ts)/, // Only run Playwright spec files, exclude vitest test files
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0, // Reduced retries to speed up tests
	workers: process.env.CI ? 1 : undefined, // Single worker in CI avoids auth/RBAC races on one server
	reporter: process.env.CI
		? [["html"], ["github"]] // GitHub Actions reporter for CI
		: "html", // HTML reporter for local development

	// Timeouts - optimized for CI speed while maintaining stability
	timeout: process.env.CI ? 45000 : 15000, // 45s in CI (reduced from 60s), 15s locally
	expect: { timeout: 8000 }, // 8s for assertions (reduced from 10s)

	use: {
		baseURL: "http://localhost:3000",
		trace: "off",
		screenshot: "only-on-failure",
		video: "off",

		// Navigation and action timeouts - optimized for CI speed
		navigationTimeout: process.env.CI ? 20000 : 10000, // 20s in CI (reduced from 30s), 10s locally
		actionTimeout: process.env.CI ? 10000 : 5000, // 10s in CI (reduced from 15s), 5s locally
	},

	projects: [
		{
			name: "preflight",
			testMatch: /e2e-preflight\.setup\.js/,
		},
		{
			name: "setup",
			testMatch: /auth\.setup\.js/,
			dependencies: ["preflight"],
		},
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				storageState: "tests/.auth/user.json",
			},
			dependencies: ["setup"],
		},
		{
			name: "chromium-no-auth",
			use: {
				...devices["Desktop Chrome"],
				// No storageState = no authentication
			},
			testIgnore: [
				"**/components/notification-/**",
			],
		},
	],

	webServer: {
		// CI uses a production build so Suspense/streaming matches deploy behavior.
		command: process.env.CI
			? "pnpm run build && pnpm run start"
			: "pnpm run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: process.env.CI ? 300 * 1000 : 120 * 1000,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			PLAYWRIGHT_TEST: "true",
			RATE_LIMIT_ENABLED: "false",
		},
	},
});
