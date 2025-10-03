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
    throw new Error('Failed to fetch data');
  }
  return response.json();
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
    mutate,
  } = useSWR(
    currentUserId ? `/api/notifications?userId=${currentUserId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true, // Force revalidation on mount
      dedupingInterval: 0, // Disable deduping to ensure fresh data
    }
  );

  const { data: stats } = useSWR(
    currentUserId ? `/api/notifications/stats?userId=${currentUserId}` : null,
    fetcher
  );

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      // Optimistic update
      mutate(
        `/api/notifications?userId=${currentUserId}`,
        (current: Notification[]) =>
          current?.map((notification) =>
            notification.$id === notificationId
              ? { ...notification, read: true }
              : notification
          ),
        false
      );

      // Revalidate stats
      mutate(`/api/notifications/stats?userId=${currentUserId}`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/unread`, {
        method: 'PUT',
      });

      // Optimistic update
      mutate(
        `/api/notifications?userId=${currentUserId}`,
        (current: Notification[]) =>
          current?.map((notification) =>
            notification.$id === notificationId
              ? { ...notification, read: false }
              : notification
          ),
        false
      );

      // Revalidate stats
      mutate(`/api/notifications/stats?userId=${currentUserId}`);
    } catch (error) {
      console.error('Failed to mark notification as unread:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/read-all?userId=${currentUserId}`, {
        method: 'PUT',
      });

      // Optimistic update
      mutate(
        `/api/notifications?userId=${currentUserId}`,
        (current: Notification[]) =>
          current?.map((notification) => ({ ...notification, read: true })),
        false
      );

      // Revalidate stats
      mutate(`/api/notifications/stats?userId=${currentUserId}`);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      // Optimistic update
      mutate(
        `/api/notifications?userId=${currentUserId}`,
        (current: Notification[]) =>
          current?.filter(
            (notification) => notification.$id !== notificationId
          ),
        false
      );

      // Revalidate stats
      mutate(`/api/notifications/stats?userId=${currentUserId}`);
    } catch (error) {
      console.error('Failed to delete notification:', error);
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

  return {
    notifications: notifications?.data || [],
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
    mutate: () => mutate(`/api/notifications?userId=${currentUserId}`),
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

// Hook for getting unread count
export const useUnreadCount = (userId?: string) => {
  const { user } = useAuth();
  const currentUserId = userId || user?.$id;

  const { data, error, isLoading } = useSWR(
    currentUserId
      ? `/api/notifications/unread-count?userId=${currentUserId}`
      : null,
    fetcher,
    {
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  );

  return {
    unreadCount: data?.count || 0,
    isLoading,
    error,
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
