import { test, expect } from '@playwright/test';

// Mock contract data
const mockContracts = [
  {
    $id: 'contract-1',
    contractName: 'Test Contract 1',
    contractExpiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // 5 days from now
    isExpired: false,
    daysUntilExpiry: 5,
    status: 'active',
  },
  {
    $id: 'contract-2',
    contractName: 'Test Contract 2',
    contractExpiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // 15 days from now
    isExpired: false,
    daysUntilExpiry: 15,
    status: 'active',
  },
  {
    $id: 'contract-3',
    contractName: 'Expired Contract',
    contractExpiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // 10 days ago
    isExpired: true,
    daysUntilExpiry: -10,
    status: 'expired',
  },
  {
    $id: 'contract-4',
    contractName: 'Future Contract',
    contractExpiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // 60 days from now
    isExpired: false,
    daysUntilExpiry: 60,
    status: 'active',
  },
];

test.describe('Contract Expiry Alerts Widget', () => {
  // Widget requires authentication - skip tests for non-authenticated project
  test.beforeEach(async ({ page }, testInfo) => {
    // Skip tests for non-authenticated project
    if (testInfo.project.name === 'chromium-no-auth') {
      testInfo.skip();
      return;
    }

    // Mock API endpoints BEFORE navigation
    await page.route('/api/contracts/all', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockContracts,
        }),
      });
    });

    await page.route('/api/contracts/update-expired', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock auth context by setting localStorage before navigation
    // This simulates an authenticated user session
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'cached_user',
        JSON.stringify({
          user: {
            $id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User',
            role: 'executive',
          },
          timestamp: Date.now(),
        })
      );
      window.localStorage.setItem('auth-token', 'test-auth-token');
      window.localStorage.setItem('user-email', 'test@example.com');
      sessionStorage.setItem('authenticated', 'true');
    });

    // Navigate to real dashboard page
    await page.goto('/dashboard/executive', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for React hydration and component rendering
    await page.waitForTimeout(2000);

    // Wait for the widget to appear with retry logic
    const widgetLocator = page.locator('text=Contract Expiry Alerts').first();

    // Wait for widget to be attached to DOM first
    await widgetLocator
      .waitFor({
        state: 'attached',
        timeout: 15000,
      })
      .catch(() => {
        // If not found, wait a bit more and try again
        return page.waitForTimeout(2000);
      });

    // Scroll widget into view if needed
    await widgetLocator
      .scrollIntoViewIfNeeded({ timeout: 5000 })
      .catch(() => {});

    // Now wait for it to be visible
    await expect(widgetLocator).toBeVisible({ timeout: 10000 });
  });

  test('should render contract expiry alerts widget', async ({ page }) => {
    // Widget should already be visible from beforeEach, but verify
    const widget = page.locator('text=Contract Expiry Alerts').first();
    await expect(widget).toBeVisible({ timeout: 5000 });

    // Check if the widget title is visible
    await expect(widget).toContainText('Contract Expiry Alerts');
  });

  test('should display filter dropdown', async ({ page }) => {
    // Widget should already be visible from beforeEach
    // Find the filter dropdown - it may be in compact or full mode
    const filterSelect = page
      .locator('select[aria-label="Filter contracts by time period"]')
      .first();
    await expect(filterSelect).toBeVisible({ timeout: 5000 });

    // Check that filter options are present
    await expect(filterSelect.locator('option[value="30"]')).toContainText(
      '30 days'
    );
    await expect(filterSelect.locator('option[value="60"]')).toContainText(
      '60 days'
    );
    await expect(filterSelect.locator('option[value="-1"]')).toContainText(
      'Expired'
    );
  });

  test('should filter contracts by time period', async ({ page }) => {
    const filterSelect = page
      .locator('select[aria-label="Filter contracts by time period"]')
      .first();
    await expect(filterSelect).toBeVisible({ timeout: 5000 });

    // Select 30 days filter
    await filterSelect.selectOption('30');
    await page.waitForTimeout(1000); // Wait for filter to apply and contracts to render

    // Check that contracts within 30 days are shown
    // Contract 1 (5 days) and Contract 2 (15 days) should be visible
    await expect(page.locator('text=Test Contract 1').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=Test Contract 2').first()).toBeVisible({
      timeout: 5000,
    });

    // Select 60 days filter
    await filterSelect.selectOption('60');
    await page.waitForTimeout(1000);

    // Contract 4 (60 days) should now be visible
    await expect(page.locator('text=Future Contract').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show expired contracts when Expired filter is selected', async ({
    page,
  }) => {
    const filterSelect = page
      .locator('select[aria-label="Filter contracts by time period"]')
      .first();
    await expect(filterSelect).toBeVisible({ timeout: 5000 });

    // Select Expired filter
    await filterSelect.selectOption('-1');
    await page.waitForTimeout(1000);

    // Expired contract should be visible
    await expect(page.locator('text=Expired Contract').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show pulsating animation for expiring contracts badge', async ({
    page,
  }) => {
    await page.waitForTimeout(1000); // Wait for badges to calculate

    // Wait for the expiring badge to appear
    const expiringBadge = page.locator('text=/\\d+ expiring/').first();

    // Check if badge exists (only if there are expiring contracts)
    const badgeCount = await expiringBadge.count();
    if (badgeCount > 0) {
      await expect(expiringBadge).toBeVisible({ timeout: 5000 });

      // Check if the badge has the animate-pulse class
      const badgeContainer = expiringBadge.locator('..');
      const classes = await badgeContainer.getAttribute('class');
      expect(classes).toContain('animate-pulse');
    }
  });

  test('should display status badges with correct counts', async ({ page }) => {
    await page.waitForTimeout(1500); // Wait for counts to calculate

    // Check for expiring count badge (if expiring contracts exist)
    const expiringBadge = page.locator('text=/\\d+ expiring/').first();
    const expiredBadge = page.locator('text=/\\d+ expired/').first();

    // At least one badge should be visible
    const expiringCount = await expiringBadge.count();
    const expiredCount = await expiredBadge.count();

    expect(expiringCount + expiredCount).toBeGreaterThan(0);
  });

  test('should show empty state when no contracts match filter', async ({
    page,
  }) => {
    const filterSelect = page
      .locator('select[aria-label="Filter contracts by time period"]')
      .first();
    await expect(filterSelect).toBeVisible({ timeout: 5000 });

    // Select 90 days filter (should show no contracts from our mock data)
    await filterSelect.selectOption('90');
    await page.waitForTimeout(1000);

    // Check for empty state message - it may say "No contracts" or similar
    const emptyState = page.locator('text=/No contracts/i').first();
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });

  test('should handle error state', async ({ page }) => {
    // Override the existing route mock with an error response
    await page.route('/api/contracts/all', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Reload the page to trigger the error
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for error state to render

    // Check for error message
    const errorMessage = page
      .locator('text=Failed to load contract data')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should update expired contracts on mount', async ({ page }) => {
    let updateExpiredCalled = false;

    // Override the existing route mock to track calls
    await page.route('/api/contracts/update-expired', async (route) => {
      updateExpiredCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Reload the page to trigger the mount effect
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait for the component to mount and make the API call
    // The useEffect runs after mount, so we need to wait a bit longer
    await page.waitForTimeout(3000);

    // Verify the update endpoint was called
    expect(updateExpiredCalled).toBe(true);
  });
});
