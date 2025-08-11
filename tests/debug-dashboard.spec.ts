import { test, expect } from '@playwright/test';

test.describe('Debug Dashboard Elements', () => {
  test('inspect dashboard structure', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Quick load check with shorter timeout
    await page.waitForSelector('main, [data-testid="dashboard"], body', { timeout: 5000 });
    
    // Log available elements for debugging
    const elements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('[data-testid], [role], button, a, h1, h2, h3, nav, main, header, footer');
      return Array.from(allElements).slice(0, 20).map(el => ({
        tag: el.tagName,
        testid: el.getAttribute('data-testid'),
        role: el.getAttribute('role'),
        text: el.textContent?.slice(0, 50).trim(),
        classes: el.className?.split(' ').slice(0, 3).join(' '),
        id: el.id || null
      }));
    });
    
    console.log('=== Dashboard Page Analysis ===');
    console.log('Current URL:', await page.url());
    console.log('Page Title:', await page.title());
    console.log('Available elements:', JSON.stringify(elements, null, 2));
    
    // Check for notification-related elements
    const notificationElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid*="notification"], [class*="notification"], [id*="notification"]');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        testid: el.getAttribute('data-testid'),
        class: el.className,
        id: el.id,
        text: el.textContent?.slice(0, 30)
      }));
    });
    
    console.log('Notification-related elements:', JSON.stringify(notificationElements, null, 2));
    
    // Basic assertions - just check that the page loads
    await expect(page.locator('body')).toBeVisible();
    
    // Take a screenshot for visual debugging
    await page.screenshot({ path: 'test-results/dashboard-debug.png', fullPage: true });
    
    console.log('Dashboard debug completed - check test-results/dashboard-debug.png for visual reference');
  });
});
