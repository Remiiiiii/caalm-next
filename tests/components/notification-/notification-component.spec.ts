import { expect, test } from "@playwright/test";

async function openNotificationCenter(page: import("@playwright/test").Page) {
	await page.getByTestId("notification-bell").click();
}

test.describe("Notification System Component Tests", () => {
	// Use authenticated project - dashboard requires authentication
	test.use({ projectName: "chromium" });

	test("should render notification center with test data", async ({ page }) => {
		// Mock the API responses
		await page.route("**/api/notifications**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: [
						{
							$id: "test-1",
							userId: "test-user-1",
							title: "Test Notification 1",
							message: "This is a test notification",
							type: "contract-expiry",
							read: false,
							priority: "high",
							$createdAt: new Date().toISOString(),
							$updatedAt: new Date().toISOString(),
						},
						{
							$id: "test-2",
							userId: "test-user-1",
							title: "Test Notification 2",
							message: "This is another test notification",
							type: "document-upload",
							read: true,
							priority: "medium",
							$createdAt: new Date().toISOString(),
							$updatedAt: new Date().toISOString(),
						},
					],
				}),
			});
		});

		await page.route("/api/notification-types", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: [
						{
							$id: "type-1",
							type_key: "contract-expiry",
							name: "Contract Expiry",
							description: "Notifications for contract expiration",
							icon: "Calendar",
							priority: "high",
							category: "contracts",
							is_active: true,
							default_enabled: true,
							auto_trigger: true,
							template: {
								title: "Contract Expiring Soon",
								message: "Contract {contract_name} expires on {expiry_date}",
								action_url: "/contracts/{contract_id}",
							},
						},
					],
				}),
			});
		});

		// Navigate to dashboard (should be authenticated from global setup)
		await page.goto("/dashboard", {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		// Wait for the page to load
		await page.waitForLoadState("domcontentloaded");

		// Check if the page loaded successfully (fixed title expectation)
		await expect(page).toHaveTitle(/CAALM Solutions/);

		await expect(page.getByTestId("notification-bell")).toBeVisible();
		await openNotificationCenter(page);

		await expect(
			page.locator('[data-testid="notification-center"]'),
		).toBeVisible();
	});

	test("should handle API errors gracefully", async ({ page }) => {
		// Mock API error
		await page.route("**/api/notifications**", async (route) => {
			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ error: "Internal Server Error" }),
			});
		});

		// Navigate to dashboard (should be authenticated from global setup)
		await page.goto("/dashboard", {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await page.waitForLoadState("domcontentloaded");

		// The page should still load even with API errors (fixed title expectation)
		await expect(page).toHaveTitle(/CAALM Solutions/);

		await openNotificationCenter(page);
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
	});

	test("should handle empty notification list", async ({ page }) => {
		// Mock empty notifications
		await page.route("**/api/notifications**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true, data: [] }),
			});
		});

		// Navigate to dashboard (should be authenticated from global setup)
		await page.goto("/dashboard", {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		await page.waitForLoadState("domcontentloaded");

		// The page should load successfully with empty data (fixed title expectation)
		await expect(page).toHaveTitle(/CAALM Solutions/);

		await openNotificationCenter(page);
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
	});
});
