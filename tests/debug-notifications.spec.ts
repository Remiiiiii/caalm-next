import { test, expect } from '@playwright/test';

test.describe('Debug Notification System', () => {
  test('inspect dashboard page structure', async ({ page }) => {
    console.log('=== Starting Dashboard Debug ===');

    // Navigate to dashboard
    await page.goto('/dashboard');
    console.log('Navigated to:', await page.url());

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    console.log('Page loaded');

    // Check if we're redirected (authentication issue)
    const currentUrl = await page.url();
    if (currentUrl.includes('/sign-in') || currentUrl.includes('/login')) {
      console.log('⚠️ REDIRECTED TO AUTH PAGE - Authentication required');
      return;
    }

    // Log page title
    const title = await page.title();
    console.log('Page Title:', title);

    // Find all interactive elements
    const elements = await page.evaluate(() => {
      const selectors = [
        '[data-testid]',
        '[role]',
        'button',
        'a',
        'input',
        'select',
        'nav',
        'main',
        'header',
        'footer',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
      ];

      const allElements = [];
      selectors.forEach((selector) => {
        const found = document.querySelectorAll(selector);
        found.forEach((el) => {
          allElements.push({
            tag: el.tagName,
            selector: selector,
            testid: el.getAttribute('data-testid'),
            role: el.getAttribute('role'),
            text: el.textContent?.slice(0, 50).trim(),
            classes: el.className?.split(' ').slice(0, 3).join(' '),
            id: el.id || null,
            href: el.getAttribute('href'),
            type: el.getAttribute('type'),
          });
        });
      });

      return allElements.slice(0, 30); // Limit to first 30
    });

    console.log('Found elements:', JSON.stringify(elements, null, 2));

    // Look specifically for notification-related elements
    const notificationElements = await page.evaluate(() => {
      const selectors = [
        '[data-testid*="notification"]',
        '[class*="notification"]',
        '[id*="notification"]',
        '[data-testid*="notif"]',
        '[class*="notif"]',
        '[id*="notif"]',
      ];

      const found = [];
      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          found.push({
            tag: el.tagName,
            selector: selector,
            testid: el.getAttribute('data-testid'),
            class: el.className,
            id: el.id,
            text: el.textContent?.slice(0, 30),
          });
        });
      });

      return found;
    });

    console.log(
      'Notification-related elements:',
      JSON.stringify(notificationElements, null, 2)
    );

    // Check for common dashboard elements
    const dashboardElements = await page.evaluate(() => {
      const checks = {
        hasMain: !!document.querySelector('main'),
        hasNav: !!document.querySelector('nav'),
        hasHeader: !!document.querySelector('header'),
        hasFooter: !!document.querySelector('footer'),
        hasSidebar: !!document.querySelector(
          '[class*="sidebar"], [class*="side-bar"], [data-testid*="sidebar"]'
        ),
        hasContent: !!document.querySelector(
          '[class*="content"], [class*="main-content"], [data-testid*="content"]'
        ),
        hasCards: !!document.querySelector(
          '[class*="card"], [class*="grid"], [class*="dashboard"]'
        ),
        hasButtons: document.querySelectorAll('button').length,
        hasLinks: document.querySelectorAll('a').length,
        hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      };

      return checks;
    });

    console.log(
      'Dashboard structure check:',
      JSON.stringify(dashboardElements, null, 2)
    );

    // Take a screenshot
    await page.screenshot({
      path: 'test-results/debug-dashboard.png',
      fullPage: true,
    });
    console.log('Screenshot saved to test-results/debug-dashboard.png');
  });

  test('inspect API endpoints', async ({ request }) => {
    console.log('=== Starting API Debug ===');

    const endpoints = [
      '/api/notifications',
      '/api/notification-types',
      '/api/notifications/stats',
      '/api/notifications/unread-count',
      '/api/notifications/recent',
      '/api/dashboard/stats',
      '/api/dashboard/invitations',
      '/api/dashboard/files',
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        const response = await request.get(endpoint);
        console.log(`  Status: ${response.status()}`);

        if (response.status() === 200) {
          try {
            const data = await response.json();
            console.log(`  Response: ${JSON.stringify(data).slice(0, 200)}...`);
          } catch (e) {
            console.log(`  Response: Not JSON`);
          }
        } else if (response.status() === 401) {
          console.log(`  Response: Unauthorized (authentication required)`);
        } else if (response.status() === 404) {
          console.log(`  Response: Not found`);
        } else {
          console.log(
            `  Response: ${response.status()} - ${response.statusText()}`
          );
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
  });

  test('inspect sign-in page structure', async ({ page }) => {
    console.log('=== Starting Sign-in Page Debug ===');

    await page.goto('/sign-in');
    console.log('Navigated to:', await page.url());

    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });

    const title = await page.title();
    console.log('Page Title:', title);

    // Check for form elements
    const formElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, button, form, label');
      return Array.from(elements).map((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        text: el.textContent?.slice(0, 30),
        testid: el.getAttribute('data-testid'),
      }));
    });

    console.log('Form elements:', JSON.stringify(formElements, null, 2));

    // Check for authentication flow
    const authElements = await page.evaluate(() => {
      return {
        hasEmailInput: !!document.querySelector(
          'input[type="email"], input[placeholder*="email"], input[name*="email"]'
        ),
        hasPasswordInput: !!document.querySelector(
          'input[type="password"], input[placeholder*="password"], input[name*="password"]'
        ),
        hasSubmitButton: !!document.querySelector(
          'button[type="submit"], input[type="submit"]'
        ),
        hasOTPModal: !!document.querySelector(
          '[class*="otp"], [class*="modal"], [data-testid*="otp"]'
        ),
        hasErrorMessages: !!document.querySelector(
          '[class*="error"], [class*="alert"], [role="alert"]'
        ),
      };
    });

    console.log(
      'Authentication elements:',
      JSON.stringify(authElements, null, 2)
    );

    await page.screenshot({
      path: 'test-results/debug-signin.png',
      fullPage: true,
    });
    console.log('Screenshot saved to test-results/debug-signin.png');
  });

  test('test navigation flow', async ({ page }) => {
    console.log('=== Starting Navigation Debug ===');

    // Start from home page
    await page.goto('/');
    console.log('Home page URL:', await page.url());
    console.log('Home page title:', await page.title());

    // Check for navigation links
    const navLinks = await page.evaluate(() => {
      const links = document.querySelectorAll(
        'a[href], nav a, [role="navigation"] a'
      );
      return Array.from(links).map((link) => ({
        text: link.textContent?.slice(0, 30),
        href: link.getAttribute('href'),
        testid: link.getAttribute('data-testid'),
      }));
    });

    console.log('Navigation links:', JSON.stringify(navLinks, null, 2));

    // Try to find dashboard link
    const dashboardLink = navLinks.find(
      (link) =>
        link.href?.includes('dashboard') ||
        link.text?.toLowerCase().includes('dashboard')
    );

    if (dashboardLink) {
      console.log('Found dashboard link:', dashboardLink);
      await page.click(`a[href="${dashboardLink.href}"]`);
      console.log('Clicked dashboard link, new URL:', await page.url());
    } else {
      console.log('No dashboard link found in navigation');
    }

    await page.screenshot({
      path: 'test-results/debug-navigation.png',
      fullPage: true,
    });
  });
});
