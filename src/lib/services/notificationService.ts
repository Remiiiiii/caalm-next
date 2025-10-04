import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import {
  Notification,
  NotificationType,
  NotificationStats,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationFilters,
  NotificationSort,
  NotificationsResponse,
  NotificationSettingsDoc,
  UpsertNotificationSettingsRequest,
} from '@/types/notifications';
import { Query } from 'appwrite';
import { tablesDB } from '../appwrite/client';

// Lazy import to avoid initialization errors when messaging service is not configured
let appwriteMessagingService: any = null;

async function getAppwriteMessagingService() {
  if (!appwriteMessagingService) {
    const { appwriteMessagingService: service } = await import(
      './appwriteMessagingService'
    );
    appwriteMessagingService = service;
  }
  return appwriteMessagingService;
}

class NotificationService {
  private async getClient() {
    return await createAdminClient();
  }

  // Notification Types Management
  async getNotificationTypes(): Promise<NotificationType[]> {
    try {
      const { tablesDB } = await this.getClient();
      const response = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId:
          appwriteConfig.notificationTypesCollectionId || 'notification-types',
        queries: [Query.equal('enabled', true), Query.orderDesc('$createdAt')],
      });
      return response.rows as unknown as NotificationType[];
    } catch (error) {
      console.error('Failed to fetch notification types:', error);
      throw new Error('Failed to fetch notification types');
    }
  }

  async getNotificationType(typeKey: string): Promise<NotificationType | null> {
    try {
      const { tablesDB } = await this.getClient();
      const response = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId:
          appwriteConfig.notificationTypesCollectionId || 'notification-types',
        queries: [
          Query.equal('type_key', typeKey),
          Query.equal('enabled', true),
        ],
      });
      return (response.rows[0] as unknown as NotificationType) || null;
    } catch (error) {
      console.error('Failed to fetch notification type:', error);
      throw new Error('Failed to fetch notification type');
    }
  }

  async createNotificationType(
    type: Omit<NotificationType, '$id' | '$createdAt' | '$updatedAt'>
  ): Promise<NotificationType> {
    try {
      const response = await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId:
          appwriteConfig.notificationTypesCollectionId || 'notification-types',
        rowId: 'unique()',
        data: type,
      });
      return response as unknown as NotificationType;
    } catch (error) {
      console.error('Failed to create notification type:', error);
      throw new Error('Failed to create notification type');
    }
  }

  async updateNotificationType(
    id: string,
    updates: Partial<
      Omit<NotificationType, '$id' | '$createdAt' | '$updatedAt'>
    >
  ): Promise<NotificationType> {
    try {
      const response = await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        collectionId:
          appwriteConfig.notificationTypesCollectionId || 'notification-types',
        documentId: id,
        data: updates,
      });
      return response as unknown as NotificationType;
    } catch (error) {
      console.error('Failed to update notification type:', error);
      throw new Error('Failed to update notification type');
    }
  }

  async deleteNotificationType(id: string): Promise<void> {
    try {
      await tablesDB.deleteRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId:
          appwriteConfig.notificationTypesCollectionId || 'notification-types',
        rowId: id,
      });
    } catch (error) {
      console.error('Failed to delete notification type:', error);
      throw new Error('Failed to delete notification type');
    }
  }

  // Notifications Management
  async getNotifications(
    userId: string,
    filters?: NotificationFilters,
    sort?: NotificationSort,
    page: number = 1,
    limit: number = 20
  ): Promise<NotificationsResponse> {
    try {
      const queries = [Query.equal('userId', userId)];

      // Apply filters
      if (filters?.search) {
        queries.push(Query.search('title', filters.search));
        queries.push(Query.search('message', filters.search));
      }

      if (filters?.type && filters.type !== 'all') {
        queries.push(Query.equal('type', filters.type));
      }

      if (filters?.status && filters.status !== 'all') {
        queries.push(Query.equal('read', filters.status === 'read'));
      }

      if (filters?.priority && filters.priority !== 'all') {
        queries.push(Query.equal('priority', filters.priority));
      }

      if (filters?.dateRange) {
        queries.push(
          Query.greaterThanEqual(
            '$createdAt',
            filters.dateRange.start.toISOString()
          )
        );
        queries.push(
          Query.lessThanEqual('$createdAt', filters.dateRange.end.toISOString())
        );
      }

      // Apply sorting
      const sortField = sort?.field || 'date';
      const sortDirection = sort?.direction || 'desc';

      if (sortField === 'date') {
        queries.push(
          sortDirection === 'desc'
            ? Query.orderDesc('$createdAt')
            : Query.orderAsc('$createdAt')
        );
      } else if (sortField === 'priority') {
        queries.push(
          sortDirection === 'desc'
            ? Query.orderDesc('priority')
            : Query.orderAsc('priority')
        );
      } else if (sortField === 'type') {
        queries.push(
          sortDirection === 'desc'
            ? Query.orderDesc('type')
            : Query.orderAsc('type')
        );
      } else if (sortField === 'title') {
        queries.push(
          sortDirection === 'desc'
            ? Query.orderDesc('title')
            : Query.orderAsc('title')
        );
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      queries.push(Query.limit(limit));
      queries.push(Query.offset(offset));

      const response = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries,
      });

      return {
        data: response.rows as unknown as Notification[],
        total: response.total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  async getNotification(id: string): Promise<Notification> {
    try {
      const response = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: id,
      });
      return response as unknown as Notification;
    } catch (error) {
      console.error('Failed to fetch notification:', error);
      throw new Error('Failed to fetch notification');
    }
  }

  async createNotification(
    notification: CreateNotificationRequest
  ): Promise<Notification> {
    try {
      // Validate notification type exists and is enabled
      const notificationType = await this.getNotificationType(
        notification.type
      );
      if (!notificationType) {
        throw new Error(
          `Notification type '${notification.type}' not found or disabled`
        );
      }

      const notificationData = {
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        priority: notification.priority || notificationType.priority,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        metadata: notification.metadata
          ? JSON.stringify(notification.metadata)
          : undefined,
      };

      const response = await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: 'unique()',
        data: notificationData,
      });

      // Send SMS notification if user has SMS enabled
      await this.sendSMSNotification(notification.userId, notificationData);

      return response as unknown as Notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  async updateNotification(
    id: string,
    updates: UpdateNotificationRequest
  ): Promise<Notification> {
    try {
      const response = await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: id,
        data: updates,
      });
      return response as unknown as Notification;
    } catch (error) {
      console.error('Failed to update notification:', error);
      throw new Error('Failed to update notification');
    }
  }

  async markAsRead(id: string): Promise<Notification> {
    try {
      const response = await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: id,
        data: { read: true },
      });
      return response as unknown as Notification;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAsUnread(id: string): Promise<Notification> {
    try {
      const response = await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: id,
        data: { read: false },
      });
      return response as unknown as Notification;
    } catch (error) {
      console.error('Failed to mark notification as unread:', error);
      throw new Error('Failed to mark notification as unread');
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      // Get all unread notifications for the user
      const unreadNotifications = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries: [Query.equal('userId', userId), Query.equal('read', false)],
      });

      // Update each notification
      const updatePromises = unreadNotifications.rows.map((notification: any) =>
        tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.notificationsCollectionId || 'notifications',
          rowId: notification.$id,
          data: { read: true },
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      await tablesDB.deleteRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: id,
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  async deleteMultipleNotifications(ids: string[]): Promise<void> {
    try {
      const deletePromises = ids.map((id) =>
        tablesDB.deleteRow({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.notificationsCollectionId || 'notifications',
          rowId: id,
        })
      );

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Failed to delete multiple notifications:', error);
      throw new Error('Failed to delete multiple notifications');
    }
  }

  // Statistics
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      // Get all notifications for the user
      const allNotifications = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries: [Query.equal('userId', userId)],
      });

      const notifications = allNotifications.rows as unknown as Notification[];

      // Calculate stats
      const total = notifications.length;
      const read = notifications.filter((n) => n.read).length;
      const unread = total - read;

      // Count by priority
      const byPriority = {
        urgent: notifications.filter((n) => n.priority === 'urgent').length,
        high: notifications.filter((n) => n.priority === 'high').length,
        medium: notifications.filter((n) => n.priority === 'medium').length,
        low: notifications.filter((n) => n.priority === 'low').length,
      };

      // Count by type
      const byType: Record<string, number> = {};
      notifications.forEach((notification) => {
        byType[notification.type] = (byType[notification.type] || 0) + 1;
      });

      return {
        total,
        read,
        unread,
        byPriority,
        byType,
      };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      throw new Error('Failed to get notification stats');
    }
  }

  // Bulk Operations
  async createBulkNotifications(
    notifications: CreateNotificationRequest[]
  ): Promise<Notification[]> {
    try {
      const createdNotifications: Notification[] = [];

      for (const notification of notifications) {
        const created = await this.createNotification(notification);
        createdNotifications.push(created);
      }

      return createdNotifications;
    } catch (error) {
      console.error('Failed to create bulk notifications:', error);
      throw new Error('Failed to create bulk notifications');
    }
  }

  // Automatic Notification Triggers
  async triggerAutomaticNotification(
    type: string,
    userId: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<Notification> {
    try {
      return await this.createNotification({
        userId,
        title,
        message,
        type,
        triggerType: 'automatic',
        triggeredBy: 'system',
        metadata,
      });
    } catch (error) {
      console.error('Failed to trigger automatic notification:', error);
      throw new Error('Failed to trigger automatic notification');
    }
  }

  // Utility Methods
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries: [Query.equal('userId', userId), Query.equal('read', false)],
      });
      return response.total;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      throw new Error('Failed to get unread count');
    }
  }

  async getRecentNotifications(
    userId: string,
    limit: number = 5
  ): Promise<Notification[]> {
    try {
      const response = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries: [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
        ],
      });
      return response.rows as unknown as Notification[];
    } catch (error) {
      console.error('Failed to get recent notifications:', error);
      throw new Error('Failed to get recent notifications');
    }
  }

  // Notification Settings
  async getNotificationSettings(
    userId: string
  ): Promise<NotificationSettingsDoc | null> {
    try {
      const response = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId:
          appwriteConfig.notificationSettingsCollectionId ||
          'notification-settings',
        queries: [Query.equal('user_id', userId), Query.limit(1)],
      });
      return (response.rows[0] as unknown as NotificationSettingsDoc) || null;
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      throw new Error('Failed to get notification settings');
    }
  }

  async upsertNotificationSettings(
    payload: UpsertNotificationSettingsRequest
  ): Promise<NotificationSettingsDoc> {
    try {
      const existing = await this.getNotificationSettings(payload.userId);

      const doc = {
        user_id: payload.userId,
        email_enabled: payload.emailEnabled ?? existing?.email_enabled ?? false,
        push_enabled: payload.pushEnabled ?? existing?.push_enabled ?? false,
        phone_number: payload.phoneNumber ?? existing?.phone_number,
        notification_types:
          payload.notificationTypes ?? existing?.notification_types ?? [],
        frequency: payload.frequency ?? existing?.frequency ?? 'instant',
      };

      const response = existing
        ? await tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.notificationSettingsCollectionId ||
              'notification-settings',
            rowId: existing.$id,
            data: doc,
          })
        : await tablesDB.createRow({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.notificationSettingsCollectionId ||
              'notification-settings',
            rowId: 'unique()',
            data: doc,
          });

      return response as unknown as NotificationSettingsDoc;
    } catch (error) {
      console.error('Failed to upsert notification settings:', error);
      throw new Error('Failed to upsert notification settings');
    }
  }

  /**
   * Send SMS notification to user if SMS is enabled
   */
  private async sendSMSNotification(
    userId: string,
    notificationData: {
      title: string;
      message: string;
      priority?: string;
      actionUrl?: string;
      type?: string;
    }
  ): Promise<void> {
    try {
      const messaging = await getAppwriteMessagingService();

      // Check if Appwrite messaging is configured
      if (!messaging.isConfigured()) {
        console.log(
          'Appwrite messaging not configured, skipping SMS notification'
        );
        return;
      }

      // Get user notification settings
      const settings = await this.getNotificationSettings(userId);
      if (!settings || !settings.push_enabled) {
        console.log('SMS notifications disabled for user:', userId);
        return;
      }

      // Check if user has enabled this notification type
      if (settings.notification_types.length > 0) {
        // TODO: Add notification type filtering here when we have the type
        // For now, send all notifications
      }

      // Send SMS via Appwrite messaging
      await messaging.sendGenericNotification(
        userId,
        notificationData.title,
        notificationData.message
      );

      console.log(`SMS notification sent to user ${userId}`);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      // Don't throw error to avoid breaking notification creation
    }
  }

  /**
   * Format notification data for SMS
   */
  private formatSMSMessage(notificationData: {
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string;
  }): string {
    const priority = notificationData.priority || 'medium';
    const priorityEmoji =
      {
        urgent: '🚨',
        high: '⚠️',
        medium: 'ℹ️',
        low: '📝',
      }[priority] || 'ℹ️';

    let message = `${priorityEmoji} ${notificationData.title}\n\n${notificationData.message}`;

    // Add action URL if available (shortened)
    if (notificationData.actionUrl) {
      message += `\n\nView: ${notificationData.actionUrl}`;
    }

    return message;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
