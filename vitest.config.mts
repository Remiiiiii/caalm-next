import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		// jsdom component tests exceed the 5s default when the whole suite runs in parallel
		testTimeout: 15000,
		include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/tests/**/*.spec.ts", // Exclude Playwright E2E tests
			"**/.next/**",
		],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"server-only": path.resolve(__dirname, "./tests/helpers/server-only-stub.ts"),
		},
	},
});
