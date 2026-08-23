import fs from "node:fs";
import { test } from "@playwright/test";

const authFile = "tests/.auth/user.json";

const DASHBOARD_ENTRY = "/dashboard";
const SETUP_GOTO_TIMEOUT = 60000;

function getE2EUserId() {
	const id = process.env.PLAYWRIGHT_E2E_USER_ID?.trim();
	if (!id) {
		throw new Error(
			"PLAYWRIGHT_E2E_USER_ID is required for Playwright auth setup (users collection document $id). " +
				"Set it in CI secrets and locally in .env.local — see GITHUB_SECRETS_SETUP.md.",
		);
	}
	return id;
}

test("authenticate", async ({ page, context }) => {
	test.setTimeout(90000);

	console.log("Starting authentication setup...");

	const isTestEnv =
		process.env.CI ||
		process.env.NODE_ENV === "test" ||
		process.env.PLAYWRIGHT_TEST;

	if (isTestEnv) {
		console.log(
			"Test environment detected — using 2FA cookies + real users table row",
		);

		const e2eUserId = getE2EUserId();

		await context.addCookies([
			{
				name: "2fa_completed",
				value: "true",
				domain: "localhost",
				path: "/",
				httpOnly: true,
				secure: false,
				sameSite: "Lax",
			},
			{
				name: "2fa_user_id",
				value: e2eUserId,
				domain: "localhost",
				path: "/",
				httpOnly: true,
				secure: false,
				sameSite: "Lax",
			},
		]);

		// commit = response started. Do not wait for DOMContentLoaded:
		// Next.js can stream / forever and Playwright will time out.
		await page.goto("/", {
			waitUntil: "commit",
			timeout: SETUP_GOTO_TIMEOUT,
		});

		await page.evaluate(
			({ userId }) => {
				localStorage.setItem("auth-token", "test-auth-token");
				localStorage.setItem("user-email", "test@example.com");
				localStorage.setItem("caalm_org_id", "default_organization");
				localStorage.setItem(
					"cached_user",
					JSON.stringify({
						user: {
							$id: userId,
							email: "test@example.com",
							name: "Test User",
						},
						timestamp: Date.now(),
					}),
				);
				sessionStorage.setItem("authenticated", "true");
			},
			{ userId: e2eUserId },
		);

		// Setup only stores cookies + localStorage. /dashboard RSC can sit on
		// "Rendering..." and never fire DOMContentLoaded.
		await page.context().storageState({ path: authFile });
		console.log(
			"Authentication setup completed successfully - saved to",
			authFile,
		);
		return;
	} else {
		await page.goto("/sign-in", {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		console.log("Navigated to sign-in page");

		await page.waitForLoadState("domcontentloaded");

		await page.waitForSelector(
			'input[type="email"], input[placeholder*="email" i]',
			{
				timeout: 15000,
			},
		);
		const emailInput = page
			.locator('input[type="email"], input[placeholder*="email" i]')
			.first();
		await emailInput.fill("test@example.com");
		console.log("Filled email input");

		await page.waitForSelector(
			'button[type="submit"], button:has-text("Sign In")',
			{
				timeout: 15000,
			},
		);
		const signInButton = page
			.locator('button[type="submit"], button:has-text("Sign In")')
			.first();
		await signInButton.click();
		console.log("Clicked sign-in button");

		try {
			await page.waitForSelector(
				'p:has-text("Check your email"), p:has-text("check your email")',
				{
					timeout: 3000,
				},
			);
			console.log("OTP flow detected - proceeding with mock authentication");

			await context.addCookies([
				{
					name: "a_session_test",
					value: "test-session-token",
					domain: "localhost",
					path: "/",
					httpOnly: true,
					secure: false,
					sameSite: "Lax",
				},
			]);

			await page.evaluate(() => {
				localStorage.setItem("auth-token", "test-auth-token");
				localStorage.setItem("user-email", "test@example.com");
				localStorage.setItem("caalm_org_id", "default_organization");
				localStorage.setItem(
					"cached_user",
					JSON.stringify({
						user: {
							$id: "test-user-id",
							email: "test@example.com",
							name: "Test User",
						},
						timestamp: Date.now(),
					}),
				);
				sessionStorage.setItem("authenticated", "true");
			});

			await page.goto(DASHBOARD_ENTRY, {
				waitUntil: "domcontentloaded",
				timeout: SETUP_GOTO_TIMEOUT,
			});
			console.log("Navigated to dashboard after mock auth");
		} catch (error) {
			console.log(
				"No OTP modal found, creating mock authentication directly",
				error,
			);

			await context.addCookies([
				{
					name: "a_session_test",
					value: "test-session-token",
					domain: "localhost",
					path: "/",
					httpOnly: true,
					secure: false,
					sameSite: "Lax",
				},
			]);

			await page.evaluate(() => {
				localStorage.setItem("auth-token", "test-auth-token");
				localStorage.setItem("user-email", "test@example.com");
				localStorage.setItem("caalm_org_id", "default_organization");
				localStorage.setItem(
					"cached_user",
					JSON.stringify({
						user: {
							$id: "test-user-id",
							email: "test@example.com",
							name: "Test User",
						},
						timestamp: Date.now(),
					}),
				);
			});

			await page.goto(DASHBOARD_ENTRY, {
				waitUntil: "domcontentloaded",
				timeout: SETUP_GOTO_TIMEOUT,
			});
			console.log("Navigated to dashboard with mock session");
		}
	}

	await page.waitForLoadState("domcontentloaded");

	const currentUrl = page.url();
	console.log("Final URL:", currentUrl);

	try {
		await page.context().storageState({ path: authFile });
		console.log(
			"Authentication setup completed successfully - saved to",
			authFile,
		);
	} catch (error) {
		console.error("Failed to save authentication state:", error);
		const e2eUserId =
			process.env.PLAYWRIGHT_E2E_USER_ID?.trim() || "test-user-id";
		const minimalAuth = {
			cookies: [
				{
					name: "2fa_completed",
					value: "true",
					domain: "localhost",
					path: "/",
					httpOnly: true,
					secure: false,
					sameSite: "Lax",
				},
				{
					name: "2fa_user_id",
					value: e2eUserId,
					domain: "localhost",
					path: "/",
					httpOnly: true,
					secure: false,
					sameSite: "Lax",
				},
			],
			origins: [
				{
					origin: "http://localhost:3000",
					localStorage: [
						{
							name: "auth-token",
							value: "test-auth-token",
						},
						{
							name: "user-email",
							value: "test@example.com",
						},
						{
							name: "caalm_org_id",
							value: "default_organization",
						},
						{
							name: "cached_user",
							value: JSON.stringify({
								user: {
									$id: e2eUserId,
									email: "test@example.com",
									name: "Test User",
								},
								timestamp: Date.now(),
							}),
						},
					],
				},
			],
		};
		fs.mkdirSync("tests/.auth", { recursive: true });
		fs.writeFileSync(authFile, JSON.stringify(minimalAuth, null, 2));
		console.log("Created minimal auth file with 2FA cookies");
	}
});
