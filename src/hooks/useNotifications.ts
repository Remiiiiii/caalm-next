import React from 'react';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import {
  Notification,
  NotificationType,
  CreateNotificationRequest,
  UseNotificationsReturn,
  UseNotificationTypesReturn,
} from '@/types/notifications';

// Enhanced fetcher functions
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[CLIENT] Failed to fetch notifications from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(
      `Failed to fetch data: ${response.status} ${response.statusText}`
    );
  }
  const data = await response.json();
  // Handle both direct array and wrapped response formats
  if (Array.isArray(data)) {
    return data;
  }
  // If response has data property, use it
  if (data.data && Array.isArray(data.data)) {
    return data.data;
  }
  // If response has rows property (Appwrite format), use it
  if (data.rows && Array.isArray(data.rows)) {
    return data.rows;
  }
  console.warn('[CLIENT] Unexpected notification response format:', data);
  return [];
};

export const useNotifications = (userId?: string): UseNotificationsReturn => {
  const { user } = useAuth();
  const currentUserId = userId || user?.$id;

  // Debug logging
  console.log('useNotifications Debug:', {
    providedUserId: userId,
    authUserId: user?.$id,
    currentUserId,
    userEmail: user?.email,
    userName: user?.name,
  });

  const {
    data: notifications,
    error,
    isLoading,
    mutate: mutateNotifications,
  } = useSWR(
    currentUserId ? `/api/notifications?userId=${currentUserId}` : null,
    fetcher,
    {
      refreshInterval: 0, // Disable auto-refresh, we'll manually revalidate on mutations
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true, // Force revalidation on mount
      dedupingInterval: 0, // Disable deduping to ensure fresh data
      revalidateIfStale: true, // Always revalidate if data is stale
    }
  );

  const { data: stats } = useSWR(
    currentUserId ? `/api/notifications/stats?userId=${currentUserId}` : null,
    fetcher
  );

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update first for instant UI feedback
      await mutateNotifications(
        (current: Notification[]) =>
          current?.map((notification) =>
            notification.$id === notificationId
              ? { ...notification, read: true }
              : notification
          ),
        { revalidate: false }
      );

      // Then update on server
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      // Revalidate to ensure consistency
      await mutateNotifications(undefined, { revalidate: true });

      // Revalidate stats and unread count
      await Promise.all([
        mutate(`/api/notifications/stats?userId=${currentUserId}`, undefined, {
          revalidate: true,
        }),
        mutate(
          `/api/notifications/unread-count?userId=${currentUserId}`,
          undefined,
          { revalidate: true }
        ),
      ]);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert optimistic update on error
      await mutateNotifications(undefined, { revalidate: true });
      throw error;
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      // Optimistic update first for instant UI feedback
      await mutateNotifications(
        (current: Notification[]) =>
          current?.map((notification) =>
            notification.$id === notificationId
              ? { ...notification, read: false }
              : notification
          ),
        { revalidate: false }
      );

      // Then update on server
      await fetch(`/api/notifications/${notificationId}/unread`, {
        method: 'PUT',
      });

      // Revalidate to ensure consistency
      await mutateNotifications(undefined, { revalidate: true });

      // Revalidate stats and unread count
      await Promise.all([
        mutate(`/api/notifications/stats?userId=${currentUserId}`, undefined, {
          revalidate: true,
        }),
        mutate(
          `/api/notifications/unread-count?userId=${currentUserId}`,
          undefined,
          { revalidate: true }
        ),
      ]);
    } catch (error) {
      console.error('Failed to mark notification as unread:', error);
      // Revert optimistic update on error
      await mutateNotifications(undefined, { revalidate: true });
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic update first for instant UI feedback
      await mutateNotifications(
        (current: Notification[]) =>
          current?.map((notification) => ({ ...notification, read: true })),
        { revalidate: false }
      );

      // Then update on server
      await fetch(`/api/notifications/read-all?userId=${currentUserId}`, {
        method: 'PUT',
      });

      // Revalidate to ensure consistency
      await mutateNotifications(undefined, { revalidate: true });

      // Revalidate stats and unread count
      await Promise.all([
        mutate(`/api/notifications/stats?userId=${currentUserId}`, undefined, {
          revalidate: true,
        }),
        mutate(
          `/api/notifications/unread-count?userId=${currentUserId}`,
          undefined,
          { revalidate: true }
        ),
      ]);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert optimistic update on error
      await mutateNotifications(undefined, { revalidate: true });
      throw error;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Optimistic update - remove immediately from UI (instant feedback)
      const optimisticUpdate = mutateNotifications(
        (current: Notification[]) =>
          current?.filter(
            (notification) => notification.$id !== notificationId
          ),
        { revalidate: false, populateCache: true, rollbackOnError: true }
      );

      // Delete from server
      const deleteResponse = await fetch(
        `/api/notifications/${notificationId}`,
        {
          method: 'DELETE',
        }
      );

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete notification');
      }

      // Force immediate revalidation to ensure UI is in sync with database
      // This bypasses cache and fetches fresh data
      await mutateNotifications(undefined, {
        revalidate: true,
        populateCache: true,
      });

      // Revalidate stats and unread count immediately (bypass cache)
      await Promise.all([
        mutate(`/api/notifications/stats?userId=${currentUserId}`, undefined, {
          revalidate: true,
        }),
        mutate(
          `/api/notifications/unread-count?userId=${currentUserId}`,
          undefined,
          { revalidate: true }
        ),
      ]);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Revert optimistic update on error by revalidating
      await mutateNotifications(undefined, { revalidate: true });
      throw error;
    }
  };

  const createNotification = async (
    notification: CreateNotificationRequest
  ) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      // Revalidate notifications
      mutate(`/api/notifications?userId=${currentUserId}`);
      mutate(`/api/notifications/stats?userId=${currentUserId}`);
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  };

  // Handle different response formats from the API
  let notificationsArray: Notification[] = [];
  if (notifications) {
    if (Array.isArray(notifications)) {
      notificationsArray = notifications;
    } else if (notifications.data && Array.isArray(notifications.data)) {
      notificationsArray = notifications.data;
    } else if (notifications.rows && Array.isArray(notifications.rows)) {
      notificationsArray = notifications.rows;
    }
  }

  // Debug logging for notifications
  React.useEffect(() => {
    console.log('[CLIENT] useNotifications - Notification data:', {
      rawData: notifications,
      rawDataType: typeof notifications,
      isRawArray: Array.isArray(notifications),
      hasDataProperty: !!(notifications as any)?.data,
      hasRowsProperty: !!(notifications as any)?.rows,
      dataPropertyType: (notifications as any)?.data
        ? typeof (notifications as any).data
        : 'N/A',
      dataPropertyIsArray: Array.isArray((notifications as any)?.data),
      parsedArray: notificationsArray,
      arrayLength: notificationsArray.length,
      userId: currentUserId,
      hasData: !!notifications,
    });

    // Log first notification if available
    if (notificationsArray.length > 0) {
      console.log('[CLIENT] First notification:', notificationsArray[0]);
    }
  }, [notifications, notificationsArray.length, currentUserId]);

  return {
    notifications: notificationsArray,
    stats: stats?.data || {
      total: 0,
      unread: 0,
      read: 0,
      byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
      byType: {},
    },
    isLoading,
    error,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    createNotification,
    mutate: () => mutateNotifications(),
  };
};

export const useNotificationTypes = (): UseNotificationTypesReturn => {
  const {
    data: notificationTypes,
    error,
    isLoading,
  } = useSWR('/api/notification-types', fetcher, {
    refreshInterval: 60000, // Refresh every minute
    revalidateOnFocus: true,
  });

  const createNotificationType = async (
    type: Omit<NotificationType, '$id' | '$createdAt' | '$updatedAt'>
  ) => {
    try {
      await fetch('/api/notification-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(type),
      });

      // Revalidate notification types
      mutate('/api/notification-types');
    } catch (error) {
      console.error('Failed to create notification type:', error);
      throw error;
    }
  };

  const updateNotificationType = async (
    id: string,
    updates: Partial<NotificationType>
  ) => {
    try {
      await fetch(`/api/notification-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      // Revalidate notification types
      mutate('/api/notification-types');
    } catch (error) {
      console.error('Failed to update notification type:', error);
      throw error;
    }
  };

  const deleteNotificationType = async (id: string) => {
    try {
      await fetch(`/api/notification-types/${id}`, {
        method: 'DELETE',
      });

      // Revalidate notification types
      mutate('/api/notification-types');
    } catch (error) {
      console.error('Failed to delete notification type:', error);
      throw error;
    }
  };

  return {
    notificationTypes: notificationTypes?.data || [],
    isLoading,
    error,
    createNotificationType,
    updateNotificationType,
    deleteNotificationType,
    mutate: () => mutate('/api/notification-types'),
  };
};

// Utility hook for getting notification type configuration
export const useNotificationTypeConfig = (typeKey: string) => {
  const { notificationTypes } = useNotificationTypes();
  return notificationTypes.find((type) => type.type_key === typeKey);
};

// Fetcher specifically for unread count API
const unreadCountFetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[CLIENT] Failed to fetch unread count from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(
      `Failed to fetch unread count: ${response.status} ${response.statusText}`
    );
  }
  const data = await response.json();
  // The unread-count API returns { count: number }
  if (data && typeof data.count === 'number') {
    return data;
  }
  // Fallback: if response is just a number
  if (typeof data === 'number') {
    return { count: data };
  }
  console.warn('[CLIENT] Unexpected unread count response format:', data);
  return { count: 0 };
};

// Hook for getting unread count
export const useUnreadCount = (userId?: string) => {
  const { user } = useAuth();
  const currentUserId = userId || user?.$id;

  const { data, error, isLoading, mutate } = useSWR(
    currentUserId
      ? `/api/notifications/unread-count?userId=${currentUserId}`
      : null,
    unreadCountFetcher,
    {
      refreshInterval: 0, // Disable auto-refresh, we'll manually revalidate on mutations
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 0, // Disable deduping to ensure fresh data
      revalidateIfStale: true, // Always revalidate if data is stale
    }
  );

  const unreadCount = data?.count ?? 0;

  // Debug logging
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CLIENT] useUnreadCount:', {
        userId: currentUserId,
        data,
        unreadCount,
        isLoading,
        error: error?.message,
      });
    }
  }, [currentUserId, data, unreadCount, isLoading, error]);

  return {
    unreadCount,
    isLoading,
    error,
    mutate, // Expose mutate for manual revalidation
  };
};

// Hook for recent notifications
export const useRecentNotifications = ({
  userId,
  limit = 5,
}: {
  userId?: string;
  limit?: number;
}) => {
  const { user } = useAuth();
  const currentUserId = userId || user?.$id;

  const { data, error, isLoading } = useSWR(
    currentUserId
      ? `/api/notifications/recent?userId=${currentUserId}&limit=${limit}`
      : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  return {
    recentNotifications: data?.data || [],
    isLoading,
    error,
  };
};
