import { Page, APIRequestContext } from '@playwright/test';

export interface TestNotificationType {
  type_key: string;
  name: string;
  description: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  is_active: boolean;
  default_enabled: boolean;
  auto_trigger: boolean;
  template: {
    title: string;
    message: string;
    action_url: string;
  };
}

export interface TestNotification {
  title: string;
  message: string;
  type_key: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  user_id: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
}

export class NotificationTestHelpers {
  constructor(private page: Page, private request: APIRequestContext) {}

  async createNotificationType(notificationType: TestNotificationType) {
    const response = await this.request.post('/api/notification-types', {
      data: notificationType,
    });

    if (response.status() !== 201) {
      throw new Error(
        `Failed to create notification type: ${response.statusText()}`
      );
    }

    return await response.json();
  }

  async createNotification(notification: TestNotification) {
    const response = await this.request.post('/api/notifications', {
      data: notification,
    });

    if (response.status() !== 201) {
      throw new Error(
        `Failed to create notification: ${response.statusText()}`
      );
    }

    return await response.json();
  }

  async getNotifications(userId: string, filters?: Record<string, any>) {
    const queryParams = new URLSearchParams({ user_id: userId });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        queryParams.append(key, value.toString());
      });
    }

    const response = await this.request.get(
      `/api/notifications?${queryParams}`
    );

    if (response.status() !== 200) {
      throw new Error(`Failed to get notifications: ${response.statusText()}`);
    }

    return await response.json();
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.request.put(
      `/api/notifications/${notificationId}/read`
    );

    if (response.status() !== 200) {
      throw new Error(
        `Failed to mark notification as read: ${response.statusText()}`
      );
    }

    return await response.json();
  }

  async markNotificationAsUnread(notificationId: string) {
    const response = await this.request.put(
      `/api/notifications/${notificationId}/unread`
    );

    if (response.status() !== 200) {
      throw new Error(
        `Failed to mark notification as unread: ${response.statusText()}`
      );
    }

    return await response.json();
  }

  async getNotificationStats(userId: string) {
    const response = await this.request.get(
      `/api/notifications/stats?user_id=${userId}`
    );

    if (response.status() !== 200) {
      throw new Error(
        `Failed to get notification stats: ${response.statusText()}`
      );
    }

    return await response.json();
  }

  async getUnreadCount(userId: string) {
    const response = await this.request.get(
      `/api/notifications/unread-count?user_id=${userId}`
    );

    if (response.status() !== 200) {
      throw new Error(`Failed to get unread count: ${response.statusText()}`);
    }

    return await response.json();
  }

  async waitForNotificationCenter() {
    await this.page.waitForSelector('[data-testid="notification-center"]', {
      timeout: 10000,
    });
  }

  async waitForNotificationList() {
    await this.page.waitForSelector('[data-testid="notification-list"]', {
      timeout: 10000,
    });
  }

  async waitForNotificationFilters() {
    await this.page.waitForSelector('[data-testid="notification-filters"]', {
      timeout: 10000,
    });
  }

  async waitForNotificationStats() {
    await this.page.waitForSelector('[data-testid="notification-stats"]', {
      timeout: 10000,
    });
  }

  async getNotificationItems() {
    return this.page.locator('[data-testid="notification-item"]');
  }

  async getUnreadNotificationItems() {
    return this.page
      .locator('[data-testid="notification-item"]')
      .filter({ hasText: 'unread' });
  }

  async getReadNotificationItems() {
    return this.page
      .locator('[data-testid="notification-item"]')
      .filter({ hasText: 'read' });
  }

  async clickNotificationItem(index: number = 0) {
    const items = await this.getNotificationItems();
    await items.nth(index).click();
  }

  async clickUnreadNotification() {
    const unreadItems = await this.getUnreadNotificationItems();
    if ((await unreadItems.count()) > 0) {
      await unreadItems.first().click();
    }
  }

  async filterByPriority(priority: string) {
    const priorityFilter = this.page
      .locator('[data-testid="priority-filter"]')
      .filter({ hasText: priority });
    await priorityFilter.click();
    await this.page.waitForTimeout(1000);
  }

  async filterByType(type: string) {
    const typeFilter = this.page
      .locator('[data-testid="type-filter"]')
      .filter({ hasText: type });
    await typeFilter.click();
    await this.page.waitForTimeout(1000);
  }

  async sortByDate(direction: 'asc' | 'desc' = 'desc') {
    const sortButton = this.page.locator(
      `[data-testid="sort-date-${direction}"]`
    );
    await sortButton.click();
    await this.page.waitForTimeout(1000);
  }

  async getUnreadCountFromUI() {
    const countElement = this.page.locator('[data-testid="unread-count"]');
    const countText = await countElement.textContent();
    return parseInt(countText || '0');
  }

  async getTotalCountFromUI() {
    const countElement = this.page.locator('[data-testid="total-count"]');
    const countText = await countElement.textContent();
    return parseInt(countText || '0');
  }

  async waitForRealTimeUpdate(timeout: number = 2000) {
    await this.page.waitForTimeout(timeout);
  }

  async mockApiResponse(url: string, status: number, body: any) {
    await this.page.route(url, async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
  }

  async mockNotificationsResponse(notifications: any[]) {
    await this.mockApiResponse('/api/notifications', 200, {
      success: true,
      data: notifications,
    });
  }

  async mockErrorResponse(
    url: string,
    errorMessage: string = 'Internal Server Error'
  ) {
    await this.mockApiResponse(url, 500, { error: errorMessage });
  }

  async mockEmptyNotificationsResponse() {
    await this.mockNotificationsResponse([]);
  }

  async cleanupTestData() {
    // Clean up test notifications
    const notifications = await this.getNotifications('test-user-1');
    if (notifications.data && notifications.data.length > 0) {
      for (const notification of notifications.data) {
        await this.request.delete(`/api/notifications/${notification.$id}`);
      }
    }

    // Clean up test notification types
    const response = await this.request.get('/api/notification-types');
    if (response.status() === 200) {
      const types = await response.json();
      if (types.data && types.data.length > 0) {
        for (const type of types.data) {
          if (type.type_key.startsWith('test_')) {
            await this.request.delete(`/api/notification-types/${type.$id}`);
          }
        }
      }
    }
  }
}

export const defaultNotificationTypes: TestNotificationType[] = [
  {
    type_key: 'test_contract_expiry',
    name: 'Test Contract Expiry',
    description: 'Test notifications for contract expiration',
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
    type_key: 'test_document_upload',
    name: 'Test Document Upload',
    description: 'Test notifications for document uploads',
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

export const defaultNotifications: TestNotification[] = [
  {
    title: 'Test Contract Expiring',
    message: 'Contract Test Contract expires on 2024-12-31',
    type_key: 'test_contract_expiry',
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
    type_key: 'test_document_upload',
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
