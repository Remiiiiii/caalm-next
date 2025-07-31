import useSWR, { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  $id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  userId: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
};

export const useNotifications = (userId?: string) => {
  const { user } = useAuth();
  const currentUserId = userId || user?.$id;

  const { data: notifications, error, isLoading } = useSWR(
    currentUserId ? `/api/notifications?userId=${currentUserId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
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
          current?.map(notification =>
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
          current?.map(notification => ({ ...notification, read: true })),
        false
      );

      // Revalidate stats
      mutate(`/api/notifications/stats?userId=${currentUserId}`);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
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
          current?.filter(notification => notification.$id !== notificationId),
        false
      );

      // Revalidate stats
      mutate(`/api/notifications/stats?userId=${currentUserId}`);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return {
    notifications: notifications?.data || [],
    stats: stats?.data || { total: 0, unread: 0, read: 0 },
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    mutate: () => mutate(`/api/notifications?userId=${currentUserId}`),
  };
}; 