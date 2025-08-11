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

class NotificationService {
  private async getClient() {
    return await createAdminClient();
  }

  // Notification Types Management
  async getNotificationTypes(): Promise<NotificationType[]> {
    try {
      const { databases } = await this.getClient();
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationTypesCollectionId,
        [Query.equal('enabled', true), Query.orderDesc('$createdAt')]
      );
      return response.documents as unknown as NotificationType[];
    } catch (error) {
      console.error('Failed to fetch notification types:', error);
      throw new Error('Failed to fetch notification types');
    }
  }

  async getNotificationType(typeKey: string): Promise<NotificationType | null> {
    try {
      const { databases } = await this.getClient();
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationTypesCollectionId,
        [Query.equal('type_key', typeKey), Query.equal('enabled', true)]
      );
      return (response.documents[0] as unknown as NotificationType) || null;
    } catch (error) {
      console.error('Failed to fetch notification type:', error);
      throw new Error('Failed to fetch notification type');
    }
  }

  async createNotificationType(
    type: Omit<NotificationType, '$id' | '$createdAt' | '$updatedAt'>
  ): Promise<NotificationType> {
    try {
      const { databases } = await this.getClient();
      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationTypesCollectionId,
        'unique()',
        type
      );
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
      const { databases } = await this.getClient();
      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationTypesCollectionId,
        id,
        updates
      );
      return response as unknown as NotificationType;
    } catch (error) {
      console.error('Failed to update notification type:', error);
      throw new Error('Failed to update notification type');
    }
  }

  async deleteNotificationType(id: string): Promise<void> {
    try {
      const { databases } = await this.getClient();
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationTypesCollectionId,
        id
      );
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
      const { databases } = await this.getClient();
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

      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        queries
      );

      return {
        data: response.documents as unknown as Notification[],
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
      const { databases } = await this.getClient();
      const response = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        id
      );
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
      const { databases } = await this.getClient();

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

      const response = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        'unique()',
        notificationData
      );

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
      const { databases } = await this.getClient();
      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        id,
        updates
      );
      return response as unknown as Notification;
    } catch (error) {
      console.error('Failed to update notification:', error);
      throw new Error('Failed to update notification');
    }
  }

  async markAsRead(id: string): Promise<Notification> {
    try {
      const { databases } = await this.getClient();
      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        id,
        { read: true }
      );
      return response as unknown as Notification;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  async markAsUnread(id: string): Promise<Notification> {
    try {
      const { databases } = await this.getClient();
      const response = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        id,
        { read: false }
      );
      return response as unknown as Notification;
    } catch (error) {
      console.error('Failed to mark notification as unread:', error);
      throw new Error('Failed to mark notification as unread');
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { databases } = await this.getClient();

      // Get all unread notifications for the user
      const unreadNotifications = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [Query.equal('userId', userId), Query.equal('read', false)]
      );

      // Update each notification
      const updatePromises = unreadNotifications.documents.map((notification) =>
        databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          notification.$id,
          { read: true }
        )
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      const { databases } = await this.getClient();
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        id
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  async deleteMultipleNotifications(ids: string[]): Promise<void> {
    try {
      const { databases } = await this.getClient();

      const deletePromises = ids.map((id) =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          id
        )
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
      const { databases } = await this.getClient();

      // Get all notifications for the user
      const allNotifications = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [Query.equal('userId', userId)]
      );

      const notifications =
        allNotifications.documents as unknown as Notification[];

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
      const { databases } = await this.getClient();
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [Query.equal('userId', userId), Query.equal('read', false)]
      );
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
      const { databases } = await this.getClient();
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
        ]
      );
      return response.documents as unknown as Notification[];
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
      const { databases } = await this.getClient();
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationSettingsCollectionId,
        [Query.equal('user_id', userId), Query.limit(1)]
      );
      return (
        (response.documents[0] as unknown as NotificationSettingsDoc) || null
      );
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      throw new Error('Failed to get notification settings');
    }
  }

  async upsertNotificationSettings(
    payload: UpsertNotificationSettingsRequest
  ): Promise<NotificationSettingsDoc> {
    try {
      const { databases } = await this.getClient();
      const existing = await this.getNotificationSettings(payload.userId);

      const doc = {
        user_id: payload.userId,
        email_enabled: payload.emailEnabled ?? existing?.email_enabled ?? false,
        push_enabled: payload.pushEnabled ?? existing?.push_enabled ?? false,
        phone_number: payload.phoneNumber ?? existing?.phone_number,
        notification_types:
          payload.notificationTypes ?? existing?.notification_types ?? [],
        frequency: payload.frequency ?? existing?.frequency ?? 'instant',
        fcm_token: payload.fcmToken ?? existing?.fcm_token,
      };

      const response = existing
        ? await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.notificationSettingsCollectionId,
            existing.$id,
            doc
          )
        : await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.notificationSettingsCollectionId,
            'unique()',
            doc
          );

      return response as unknown as NotificationSettingsDoc;
    } catch (error) {
      console.error('Failed to upsert notification settings:', error);
      throw new Error('Failed to upsert notification settings');
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
