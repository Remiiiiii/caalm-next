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
import { CacheManager } from '@/lib/services/cache-manager';
import type { appwriteMessagingService as AppwriteMessagingServiceInstance } from './appwriteMessagingService';

// Lazy import to avoid initialization errors when messaging service is not configured
type AppwriteMessagingServiceType = typeof AppwriteMessagingServiceInstance;
let appwriteMessagingService: AppwriteMessagingServiceType | null = null;

async function getAppwriteMessagingService() {
  if (!appwriteMessagingService) {
    try {
      const { appwriteMessagingService: service } = await import(
        './appwriteMessagingService'
      );
      appwriteMessagingService = service;
    } catch (error) {
      console.warn('Appwrite messaging service not available:', error);
      return null;
    }
  }
  return appwriteMessagingService;
}

class NotificationService {
  private async getClient() {
    return await createAdminClient();
  }

  private async getTablesDB() {
    const { tablesDB } = await this.getClient();
    return tablesDB;
  }

  /**
   * Helper method to resolve both document $id and accountId for a user
   * This ensures we can query notifications regardless of which ID format is used
   */
  private async resolveUserIds(
    userId: string
  ): Promise<{ docId: string; accountId: string | null }> {
    const tablesDB = await this.getTablesDB();

    // Try to get user by $id first
    try {
      const user = await tablesDB.getRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.usersCollectionId || 'users',
        rowId: userId,
      });
      return {
        docId: user.$id,
        accountId: user.accountId || null,
      };
    } catch (error) {
      // If not found by $id, try to find by accountId
      try {
        const users = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.usersCollectionId || 'users',
          queries: [Query.equal('accountId', userId), Query.limit(1)],
        });

        if (users.rows.length > 0) {
          const user = users.rows[0];
          return {
            docId: user.$id,
            accountId: user.accountId || userId,
          };
        }
      } catch (accountIdError) {
        console.warn(
          '[SERVER] Could not resolve user IDs, using provided userId as-is:',
          userId
        );
      }

      // Fallback: assume userId is docId
      return {
        docId: userId,
        accountId: null,
      };
    }
  }

  // Notification Types Management
  async getNotificationTypes(): Promise<NotificationType[]> {
    try {
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
      const response = await tablesDB.updateRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId:
          appwriteConfig.notificationTypesCollectionId || 'notification-types',
        rowId: id,
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
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();

      // Resolve both docId and accountId
      const { docId, accountId } = await this.resolveUserIds(userId);

      // Query for notifications with docId
      const queries = [Query.equal('userId', docId)];

      // If we found an accountId, also query for notifications with that accountId (for backward compatibility)
      // We'll merge the results
      let accountIdNotifications: any[] = [];
      if (accountId && accountId !== userId) {
        try {
          const accountIdQuery = [Query.equal('userId', accountId)];
          // Apply same filters
          if (filters?.search) {
            accountIdQuery.push(Query.search('title', filters.search));
            accountIdQuery.push(Query.search('message', filters.search));
          }
          if (filters?.type && filters.type !== 'all') {
            accountIdQuery.push(Query.equal('type', filters.type));
          }
          if (filters?.status && filters.status !== 'all') {
            accountIdQuery.push(Query.equal('read', filters.status === 'read'));
          }
          if (filters?.priority && filters.priority !== 'all') {
            accountIdQuery.push(Query.equal('priority', filters.priority));
          }

          const accountIdResponse = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.notificationsCollectionId || 'notifications',
            queries: accountIdQuery,
          });
          accountIdNotifications = accountIdResponse.rows || [];
        } catch (accountIdError) {
          console.warn(
            '[SERVER] Could not query notifications by accountId:',
            accountIdError
          );
        }
      }

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

      // Don't apply pagination yet - we need to merge with accountId notifications first
      // queries.push(Query.limit(limit));
      // queries.push(Query.offset(offset));

      const response = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries,
      });

      // Merge with accountId notifications if any (for backward compatibility)
      let allNotifications = [...(response.rows || [])];
      if (accountIdNotifications.length > 0) {
        // Combine and deduplicate by $id
        const existingIds = new Set(allNotifications.map((n: any) => n.$id));
        const uniqueAccountIdNotifications = accountIdNotifications.filter(
          (n: any) => !existingIds.has(n.$id)
        );
        allNotifications = [
          ...allNotifications,
          ...uniqueAccountIdNotifications,
        ];
      }

      // Apply sorting to merged results
      if (sortField === 'date') {
        allNotifications.sort((a: any, b: any) => {
          const dateA = new Date(a.$createdAt).getTime();
          const dateB = new Date(b.$createdAt).getTime();
          return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
        });
      } else if (sortField === 'priority') {
        const priorityOrder: Record<string, number> = {
          urgent: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        allNotifications.sort((a: any, b: any) => {
          const priorityA = priorityOrder[a.priority || 'low'] || 1;
          const priorityB = priorityOrder[b.priority || 'low'] || 1;
          return sortDirection === 'desc'
            ? priorityB - priorityA
            : priorityA - priorityB;
        });
      } else if (sortField === 'type') {
        allNotifications.sort((a: any, b: any) => {
          const typeA = (a.type || '').toLowerCase();
          const typeB = (b.type || '').toLowerCase();
          return sortDirection === 'desc'
            ? typeB.localeCompare(typeA)
            : typeA.localeCompare(typeB);
        });
      } else if (sortField === 'title') {
        allNotifications.sort((a: any, b: any) => {
          const titleA = (a.title || '').toLowerCase();
          const titleB = (b.title || '').toLowerCase();
          return sortDirection === 'desc'
            ? titleB.localeCompare(titleA)
            : titleA.localeCompare(titleB);
        });
      }

      // Apply pagination to sorted results
      const offset = (page - 1) * limit;
      const paginatedNotifications = allNotifications.slice(
        offset,
        offset + limit
      );

      console.log(
        `[SERVER] NotificationService.getNotifications - userId: ${userId}, docId: ${docId}, accountId: ${accountId}, total found: ${allNotifications.length}, returning: ${paginatedNotifications.length}`
      );

      return {
        data: paginatedNotifications as unknown as Notification[],
        total: allNotifications.length,
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
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
      console.log(
        '[SERVER] NotificationService.createNotification] Creating notification with type:',
        notification.type
      );

      // Validate notification type exists and is enabled
      const notificationType = await this.getNotificationType(
        notification.type
      );
      if (!notificationType) {
        const errorMsg = `Notification type '${notification.type}' not found or disabled`;
        console.error(
          '[SERVER] NotificationService.createNotification]',
          errorMsg
        );
        throw new Error(errorMsg);
      }

      console.log(
        '[SERVER] NotificationService.createNotification] Notification type validated:',
        notificationType.type_key
      );

      // Get user's organization ID (required field)
      const { getUserDefaultOrganization } = await import(
        '@/lib/rbac/permissions'
      );

      // notification.userId should be the user's document $id (not accountId)
      // The frontend queries with user.$id from auth context, which is the document ID
      let userDocId = notification.userId;
      let orgId: string | undefined;

      // Try to get user by $id first to check if orgId is available directly
      try {
        const tablesDB = await this.getTablesDB();
        const user = await tablesDB.getRow({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.usersCollectionId || 'users',
          rowId: notification.userId,
        });

        if (user) {
          userDocId = user.$id;
          // Use user's orgId directly if available
          orgId = user.orgId;
        }
      } catch (userLookupError: any) {
        // If getRow fails (e.g., userId is accountId instead of $id), try lookup by accountId
        if (
          userLookupError?.code === 404 ||
          userLookupError?.message?.includes('not found')
        ) {
          try {
            const tablesDB = await this.getTablesDB();
            const users = await tablesDB.listRows({
              databaseId: appwriteConfig.databaseId || 'default-db',
              tableId: appwriteConfig.usersCollectionId || 'users',
              queries: [Query.equal('accountId', notification.userId)],
            });

            if (users.rows.length > 0) {
              const user = users.rows[0];
              userDocId = user.$id;
              orgId = user.orgId;
            }
          } catch (accountIdLookupError) {
            console.warn(
              '[SERVER] NotificationService.createNotification] Could not look up user by $id or accountId:',
              accountIdLookupError
            );
          }
        } else {
          console.warn(
            '[SERVER] NotificationService.createNotification] Error looking up user:',
            userLookupError
          );
        }
      }

      // Get orgId from user's default organization if not found directly
      if (!orgId) {
        const defaultOrg = await getUserDefaultOrganization(userDocId);
        if (!defaultOrg) {
          const errorMsg = `User ${notification.userId} (docId: ${userDocId}) has no default organization`;
          console.error(
            '[SERVER] NotificationService.createNotification]',
            errorMsg
          );
          throw new Error(errorMsg);
        }
        orgId = defaultOrg.orgId;
      }

      // Build notification data, excluding undefined values
      const notificationData: Record<string, any> = {
        userId: notification.userId, // Keep accountId for querying (matches auth context)
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        priority: notification.priority || notificationType.priority,
        orgId: orgId, // Required field
      };

      // Only add optional fields if they have values
      if (notification.actionUrl) {
        notificationData.actionUrl = notification.actionUrl;
      }
      if (notification.actionText) {
        notificationData.actionText = notification.actionText;
      }
      if (notification.metadata) {
        notificationData.metadata = JSON.stringify(notification.metadata);
      }

      console.log(
        '[SERVER] NotificationService.createNotification] Creating row in database:',
        {
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.notificationsCollectionId || 'notifications',
          dataKeys: Object.keys(notificationData),
        }
      );

      const response = await tablesDB.createRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: 'unique()',
        data: notificationData,
      });

      const notificationId = (response as any).$id;

      console.log(
        '[SERVER] NotificationService.createNotification] Successfully created notification:',
        {
          notificationId: notificationId || 'unknown-id',
          userId: notification.userId,
          orgId: orgId,
          type: notification.type,
          title: notification.title,
        }
      );

      // Check user's digest frequency setting
      const userSettings = await this.getNotificationSettings(
        notification.userId
      );
      const digestFrequency = userSettings?.frequency || 'instant';

      // If user has digest frequency enabled, queue the notification instead of sending immediately
      if (digestFrequency === 'daily' || digestFrequency === 'weekly') {
        try {
          const { digestService } = await import('./digestService');
          await digestService.queueNotificationForDigest(
            notification.userId,
            notificationId,
            digestFrequency
          );
          console.log(
            `[SERVER] NotificationService.createNotification] Queued notification ${notificationId} for ${digestFrequency} digest`
          );
        } catch (digestError) {
          console.warn(
            '[SERVER] NotificationService.createNotification] Failed to queue notification for digest (non-critical):',
            digestError
          );
          // Continue with normal notification flow if digest queueing fails
        }
      }

      // Invalidate cache to ensure notification appears immediately
      // Do this in a separate try-catch so cache errors don't prevent notification creation from succeeding
      try {
        await CacheManager.invalidateNotifications(notification.userId);
        console.log(
          `[SERVER] Invalidated notification cache for ${notification.userId}`
        );
      } catch (cacheError) {
        console.warn(`[SERVER] Could not invalidate cache:`, cacheError);
      }

      // Send SMS notification if user has SMS enabled and digest is instant
      // (SMS for digest users will be sent when digest is processed)
      if (digestFrequency === 'instant') {
        try {
          await this.sendSMSNotification(notification.userId, {
            title: notificationData.title,
            message: notificationData.message,
            priority: notificationData.priority,
            actionUrl: notificationData.actionUrl,
            type: notificationData.type,
          });
        } catch (smsError) {
          console.warn(
            '[SERVER] NotificationService.createNotification] SMS notification failed (non-critical):',
            smsError
          );
          // Don't throw - SMS failure shouldn't break notification creation
        }
      }

      return response as unknown as Notification;
    } catch (error) {
      console.error(
        '[SERVER] NotificationService.createNotification] Failed to create notification:',
        error
      );
      if (error instanceof Error) {
        console.error(
          '[SERVER] NotificationService.createNotification] Error details:',
          {
            message: error.message,
            stack: error.stack,
          }
        );
      }
      throw error; // Re-throw the original error instead of wrapping it
    }
  }

  async updateNotification(
    id: string,
    updates: UpdateNotificationRequest
  ): Promise<Notification> {
    try {
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
      // Get all unread notifications for the user
      const unreadNotifications = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries: [Query.equal('userId', userId), Query.equal('read', false)],
      });

      // Update each notification
      const unreadRows = unreadNotifications.rows as unknown as Array<
        Notification & { $id: string }
      >;
      const updatePromises = unreadRows.map((notification) =>
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
      const tablesDB = await this.getTablesDB();

      // Get notification first to find userId for cache invalidation
      let userId: string | null = null;
      try {
        const notification = await tablesDB.getRow({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.notificationsCollectionId || 'notifications',
          rowId: id,
        });
        userId = (notification as any).userId;
      } catch (getError) {
        console.warn(
          'Could not fetch notification before deletion (non-critical):',
          getError
        );
      }

      await tablesDB.deleteRow({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        rowId: id,
      });

      // Invalidate cache immediately for instant UI update
      if (userId) {
        try {
          await CacheManager.invalidateNotifications(userId);
          console.log(
            `[SERVER] NotificationService: Invalidated cache for userId: ${userId} after deletion`
          );
        } catch (cacheError) {
          console.warn(
            'Could not invalidate cache after deletion (non-critical):',
            cacheError
          );
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  async deleteMultipleNotifications(
    ids: string[],
    userId?: string
  ): Promise<void> {
    try {
      const tablesDB = await this.getTablesDB();

      // Get userId from first notification if not provided
      let targetUserId = userId;
      if (!targetUserId && ids.length > 0) {
        try {
          const firstNotification = await tablesDB.getRow({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.notificationsCollectionId || 'notifications',
            rowId: ids[0],
          });
          targetUserId = (firstNotification as any).userId;
        } catch (getError) {
          console.warn(
            'Could not fetch notification before bulk deletion (non-critical):',
            getError
          );
        }
      }

      const deletePromises = ids.map((id) =>
        tablesDB.deleteRow({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.notificationsCollectionId || 'notifications',
          rowId: id,
        })
      );

      await Promise.all(deletePromises);

      // Invalidate cache immediately for instant UI update
      if (targetUserId) {
        try {
          await CacheManager.invalidateNotifications(targetUserId);
          console.log(
            `[SERVER] NotificationService: Invalidated cache for userId: ${targetUserId} after bulk deletion`
          );
        } catch (cacheError) {
          console.warn(
            'Could not invalidate cache after bulk deletion (non-critical):',
            cacheError
          );
        }
      }
    } catch (error) {
      console.error('Failed to delete multiple notifications:', error);
      throw new Error('Failed to delete multiple notifications');
    }
  }

  // Statistics
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();

      // Resolve both docId and accountId
      const { docId, accountId } = await this.resolveUserIds(userId);

      // Query for unread notifications with docId
      const docIdResponse = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries: [Query.equal('userId', docId), Query.equal('read', false)],
      });

      let totalUnread = docIdResponse.total || 0;

      // If we have an accountId that's different from docId, also query for it
      if (accountId && accountId !== docId) {
        try {
          const accountIdResponse = await tablesDB.listRows({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId:
              appwriteConfig.notificationsCollectionId || 'notifications',
            queries: [
              Query.equal('userId', accountId),
              Query.equal('read', false),
            ],
          });

          // Deduplicate by $id
          const docIdIds = new Set(
            (docIdResponse.rows || []).map((n: any) => n.$id)
          );
          const uniqueAccountIdCount = (accountIdResponse.rows || []).filter(
            (n: any) => !docIdIds.has(n.$id)
          ).length;

          totalUnread += uniqueAccountIdCount;
        } catch (accountIdError) {
          console.warn(
            '[SERVER] Could not query unread count by accountId:',
            accountIdError
          );
        }
      }

      console.log(
        `[SERVER] NotificationService.getUnreadCount - userId: ${userId}, docId: ${docId}, accountId: ${accountId}, total unread: ${totalUnread}`
      );

      return totalUnread;
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
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
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
      const tablesDB = await this.getTablesDB();
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
  async sendSMSNotification(
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
      if (!messaging || !messaging.isConfigured()) {
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

// Export the class for cases where a new instance is needed
export { NotificationService };
