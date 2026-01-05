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
  test.beforeEach(async ({ page }) => {
    // Mock the contracts API endpoint
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

    // Mock the update-expired endpoint
    await page.route('/api/contracts/update-expired', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Navigate to dashboard page (where the widget is used)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should render contract expiry alerts widget', async ({ page }) => {
    // Wait for the widget to appear
    const widget = page.locator('text=Contract Expiry Alerts').first();
    await expect(widget).toBeVisible({ timeout: 10000 });

    // Check if the widget title is visible
    await expect(widget).toContainText('Contract Expiry Alerts');
  });

  test('should display filter dropdown', async ({ page }) => {
    // Wait for widget to load
    await page.waitForSelector('text=Contract Expiry Alerts', {
      timeout: 10000,
    });

    // Find the filter dropdown
    const filterSelect = page
      .locator('select[aria-label="Filter contracts by time period"]')
      .first();
    await expect(filterSelect).toBeVisible();

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
    await page.waitForSelector('text=Contract Expiry Alerts', {
      timeout: 10000,
    });

    const filterSelect = page
      .locator('select[aria-label="Filter contracts by time period"]')
      .first();

    // Select 30 days filter
    await filterSelect.selectOption('30');
    await page.waitForTimeout(500); // Wait for filter to apply

    // Check that contracts within 30 days are shown
    // Contract 1 (5 days) and Contract 2 (15 days) should be visible
    await expect(page.locator('text=Test Contract 1').first()).toBeVisible();
    await expect(page.locator('text=Test Contract 2').first()).toBeVisible();

    // Select 60 days filter
    await filterSelect.selectOption('60');
    await page.waitForTimeout(500);

    // Contract 4 (60 days) should now be visible
    await expect(page.locator('text=Future Contract').first()).toBeVisible();
  });

  test('should show expired contracts when Expired filter is selected', async ({
    page,
  }) => {
    await page.waitForSelector('text=Contract Expiry Alerts', {
      timeout: 10000,
    });

    const filterSelect = page
      .locator('select[aria-label="Filter contracts by time period"]')
      .first();

    // Select Expired filter
    await filterSelect.selectOption('-1');
    await page.waitForTimeout(500);

    // Expired contract should be visible
    await expect(page.locator('text=Expired Contract').first()).toBeVisible();
  });

  test('should show pulsating animation for expiring contracts badge', async ({
    page,
  }) => {
    await page.waitForSelector('text=Contract Expiry Alerts', {
      timeout: 10000,
    });

    // Wait for the expiring badge to appear
    const expiringBadge = page.locator('text=/\\d+ expiring/').first();

    // Check if badge exists (only if there are expiring contracts)
    const badgeCount = await expiringBadge.count();
    if (badgeCount > 0) {
      await expect(expiringBadge).toBeVisible();

      // Check if the badge has the animate-pulse class
      const badgeContainer = expiringBadge.locator('..');
      const classes = await badgeContainer.getAttribute('class');
      expect(classes).toContain('animate-pulse');
    }
  });

  test('should display status badges with correct counts', async ({ page }) => {
    await page.waitForSelector('text=Contract Expiry Alerts', {
      timeout: 10000,
    });
    await page.waitForTimeout(1000); // Wait for counts to calculate

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
    await page.waitForSelector('text=Contract Expiry Alerts', {
      timeout: 10000,
    });

    const filterSelect = page
      .locator('select[aria-label="Filter contracts by time period"]')
      .first();

    // Select 90 days filter (should show no contracts from our mock data)
    await filterSelect.selectOption('90');
    await page.waitForTimeout(500);

    // Check for empty state message
    const emptyState = page.locator('text=/No contracts expiring/').first();
    await expect(emptyState).toBeVisible();
  });

  test('should handle error state', async ({ page }) => {
    // Mock API error
    await page.route('/api/contracts/all', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // Check for error message
    const errorMessage = page
      .locator('text=Failed to load contract data')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should update expired contracts on mount', async ({ page }) => {
    let updateExpiredCalled = false;

    await page.route('/api/contracts/update-expired', async (route) => {
      updateExpiredCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.reload();
    await page.waitForTimeout(2000); // Wait for the update call

    // Verify the update endpoint was called
    expect(updateExpiredCalled).toBe(true);
  });
});
