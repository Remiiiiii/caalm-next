import { expect, test } from "@playwright/test";

const BILLING_PATH = "/settings/billing";

test.describe("Billing settings surface", () => {
	test.describe.configure({ timeout: 90000 });

	test.describe("authenticated", () => {
		test.beforeEach(async ({ page }, testInfo) => {
			test.skip(
				testInfo.project.name === "chromium-no-auth",
				"Billing UI needs the stored session from the chromium project",
			);
			await page.goto(BILLING_PATH, {
				waitUntil: "domcontentloaded",
				timeout: 60000,
			});
			await expect(page).not.toHaveURL(/sign-in/, { timeout: 15000 });

			const pageRoot = page.getByTestId("billing-integrations-page");
			const forbidden = page.getByTestId("billing-page-forbidden");
			const loading = page.getByTestId("billing-page-loading");

			// Org + permissions hydrate first. Do not wait on heading text:
			// gradient headings can have an empty accessible name, and a
			// missing-permission bounce happens after the first URL check.
			await expect(loading.or(pageRoot).or(forbidden)).toBeVisible({
				timeout: 30000,
			});
			await expect(loading).toHaveCount(0, { timeout: 30000 });

			const bouncedToSettings = /\/settings\/?$/.test(
				new URL(page.url()).pathname,
			);
			if (bouncedToSettings || (await forbidden.isVisible().catch(() => false))) {
				throw new Error(
					"Billing page denied access. PLAYWRIGHT_E2E_USER_ID already has settings.billing via Super Admin. An empty permissions list usually means NEXT_PUBLIC_APPWRITE_PERMISSIONS_COLLECTION is missing in CI (fallback used to be test-permissions).",
				);
			}

			await expect(pageRoot).toBeVisible({ timeout: 10000 });
			await expect(page.getByRole("tab", { name: "Billing" })).toBeVisible({
				timeout: 10000,
			});
		});

		test("loads billing page without auth redirect", async ({ page }) => {
			await expect(page.getByRole("tab", { name: "Billing" })).toBeVisible();
		});

		test("billing overview section renders", async ({ page }) => {
			await expect(page.getByText("Billing overview")).toBeVisible({
				timeout: 30000,
			});
			await expect(
				page.getByRole("button", { name: /change plan/i }),
			).toBeVisible();
			await expect(
				page.getByRole("button", { name: /manage billing/i }),
			).toBeVisible();
		});

		test("usage meters section renders", async ({ page }) => {
			await expect(page.getByText("Usage", { exact: true })).toBeVisible({
				timeout: 30000,
			});
		});

		test("invoice history section renders", async ({ page }) => {
			await expect(page.getByText("Invoice history")).toBeVisible({
				timeout: 30000,
			});
		});

		test("payment methods section renders", async ({ page }) => {
			await expect(
				page.getByText("Payment methods", { exact: true }),
			).toBeVisible({
				timeout: 30000,
			});
		});

		test("billing APIs include x-org-id", async ({ page }) => {
			const apiCalls: { url: string; orgHeader: string | null }[] = [];

			page.on("request", (request) => {
				const url = request.url();
				if (!url.includes("/api/billing/")) return;
				apiCalls.push({
					url,
					orgHeader: request.headers()["x-org-id"] ?? null,
				});
			});

			await page.reload({ waitUntil: "domcontentloaded" });
			await expect(page.getByRole("tab", { name: "Billing" })).toBeVisible({
				timeout: 30000,
			});

			await expect
				.poll(() => apiCalls.length, { timeout: 30000 })
				.toBeGreaterThan(0);

			for (const call of apiCalls) {
				expect(call.orgHeader, `Missing x-org-id on ${call.url}`).toBeTruthy();
			}
		});

		test("change plan dialog opens", async ({ page }) => {
			const changePlan = page.getByRole("button", { name: /change plan/i });
			await expect(changePlan).toBeVisible({ timeout: 30000 });
			await expect(changePlan).toBeEnabled({ timeout: 30000 });
			await changePlan.click();
			await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
			await page.keyboard.press("Escape");
		});

		test("payment method edit modal opens when cards exist", async ({
			page,
		}) => {
			const actionButton = page
				.getByRole("button", { name: /actions for card ending in/i })
				.first();

			const hasCard = await actionButton.isVisible().catch(() => false);
			test.skip(!hasCard, "No payment methods on file for this org");

			await actionButton.click();
			await page.getByRole("menuitem", { name: "Edit" }).click();
			await expect(
				page.getByRole("dialog", { name: /update payment method/i }),
			).toBeVisible();
			await expect(page.getByLabel("Month")).toBeVisible();
			await expect(page.getByLabel("Year")).toBeVisible();
			await page.getByRole("button", { name: "Cancel" }).click();
			await expect(page.getByRole("dialog")).toHaveCount(0);
		});

		test("payment method menu shows edit replace remove", async ({
			page,
		}) => {
			const actionButton = page
				.getByRole("button", { name: /actions for card ending in/i })
				.first();

			const hasCard = await actionButton.isVisible().catch(() => false);
			test.skip(!hasCard, "No payment methods on file for this org");

			await actionButton.click();
			await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
			await expect(page.getByRole("menuitem", { name: "Replace" })).toBeVisible();
			await expect(page.getByRole("menuitem", { name: "Remove" })).toBeVisible();
			await page.keyboard.press("Escape");
		});

		test("remove confirmation dialog opens without submitting", async ({
			page,
		}) => {
			const rows = page.getByRole("button", {
				name: /actions for card ending in/i,
			});
			const count = await rows.count();
			test.skip(count === 0, "No payment methods on file");

			let targetIndex = 0;
			for (let i = 0; i < count; i += 1) {
				const row = rows.nth(i);
				const rowText = await row
					.locator("xpath=ancestor::tr[1]")
					.innerText()
					.catch(() => "");
				if (!rowText.includes("Default")) {
					targetIndex = i;
					break;
				}
			}

			await rows.nth(targetIndex).click();
			await page.getByRole("menuitem", { name: "Remove" }).click();
			await expect(
				page.getByRole("dialog", { name: /remove payment method/i }),
			).toBeVisible();
			await page.getByRole("button", { name: "Cancel" }).click();
		});
	});

	test.describe("unauthenticated", () => {
		test("redirects to sign-in", async ({ page }, testInfo) => {
			test.skip(
				testInfo.project.name !== "chromium-no-auth",
				"This check is for the project that has no stored session",
			);
			await page.goto(BILLING_PATH, {
				waitUntil: "domcontentloaded",
				timeout: 60000,
			});
			await expect(page).toHaveURL(/sign-in/, { timeout: 30000 });
		});
	});
});
