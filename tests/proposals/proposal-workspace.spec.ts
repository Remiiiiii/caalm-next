import { expect, test } from "@playwright/test";

test.describe("RFP proposal workspace", () => {
	test.describe.configure({ timeout: 90000 });

	test("list page opens the workspace from New proposal", async ({
		page,
	}, testInfo) => {
		test.skip(
			testInfo.project.name === "chromium-no-auth",
			"Proposal workspace needs a signed-in session",
		);

		await page.goto("/contracts/proposals", {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
		await expect(page).not.toHaveURL(/sign-in/, { timeout: 15000 });
		await expect(
			page.getByRole("heading", { name: /RFP Proposals/i }),
		).toBeVisible({ timeout: 20000 });

		const newButton = page.getByRole("button", { name: "New proposal" });
		await expect(newButton).toBeVisible({ timeout: 20000 });
		await newButton.click();

		const stamp = Date.now();
		await page.getByLabel("Title").fill(`Smoke proposal ${stamp}`);
		await page.getByLabel(/Solicitation text/).fill(
			"Section L: Offerors shall include a 10-page technical volume.\nThe contractor must name a program manager.\nSection M: The Government will evaluate past performance.",
		);
		await page.getByRole("button", { name: "Open workspace" }).click();

		await expect(page).toHaveURL(/\/contracts\/proposals\/[a-zA-Z0-9]+/, {
			timeout: 30000,
		});
		await expect(page.getByTestId("proposal-workspace")).toBeVisible();
		await expect(page.getByText("Compliance matrix")).toBeVisible();
		await expect(page.getByRole("button", { name: "Shred solicitation" })).toBeVisible();
	});
});
