export async function mockNotificationAPIs(page) {
  // Mock notification types endpoint (this one actually works)
  await page.route('**/api/notification-types', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            type_key: 'info',
            label: 'Information',
            icon: 'Info',
            color_classes: 'bg-gray-100 text-gray-800',
            bg_color_classes: 'bg-gray-50/30 border-gray-400',
            priority: 'low',
            enabled: true,
            description: 'General information notifications',
          },
          {
            type_key: 'warning',
            label: 'Warning',
            icon: 'AlertTriangle',
            color_classes: 'bg-yellow-100 text-yellow-800',
            bg_color_classes: 'bg-yellow-50/30 border-yellow-400',
            priority: 'medium',
            enabled: true,
            description: 'Warning notifications',
          },
          {
            type_key: 'error',
            label: 'Error',
            icon: 'XCircle',
            color_classes: 'bg-red-100 text-red-800',
            bg_color_classes: 'bg-red-50/30 border-red-400',
            priority: 'high',
            enabled: true,
            description: 'Error notifications',
          },
        ],
      }),
    });
  });

  // Mock notifications endpoint with proper user_id parameter
  await page.route('**/api/notifications**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    // Check if user_id is provided (required parameter)
    const userId = url.searchParams.get('user_id');
    if (!userId && method === 'GET') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Missing required parameter: user_id',
          message: 'user_id is required for notifications endpoint',
        }),
      });
      return;
    }

    if (method === 'GET') {
      const mockNotifications = [
        {
          $id: '1',
          userId: userId || 'test-user-1',
          title: 'Test Notification',
          message: 'This is a test message',
          type: 'info',
          priority: 'medium',
          isRead: false,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
        },
        {
          $id: '2',
          userId: userId || 'test-user-1',
          title: 'Warning Notification',
          message: 'This is a warning message',
          type: 'warning',
          priority: 'high',
          isRead: true,
          $createdAt: new Date(Date.now() - 86400000).toISOString(),
          $updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ notifications: mockNotifications, total: 2 }),
      });
    } else if (method === 'POST') {
      const postData = route.request().postData();
      const body = postData ? JSON.parse(postData) : {};

      // Validate required fields
      if (!body.userId) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Missing required field: userId',
            message: 'userId is required for creating notifications',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          $id: Date.now().toString(),
          ...body,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
        }),
      });
    } else if (method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });

  // Mock statistics endpoint with user_id parameter
  await page.route('**/api/notifications/stats', async (route) => {
    const url = new URL(route.request().url());
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Missing required parameter: user_id',
          message: 'user_id is required for stats endpoint',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: 10,
        unread: 3,
        read: 7,
        byType: { info: 5, warning: 3, error: 2 },
        byPriority: { urgent: 1, high: 3, medium: 4, low: 2 },
      }),
    });
  });

  // Mock unread count endpoint with user_id parameter
  await page.route('**/api/notifications/unread-count', async (route) => {
    const url = new URL(route.request().url());
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Missing required parameter: user_id',
          message: 'user_id is required for unread count endpoint',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 3 }),
    });
  });

  // Mock recent notifications endpoint with user_id parameter
  await page.route('**/api/notifications/recent**', async (route) => {
    const url = new URL(route.request().url());
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Missing required parameter: user_id',
          message: 'user_id is required for recent notifications endpoint',
        }),
      });
      return;
    }

    const mockRecentNotifications = [
      {
        $id: '1',
        userId: userId,
        title: 'Recent Notification 1',
        message: 'This is a recent notification',
        type: 'info',
        priority: 'medium',
        isRead: false,
        $createdAt: new Date().toISOString(),
      },
      {
        $id: '2',
        userId: userId,
        title: 'Recent Notification 2',
        message: 'Another recent notification',
        type: 'warning',
        priority: 'high',
        isRead: false,
        $createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        notifications: mockRecentNotifications,
        total: 2,
      }),
    });
  });

  // Mock dashboard endpoints that require orgId
  await page.route('**/api/dashboard/stats', async (route) => {
    const url = new URL(route.request().url());
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Missing required parameter: orgId',
          message: 'orgId is required for dashboard stats',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalContracts: 15,
        activeContracts: 8,
        pendingContracts: 3,
        completedContracts: 4,
        totalRevenue: 125000,
        monthlyGrowth: 12.5,
      }),
    });
  });

  await page.route('**/api/dashboard/invitations', async (route) => {
    const url = new URL(route.request().url());
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Missing required parameter: orgId',
          message: 'orgId is required for dashboard invitations',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: '1',
            email: 'user1@example.com',
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            email: 'user2@example.com',
            status: 'accepted',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
      }),
    });
  });
}

export async function mockLargeNotificationDataset(page) {
  await page.route('**/api/notifications**', async (route) => {
    const url = new URL(route.request().url());
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Missing required parameter: user_id',
          message: 'user_id is required for notifications endpoint',
        }),
      });
      return;
    }

    const largeNotificationList = Array.from({ length: 100 }, (_, i) => ({
      $id: (i + 1).toString(),
      userId: userId,
      title: `Notification ${i + 1}`,
      message: `Message ${i + 1}`,
      type: 'info',
      priority: 'medium',
      isRead: i % 2 === 0,
      $createdAt: new Date(Date.now() - i * 60000).toISOString(),
      $updatedAt: new Date(Date.now() - i * 60000).toISOString(),
    }));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        notifications: largeNotificationList,
        total: 100,
      }),
    });
  });
}

export async function mockErrorResponses(page) {
  // Mock API errors for error handling tests
  await page.route('**/api/notifications**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Something went wrong',
      }),
    });
  });
}
