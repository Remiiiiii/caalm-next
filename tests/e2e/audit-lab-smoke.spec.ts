import { test, expect } from "@playwright/test";

test.describe("Audit Lab smoke", () => {
	test.skip(
		!process.env.E2E_LOGIN_EMAIL,
		"Set E2E_LOGIN_EMAIL for authenticated Audit Lab smoke",
	);

	test("Schedule Review lands on overview", async ({ page }) => {
		await page.goto("/audit-lab/overview");
		await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
		await expect(
			page.getByRole("navigation", { name: "Audit Lab surfaces" }),
		).toBeVisible();
	});
});