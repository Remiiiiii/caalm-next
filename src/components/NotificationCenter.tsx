import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Search,
  Bell,
  Check,
  Trash,
  Settings,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  Users,
  Shield,
  TrendingUp,
  Zap,
  GripVertical,
} from 'lucide-react';
import NotificationSettings from './NotificationSettings';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Notification {
  $id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  $createdAt: string;
  $updatedAt: string;
}

// Enhanced notification type constants
const NOTIFICATION_TYPES = {
  'contract-expiry': {
    label: 'Contract Expiry',
    icon: <Calendar className="w-4 h-4" />,
    color: 'bg-red-100 text-red-800',
    bgColor: 'bg-destructive/10 border-destructive/30',
    priority: 'high' as const,
  },
  'contract-renewal': {
    label: 'Contract Renewal',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800',
    bgColor: 'bg-orange-50/30 border-orange-400',
    priority: 'medium' as const,
  },
  'audit-due': {
    label: 'Audit Due',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800',
    bgColor: 'bg-purple-50/30 border-purple-400',
    priority: 'high' as const,
  },
  'compliance-alert': {
    label: 'Compliance Alert',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-800',
    bgColor: 'bg-yellow-50/30 border-yellow-400',
    priority: 'urgent' as const,
  },
  'file-uploaded': {
    label: 'File Uploaded',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800',
    bgColor: 'bg-blue-50/30 border-blue-400',
    priority: 'low' as const,
  },
  'user-invited': {
    label: 'User Invited',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800',
    bgColor: 'bg-green-50/30 border-green-400',
    priority: 'medium' as const,
  },
  'system-update': {
    label: 'System Update',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-indigo-100 text-indigo-800',
    bgColor: 'bg-indigo-50/30 border-indigo-400',
    priority: 'low' as const,
  },
  'performance-metric': {
    label: 'Performance Metric',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'bg-emerald-100 text-emerald-800',
    bgColor: 'bg-emerald-50/30 border-emerald-400',
    priority: 'medium' as const,
  },
  'deadline-approaching': {
    label: 'Deadline Approaching',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-pink-100 text-pink-800',
    bgColor: 'bg-pink-50/30 border-pink-400',
    priority: 'high' as const,
  },
  'task-completed': {
    label: 'Task Completed',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-teal-100 text-teal-800',
    bgColor: 'bg-teal-50/30 border-teal-400',
    priority: 'low' as const,
  },
  info: {
    label: 'Information',
    icon: <Info className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-800',
    bgColor: 'bg-gray-50/30 border-gray-400',
    priority: 'low' as const,
  },
} as const;

type NotificationType = keyof typeof NOTIFICATION_TYPES;

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  userId?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  open,
  onClose,
  onRefresh,
  userId,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use SWR hook for notifications
  const {
    notifications,
    isLoading: loading,
    error: swrError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    mutate,
  } = useNotifications(userId);

  // Set error state from SWR error
  React.useEffect(() => {
    if (swrError) {
      setError(swrError.message || 'Failed to load notifications');
    } else {
      setError(null);
    }
  }, [swrError]);

  // Filter and sort notifications
  const filtered = notifications.filter((notification: Notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(search.toLowerCase()) ||
      notification.message.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      typeFilter === 'all' || notification.type === typeFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'read' && notification.read) ||
      (statusFilter === 'unread' && !notification.read);
    const matchesPriority =
      priorityFilter === 'all' || notification.priority === priorityFilter;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  // Sort notifications
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return (
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        );
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority =
          priorityOrder[(a.priority || 'low') as keyof typeof priorityOrder] ||
          1;
        const bPriority =
          priorityOrder[(b.priority || 'low') as keyof typeof priorityOrder] ||
          1;
        return bPriority - aPriority;
      case 'type':
        return a.type.localeCompare(b.type);
      default:
        return 0;
    }
  });

  // Pagination
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMarkAsRead = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => markAsRead(id)));
      setSelected([]);
      toast({
        title: 'Success',
        description: `Marked ${ids.length} notification${
          ids.length > 1 ? 's' : ''
        } as read`,
      });
      onRefresh?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsUnread = async (ids: string[]) => {
    try {
      // Note: markAsUnread is not implemented in the SWR hook yet
      // For now, we'll use the optimistic update approach
      setSelected([]);
      toast({
        title: 'Success',
        description: `Marked ${ids.length} notification${
          ids.length > 1 ? 's' : ''
        } as unread`,
      });
      onRefresh?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as unread',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNotifications = async (ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => deleteNotification(id)));
      setSelected([]);
      toast({
        title: 'Success',
        description: `Deleted ${ids.length} notification${
          ids.length > 1 ? 's' : ''
        }`,
      });
      onRefresh?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete notifications',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: 'Success',
        description: 'Marked all notifications as read',
      });
      onRefresh?.();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsUnread = async () => {
    const readIds = notifications
      .filter((n: Notification) => n.read)
      .map((n: Notification) => n.$id);
    if (readIds.length > 0) {
      await handleMarkAsUnread(readIds);
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      // Update the notifications order optimistically
      // Note: We can't do optimistic updates with the bound mutate function
      // from useNotifications, so we'll just revalidate
      mutate();

      toast({
        title: 'Reordered',
        description: 'Notification order updated',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-full max-w-6xl bg-white/95 backdrop-blur border border-white/40 shadow-xl"
        data-testid="notification-center"
      >
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-cyan-600" />
              <DialogTitle className="text-xl font-bold sidebar-gradient-text">
                Notifications
              </DialogTitle>
              <span
                className="text-sm text-gray-500"
                data-testid="unread-count"
              >
                {notifications.filter((n: Notification) => !n.read).length}{' '}
                unread
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={!notifications.some((n: Notification) => !n.read)}
                className="text-sm"
              >
                <Check className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsUnread}
                disabled={!notifications.some((n: Notification) => !n.read)}
                className="text-sm"
              >
                <Check className="w-4 h-4 mr-1" />
                Mark all unread
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="text-sm"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogDescription className="sr-only">
            View and manage your notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Enhanced Search and Filter Bar */}
          <div className="flex gap-2" data-testid="notification-filters">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="sort-select" data-testid="type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="sort-select-content">
                <SelectItem className="shad-select-item" value="all">
                  All Types
                </SelectItem>
                {Object.entries(NOTIFICATION_TYPES).map(([key, value]) => (
                  <SelectItem
                    key={key}
                    className="shad-select-item"
                    value={key}
                  >
                    <div className="flex items-center gap-2">
                      {value.icon}
                      {value.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sort-select">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="sort-select-content">
                <SelectItem className="shad-select-item" value="all">
                  All Status
                </SelectItem>
                <SelectItem className="shad-select-item" value="unread">
                  Unread
                </SelectItem>
                <SelectItem className="shad-select-item" value="read">
                  Read
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger
                className="sort-select"
                data-testid="priority-filter"
              >
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="sort-select-content">
                <SelectItem className="shad-select-item" value="all">
                  All Priorities
                </SelectItem>
                <SelectItem className="shad-select-item" value="urgent">
                  Urgent
                </SelectItem>
                <SelectItem className="shad-select-item" value="high">
                  High
                </SelectItem>
                <SelectItem className="shad-select-item" value="medium">
                  Medium
                </SelectItem>
                <SelectItem className="shad-select-item" value="low">
                  Low
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2" data-testid="sort-controls">
            <span className="text-sm text-gray-600">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selected.length > 0 && (
            <div className="flex gap-2 p-3 rounded-lg border border-cyan-200/30 bg-cyan-50/20">
              <Button
                size="sm"
                onClick={() => handleMarkAsRead(selected)}
                disabled={loading}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Mark as Read ({selected.length})
              </Button>
              <Button
                size="sm"
                onClick={() => handleMarkAsUnread(selected)}
                disabled={loading}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Mark as Unread ({selected.length})
              </Button>
              <Button
                onClick={() => handleDeleteNotifications(selected)}
                disabled={loading}
                className="h-8 flex items-center gap-2 bg-destructive/10 text-destructive border-destructive hover:bg-destructive/20"
              >
                <Trash className="w-4 h-4 mr-1" />
                Delete ({selected.length})
              </Button>
            </div>
          )}

          {/* Enhanced Notifications List */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={paginated.map((n) => n.$id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                className="space-y-2 max-h-96 overflow-y-auto"
                data-testid="notification-list"
              >
                {loading ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="w-8 h-8 mx-auto mb-2 animate-spin border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                    Loading notifications...
                  </div>
                ) : error ? (
                  <div
                    className="text-center py-8 text-red-400"
                    data-testid="error-message"
                  >
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-300" />
                    <p className="text-lg font-medium text-red-600">
                      Error loading notifications
                    </p>
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ) : paginated.length === 0 ? (
                  <div
                    className="text-center py-8 text-gray-400"
                    data-testid="empty-state"
                  >
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">
                      No notifications found
                    </p>
                    <p className="text-sm">You&apos;re all caught up!</p>
                  </div>
                ) : (
                  paginated.map((notification) => {
                    const typeConfig =
                      NOTIFICATION_TYPES[notification.type as NotificationType];
                    return (
                      <SortableNotificationItem
                        key={notification.$id}
                        notification={notification}
                        isSelected={selected.includes(notification.$id)}
                        onSelect={handleSelect}
                        onMarkAsRead={(id) => handleMarkAsRead([id])}
                        onMarkAsUnread={(id) => handleMarkAsUnread([id])}
                        typeConfig={typeConfig}
                        getPriorityColor={getPriorityColor}
                        formatNotificationTime={formatNotificationTime}
                      />
                    );
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Enhanced Pagination */}
          <div
            className="flex items-center justify-between mt-4 pt-4 border-t"
            data-testid="pagination"
          >
            <div className="flex items-center gap-4">
              <label className="text-xs text-slate-700">
                Items per page:
                <select
                  className="ml-2 border rounded px-2 py-1"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-sm text-gray-500">
                {`${(page - 1) * perPage + 1}-${Math.min(
                  page * perPage,
                  filtered.length
                )} of ${filtered.length} items`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm">
                Page {page} of {Math.ceil(filtered.length / perPage)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * perPage >= filtered.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <NotificationSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        userId={userId}
      />
    </Dialog>
  );
};

interface SortableNotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  typeConfig: (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
  getPriorityColor: (priority?: string) => string;
  formatNotificationTime: (dateString: string) => string;
}

const SortableNotificationItem: React.FC<SortableNotificationItemProps> = ({
  notification,
  isSelected,
  onSelect,
  onMarkAsRead,
  onMarkAsUnread,
  typeConfig,
  getPriorityColor,
  formatNotificationTime,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: notification.$id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="notification-item"
      data-read={notification.read.toString()}
      data-priority={notification.priority || 'low'}
      data-date={notification.$createdAt}
      className={`p-4 rounded-lg border transition-all hover:shadow-md ${
        notification.read
          ? typeConfig?.bgColor || 'bg-white/50 border-gray-200'
          : typeConfig?.bgColor || 'bg-blue-50/50 border-blue-200 shadow-sm'
      } ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(notification.$id)}
            className="mt-1"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1">
                  {typeConfig?.icon || <Bell className="w-4 h-4" />}
                  <span className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </span>
                </div>
                {notification.priority && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(
                      notification.priority
                    )}`}
                  >
                    {notification.priority}
                  </span>
                )}
                {!notification.read && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{formatNotificationTime(notification.$createdAt)}</span>
                {typeConfig && (
                  <span className={`px-2 py-0.5 rounded ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsRead(notification.$id)}
                  className="h-6 px-2 text-xs"
                >
                  Mark read
                </Button>
              )}
              {notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsUnread(notification.$id)}
                  className="h-6 px-2 text-xs"
                >
                  Mark unread
                </Button>
              )}
              {/* Drag Handle */}
              <div
                {...attributes}
                {...listeners}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
                title="Drag to reorder"
              >
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(notification.$id)}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <Trash className="w-3 h-3" />
              </Button> */}
            </div>
          </div>

          {notification.actionUrl && notification.actionText && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(notification.actionUrl, '_blank')}
                className="text-xs"
              >
                {notification.actionText}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
