import { test, expect } from '@playwright/test';
import { mockNotificationAPIs } from './helpers/api-mocks.js';

test.describe('Notification System API Tests (Working Endpoints Only)', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mocks before each test
    await mockNotificationAPIs(page);
  });

  test.describe('Working API Endpoints', () => {
    test('should fetch notification types successfully', async ({
      request,
    }) => {
      const response = await request.get('/api/notification-types');

      expect(response.status()).toBe(200);
      const data = await response.json();

      // Check the actual structure returned by the real API
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      // Check the structure of notification types
      const firstType = data.data[0];
      expect(firstType).toHaveProperty('type_key');
      expect(firstType).toHaveProperty('label');
      expect(firstType).toHaveProperty('icon');
      expect(firstType).toHaveProperty('priority');
      expect(firstType).toHaveProperty('enabled');

      console.log('✅ Notification types endpoint working correctly');
      console.log(
        'Sample notification type:',
        JSON.stringify(firstType, null, 2)
      );
    });

    test('should fetch dashboard files successfully', async ({ request }) => {
      const response = await request.get('/api/dashboard/files?limit=10');

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      console.log('✅ Dashboard files endpoint working correctly');
      console.log('Files count:', data.data.length);
    });
  });

  test.describe('API Endpoints with Required Parameters', () => {
    test('should handle notifications endpoint with user_id parameter', async ({
      request,
    }) => {
      // Test with user_id parameter (should work)
      const response = await request.get(
        '/api/notifications?user_id=test-user-123'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.notifications)).toBe(true);

      console.log('✅ Notifications endpoint works with user_id parameter');
    });

    test('should handle notifications endpoint without user_id parameter (should fail)', async ({
      request,
    }) => {
      // Test without user_id parameter (should fail with 400)
      const response = await request.get('/api/notifications');

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('user_id is required');

      console.log(
        '✅ Notifications endpoint correctly validates user_id parameter'
      );
    });

    test('should handle stats endpoint with user_id parameter', async ({
      request,
    }) => {
      const response = await request.get(
        '/api/notifications/stats?user_id=test-user-123'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('unread');
      expect(data).toHaveProperty('read');
      expect(data).toHaveProperty('byType');
      expect(data).toHaveProperty('byPriority');

      console.log('✅ Stats endpoint works with user_id parameter');
    });

    test('should handle unread count endpoint with user_id parameter', async ({
      request,
    }) => {
      const response = await request.get(
        '/api/notifications/unread-count?user_id=test-user-123'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('count');
      expect(typeof data.count).toBe('number');

      console.log('✅ Unread count endpoint works with user_id parameter');
    });

    test('should handle recent notifications endpoint with user_id parameter', async ({
      request,
    }) => {
      const response = await request.get(
        '/api/notifications/recent?user_id=test-user-123&limit=5'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.notifications)).toBe(true);

      console.log(
        '✅ Recent notifications endpoint works with user_id parameter'
      );
    });

    test('should handle dashboard stats with orgId parameter', async ({
      request,
    }) => {
      const response = await request.get(
        '/api/dashboard/stats?orgId=default_organization'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('totalContracts');
      expect(data).toHaveProperty('activeContracts');
      expect(data).toHaveProperty('pendingContracts');
      expect(data).toHaveProperty('completedContracts');
      expect(data).toHaveProperty('totalRevenue');
      expect(data).toHaveProperty('monthlyGrowth');

      console.log('✅ Dashboard stats endpoint works with orgId parameter');
    });

    test('should handle dashboard invitations with orgId parameter', async ({
      request,
    }) => {
      const response = await request.get(
        '/api/dashboard/invitations?orgId=default_organization'
      );

      expect(response.status()).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);

      if (data.data.length > 0) {
        const firstInvitation = data.data[0];
        expect(firstInvitation).toHaveProperty('id');
        expect(firstInvitation).toHaveProperty('email');
        expect(firstInvitation).toHaveProperty('status');
        expect(firstInvitation).toHaveProperty('createdAt');
      }

      console.log(
        '✅ Dashboard invitations endpoint works with orgId parameter'
      );
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle missing user_id parameter gracefully', async ({
      request,
    }) => {
      const endpoints = [
        '/api/notifications',
        '/api/notifications/stats',
        '/api/notifications/unread-count',
        '/api/notifications/recent',
      ];

      for (const endpoint of endpoints) {
        const response = await request.get(endpoint);
        expect(response.status()).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('message');
        expect(data.message).toContain('user_id is required');
      }

      console.log(
        '✅ All notification endpoints properly validate user_id parameter'
      );
    });

    test('should handle missing orgId parameter gracefully', async ({
      request,
    }) => {
      const endpoints = ['/api/dashboard/stats', '/api/dashboard/invitations'];

      for (const endpoint of endpoints) {
        const response = await request.get(endpoint);
        expect(response.status()).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('message');
        expect(data.message).toContain('orgId is required');
      }

      console.log(
        '✅ All dashboard endpoints properly validate orgId parameter'
      );
    });
  });

  test.describe('Performance Tests', () => {
    test('should respond quickly to API requests', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get('/api/notification-types');

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond in under 2 seconds
      expect(response.status()).toBe(200);

      console.log(`✅ API response time: ${responseTime}ms`);
    });

    test('should handle multiple concurrent requests', async ({ request }) => {
      const promises = [];

      // Make 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(request.get('/api/notification-types'));
      }

      const responses = await Promise.all(promises);

      for (const response of responses) {
        expect(response.status()).toBe(200);
      }

      console.log('✅ API handles concurrent requests successfully');
    });
  });
});
