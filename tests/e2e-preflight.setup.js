import { expect, test } from "@playwright/test";

/**
 * Runs before auth.setup.js. Validates Appwrite org + RBAC preconditions so
 * billing E2E fails in seconds with a clear message instead of UI timeouts.
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown (project dependencies)
 */
test("Appwrite E2E preconditions", async ({ request }) => {
	test.setTimeout(90_000);

	const e2eUserId = process.env.PLAYWRIGHT_E2E_USER_ID?.trim();
	expect(
		e2eUserId,
		"PLAYWRIGHT_E2E_USER_ID must be set (see GITHUB_SECRETS_SETUP.md)",
	).toBeTruthy();

	// Preflight hits Appwrite several times; default actionTimeout (5s local) is too low.
	const response = await request.get(
		`/api/test/e2e-preflight?userId=${encodeURIComponent(e2eUserId)}`,
		{ timeout: 60_000 },
	);

	const body = await response.json().catch(() => ({}));

	if (!response.ok()) {
		const failed = (body.checks || [])
			.filter((check) => !check.ok)
			.map((check) => `- ${check.name}: ${check.detail || "failed"}`)
			.join("\n");

		throw new Error(
			`E2E Appwrite preflight failed (HTTP ${response.status()}).\n${failed || JSON.stringify(body)}`,
		);
	}

	expect(body.ok).toBe(true);
});
