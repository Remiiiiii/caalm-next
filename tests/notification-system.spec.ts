import { test, expect } from '@playwright/test';

// Test data for notification types
const testNotificationTypes = [
  {
    type_key: 'contract_expiry',
    name: 'Contract Expiry',
    description: 'Notifications for contract expiration',
    icon: 'Calendar',
    priority: 'high',
    category: 'contracts',
    is_active: true,
    default_enabled: true,
    auto_trigger: true,
    template: {
      title: 'Contract Expiring Soon',
      message: 'Contract {contract_name} expires on {expiry_date}',
      action_url: '/contracts/{contract_id}',
    },
  },
  {
    type_key: 'document_upload',
    name: 'Document Upload',
    description: 'Notifications for document uploads',
    icon: 'FileText',
    priority: 'medium',
    category: 'documents',
    is_active: true,
    default_enabled: true,
    auto_trigger: true,
    template: {
      title: 'New Document Uploaded',
      message: 'Document {document_name} has been uploaded',
      action_url: '/documents/{document_id}',
    },
  },
];

// Test data for notifications
const testNotifications = [
  {
    title: 'Test Contract Expiring',
    message: 'Contract Test Contract expires on 2024-12-31',
    type_key: 'contract_expiry',
    priority: 'high',
    user_id: 'test-user-1',
    is_read: false,
    action_url: '/contracts/test-contract-1',
    metadata: {
      contract_id: 'test-contract-1',
      contract_name: 'Test Contract',
      expiry_date: '2024-12-31',
    },
  },
  {
    title: 'Test Document Uploaded',
    message: 'Document Test Document has been uploaded',
    type_key: 'document_upload',
    priority: 'medium',
    user_id: 'test-user-1',
    is_read: true,
    action_url: '/documents/test-document-1',
    metadata: {
      document_id: 'test-document-1',
      document_name: 'Test Document',
    },
  },
];

test.describe('Notification System Enhancement', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('API Endpoints', () => {
    test('should create notification types', async ({ request }) => {
      for (const notificationType of testNotificationTypes) {
        const response = await request.post('/api/notification-types', {
          data: notificationType,
        });

        expect(response.status()).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.type_key).toBe(notificationType.type_key);
      }
    });

    test('should fetch notification types', async ({ request }) => {
      const response = await request.get('/api/notification-types');

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    test('should create notifications', async ({ request }) => {
      for (const notification of testNotifications) {
        const response = await request.post('/api/notifications', {
          data: notification,
        });

        expect(response.status()).toBe(201);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.title).toBe(notification.title);
      }
    });

    test('should fetch notifications with filters', async ({ request }) => {
      const response = await request.get(
        '/api/notifications?user_id=test-user-1&priority=high&is_read=false'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);

      // Verify filters are applied
      data.data.forEach((notification: any) => {
        expect(notification.user_id).toBe('test-user-1');
        expect(notification.priority).toBe('high');
        expect(notification.is_read).toBe(false);
      });
    });

    test('should mark notification as read', async ({ request }) => {
      // First create a notification
      const createResponse = await request.post('/api/notifications', {
        data: testNotifications[0],
      });
      const createdNotification = await createResponse.json();

      // Mark as read
      const readResponse = await request.put(
        `/api/notifications/${createdNotification.data.$id}/read`
      );

      expect(readResponse.status()).toBe(200);
      const data = await readResponse.json();
      expect(data.success).toBe(true);
      expect(data.data.is_read).toBe(true);
    });

    test('should mark notification as unread', async ({ request }) => {
      // First create a notification
      const createResponse = await request.post('/api/notifications', {
        data: { ...testNotifications[0], is_read: true },
      });
      const createdNotification = await createResponse.json();

      // Mark as unread
      const unreadResponse = await request.put(
        `/api/notifications/${createdNotification.data.$id}/unread`
      );

      expect(unreadResponse.status()).toBe(200);
      const data = await unreadResponse.json();
      expect(data.success).toBe(true);
      expect(data.data.is_read).toBe(false);
    });

    test('should get notification statistics', async ({ request }) => {
      const response = await request.get(
        '/api/notifications/stats?user_id=test-user-1'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('read');
      expect(data.data).toHaveProperty('unread');
      expect(data.data).toHaveProperty('byPriority');
      expect(data.data).toHaveProperty('byType');
    });

    test('should get unread count', async ({ request }) => {
      const response = await request.get(
        '/api/notifications/unread-count?user_id=test-user-1'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.data.count).toBe('number');
      expect(data.data.count).toBeGreaterThanOrEqual(0);
    });

    test('should get recent notifications', async ({ request }) => {
      const response = await request.get(
        '/api/notifications/recent?user_id=test-user-1&limit=5'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });
  });

  test.describe('NotificationCenter Component', () => {
    test('should display notification center', async ({ page }) => {
      // Navigate to a page that includes the NotificationCenter
      await page.goto('/dashboard');

      // Wait for the notification center to be visible
      await page.waitForSelector('[data-testid="notification-center"]', {
        timeout: 10000,
      });

      // Verify the notification center is displayed
      const notificationCenter = page.locator(
        '[data-testid="notification-center"]'
      );
      await expect(notificationCenter).toBeVisible();
    });

    test('should display notification list', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for notifications to load
      await page.waitForSelector('[data-testid="notification-list"]', {
        timeout: 10000,
      });

      const notificationList = page.locator(
        '[data-testid="notification-list"]'
      );
      await expect(notificationList).toBeVisible();
    });

    test('should display notification filters', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for filters to be visible
      await page.waitForSelector('[data-testid="notification-filters"]', {
        timeout: 10000,
      });

      const filters = page.locator('[data-testid="notification-filters"]');
      await expect(filters).toBeVisible();

      // Check for priority filter
      const priorityFilter = page.locator('[data-testid="priority-filter"]');
      await expect(priorityFilter).toBeVisible();

      // Check for type filter
      const typeFilter = page.locator('[data-testid="type-filter"]');
      await expect(typeFilter).toBeVisible();
    });

    test('should display notification statistics', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for stats to be visible
      await page.waitForSelector('[data-testid="notification-stats"]', {
        timeout: 10000,
      });

      const stats = page.locator('[data-testid="notification-stats"]');
      await expect(stats).toBeVisible();

      // Check for total count
      const totalCount = page.locator('[data-testid="total-count"]');
      await expect(totalCount).toBeVisible();

      // Check for unread count
      const unreadCount = page.locator('[data-testid="unread-count"]');
      await expect(unreadCount).toBeVisible();
    });
  });

  test.describe('Notification Interactions', () => {
    test('should mark notification as read when clicked', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for notifications to load
      await page.waitForSelector('[data-testid="notification-item"]', {
        timeout: 10000,
      });

      // Find an unread notification
      const unreadNotification = page
        .locator('[data-testid="notification-item"]')
        .filter({ hasText: 'unread' })
        .first();

      if ((await unreadNotification.count()) > 0) {
        // Click on the notification
        await unreadNotification.click();

        // Wait for the notification to be marked as read
        await page.waitForTimeout(1000);

        // Verify the notification is now marked as read
        await expect(unreadNotification).toHaveAttribute('data-read', 'true');
      }
    });

    test('should filter notifications by priority', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for filters to load
      await page.waitForSelector('[data-testid="priority-filter"]', {
        timeout: 10000,
      });

      // Click on high priority filter
      const highPriorityFilter = page
        .locator('[data-testid="priority-filter"]')
        .filter({ hasText: 'High' });
      await highPriorityFilter.click();

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify only high priority notifications are shown
      const notificationItems = page.locator(
        '[data-testid="notification-item"]'
      );
      const count = await notificationItems.count();

      for (let i = 0; i < count; i++) {
        const item = notificationItems.nth(i);
        await expect(item).toHaveAttribute('data-priority', 'high');
      }
    });

    test('should sort notifications by date', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for sort controls to load
      await page.waitForSelector('[data-testid="sort-controls"]', {
        timeout: 10000,
      });

      // Click on date sort (newest first)
      const dateSort = page.locator('[data-testid="sort-date-desc"]');
      await dateSort.click();

      // Wait for sorted results
      await page.waitForTimeout(1000);

      // Verify notifications are sorted by date (newest first)
      const notificationItems = page.locator(
        '[data-testid="notification-item"]'
      );
      const count = await notificationItems.count();

      if (count > 1) {
        const firstDate = await notificationItems
          .first()
          .getAttribute('data-date');
        const secondDate = await notificationItems
          .nth(1)
          .getAttribute('data-date');

        expect(new Date(firstDate!).getTime()).toBeGreaterThanOrEqual(
          new Date(secondDate!).getTime()
        );
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update notification count in real-time', async ({
      page,
      request,
    }) => {
      await page.goto('/dashboard');

      // Wait for initial load
      await page.waitForSelector('[data-testid="unread-count"]', {
        timeout: 10000,
      });

      // Get initial unread count
      const initialCountElement = page.locator('[data-testid="unread-count"]');
      const initialCount = await initialCountElement.textContent();
      const initialCountNum = parseInt(initialCount || '0');

      // Create a new notification via API
      const response = await request.post('/api/notifications', {
        data: {
          ...testNotifications[0],
          title: 'Real-time Test Notification',
          created_at: new Date().toISOString(),
        },
      });

      expect(response.status()).toBe(201);

      // Wait for the count to update (SWR should revalidate)
      await page.waitForTimeout(2000);

      // Check if the count has increased
      const newCountElement = page.locator('[data-testid="unread-count"]');
      const newCount = await newCountElement.textContent();
      const newCountNum = parseInt(newCount || '0');

      expect(newCountNum).toBeGreaterThanOrEqual(initialCountNum);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock a failed API response
      await page.route('/api/notifications', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/dashboard');

      // Wait for error state
      await page.waitForSelector('[data-testid="error-message"]', {
        timeout: 10000,
      });

      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Error');
    });

    test('should handle empty notification list', async ({ page }) => {
      // Mock empty notifications response
      await page.route('/api/notifications', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      });

      await page.goto('/dashboard');

      // Wait for empty state
      await page.waitForSelector('[data-testid="empty-state"]', {
        timeout: 10000,
      });

      const emptyState = page.locator('[data-testid="empty-state"]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('No notifications');
    });
  });

  test.describe('Performance', () => {
    test('should load notifications efficiently', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');

      // Wait for notifications to load
      await page.waitForSelector('[data-testid="notification-list"]', {
        timeout: 10000,
      });

      const loadTime = Date.now() - startTime;

      // Verify load time is reasonable (less than 5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large notification lists', async ({
      page,
      request,
    }) => {
      // Create multiple notifications
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request.post('/api/notifications', {
            data: {
              ...testNotifications[0],
              title: `Bulk Test Notification ${i}`,
              created_at: new Date().toISOString(),
            },
          })
        );
      }

      await Promise.all(promises);

      // Navigate to dashboard
      await page.goto('/dashboard');

      // Wait for notifications to load
      await page.waitForSelector('[data-testid="notification-list"]', {
        timeout: 15000,
      });

      // Verify pagination is working
      const pagination = page.locator('[data-testid="pagination"]');
      await expect(pagination).toBeVisible();
    });
  });
});
