// Enhanced Notification System Types

export interface NotificationType {
  $id: string;
  type_key: string;
  label: string;
  icon: string;
  color_classes: string;
  bg_color_classes: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  enabled: boolean;
  description?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface Notification {
  $id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  metadata?: string; // JSON string for additional data
  $createdAt: string;
  $updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<string, number>;
}

export interface NotificationFilters {
  search?: string;
  type?: string;
  status?: 'all' | 'read' | 'unread';
  priority?: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationSort {
  field: 'date' | 'priority' | 'type' | 'title';
  direction: 'asc' | 'desc';
}

export interface CreateNotificationRequest {
  type: string;
  title: string;
  message: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
  triggeredBy?: string;
  triggerType?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateNotificationRequest {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
  triggeredBy?: string;
  triggerType?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSettings {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  preferences: Record<string, boolean | string | number>;
}

export interface NotificationTrigger {
  id: string;
  type: string;
  conditions: Record<string, unknown>;
  enabled: boolean;
  schedule?: string; // Cron expression for scheduled triggers
  $createdAt: string;
  $updatedAt: string;
}

// API Response Types
export interface NotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationTypesResponse {
  data: NotificationType[];
}

export interface NotificationStatsResponse {
  data: NotificationStats;
}

// Hook Return Types
export interface UseNotificationsReturn {
  notifications: Notification[];
  stats: NotificationStats;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsUnread: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  createNotification: (
    notification: CreateNotificationRequest
  ) => Promise<void>;
  mutate: () => void;
}

export interface UseNotificationTypesReturn {
  notificationTypes: NotificationType[];
  isLoading: boolean;
  error: Error | null;
  createNotificationType: (
    type: Omit<NotificationType, '$id' | '$createdAt' | '$updatedAt'>
  ) => Promise<void>;
  updateNotificationType: (
    id: string,
    updates: Partial<NotificationType>
  ) => Promise<void>;
  deleteNotificationType: (id: string) => Promise<void>;
  mutate: () => void;
}
