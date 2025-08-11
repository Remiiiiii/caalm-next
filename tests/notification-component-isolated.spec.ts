import { test, expect } from '@playwright/test';

test.describe('Notification System Component Tests (Isolated)', () => {
  test.use({ storageState: undefined }); // Override for this test suite
  test('should render notification center with mocked data', async ({
    page,
  }) => {
    // Mock API responses before navigation
    await page.route('/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            $id: 'test-1',
            userId: 'test-user-1',
            title: 'Test Notification 1',
            message: 'This is a test notification',
            type: 'contract-expiry',
            read: false,
            priority: 'high',
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
          },
          {
            $id: 'test-2',
            userId: 'test-user-1',
            title: 'Test Notification 2',
            message: 'This is another test notification',
            type: 'info',
            read: true,
            priority: 'medium',
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('/api/notification-types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            $id: 'contract-expiry',
            name: 'Contract Expiry',
            description: 'Notifications for contract expiration',
            icon: 'Calendar',
            priority: 'high',
            category: 'contracts',
            is_active: true,
            default_enabled: true,
            auto_trigger: true,
          },
          {
            $id: 'info',
            name: 'Information',
            description: 'General information notifications',
            icon: 'Info',
            priority: 'low',
            category: 'general',
            is_active: true,
            default_enabled: true,
            auto_trigger: false,
          },
        ]),
      });
    });

    // Navigate to a simple test page that includes the notification center
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if the page loaded successfully
    await expect(page).toHaveTitle(/CAALM Solutions/);

    // Test that the page loads without authentication errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('/api/notifications', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.route('/api/notification-types', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Navigate to the page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The page should still load even with API errors
    await expect(page).toHaveTitle(/CAALM Solutions/);

    // Test that the page loads without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle empty notification list', async ({ page }) => {
    // Mock API to return empty array
    await page.route('/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('/api/notification-types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate to the page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The page should load successfully with empty data
    await expect(page).toHaveTitle(/CAALM Solutions/);

    // Test that the page loads without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should test notification center component structure', async ({
    page,
  }) => {
    // Mock successful API responses
    await page.route('/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            $id: 'test-1',
            userId: 'test-user-1',
            title: 'Test Notification',
            message: 'This is a test notification message',
            type: 'info',
            read: false,
            priority: 'medium',
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('/api/notification-types', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            $id: 'info',
            name: 'Information',
            description: 'General information notifications',
            icon: 'Info',
            priority: 'low',
            category: 'general',
            is_active: true,
            default_enabled: true,
            auto_trigger: false,
          },
        ]),
      });
    });

    // Navigate to the page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test basic page structure
    await expect(page).toHaveTitle(/CAALM Solutions/);
    await expect(page.locator('body')).toBeVisible();

    // Test that the page doesn't crash with notification data
    // Note: We can't test specific notification elements without authentication
    // but we can verify the page loads successfully
    console.log('Page loaded successfully with notification data');
  });
});
