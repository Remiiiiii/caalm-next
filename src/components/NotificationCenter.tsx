import React, { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/actions/user.actions';
import {
  markNotificationAsRead,
  deleteNotification,
} from '@/lib/actions/notification.actions';
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
import { Search, Bell, Check, Trash } from 'lucide-react';
import Image from 'next/image';

interface Notification {
  $id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  $createdAt: string;
  $updatedAt: string;
}

// Notification type constants
const NOTIFICATION_TYPES = {
  'contract-expiry': {
    label: 'Contract Expiry',
    icon: '📅',
    color: 'bg-red-100 text-red-800',
    bgColor: 'bg-red-50/30 border-red-400',
  },
  system: {
    label: 'System',
    icon: '⚙️',
    color: 'bg-blue-100 text-blue-800',
    bgColor: 'bg-blue-50/30 border-blue-400',
  },
  user: {
    label: 'User',
    icon: '👤',
    color: 'bg-green-100 text-green-800',
    bgColor: 'bg-green-50/30 border-green-400',
  },
  file: {
    label: 'File',
    icon: (
      <Image
        src="/assets/icons/documents.svg"
        alt="contracts"
        width={12}
        height={12}
      />
    ),
    color: 'bg-purple-100 text-purple-800',
    bgColor: 'bg-purple-50/30 border-purple-400',
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const user = await getCurrentUser();
        if (!user || !user.$id) throw new Error('User not found');
        targetUserId = user.$id;
      }
      console.log('Fetching notifications for user ID:', targetUserId);
      console.log('Passed userId prop:', userId);

      // Fetch notifications for the specific user
      const res = await fetch(`/api/notifications/user/${targetUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await res.json();

      console.log('Notifications found for user:', data.documents.length);

      if (data) {
        setNotifications(data.documents as unknown as Notification[]);
      }
    } catch (err) {
      console.log('Error fetching notifications:', err);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchNotifications();
  }, [open, toast]);

  // Poll for new notifications every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      // fetchNotifications(); // This line was removed as per the new_code
    }, 10000);
    return () => clearInterval(interval);
  }, [notifications]); // Added notifications to dependency array

  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const markAsRead = async (ids: string[]) => {
    setLoadingAction(true);
    try {
      await Promise.all(ids.map((id) => markNotificationAsRead(id)));
      setSelected([]);
      // Refresh notifications after marking as read
      await fetchNotifications();
      // Notify parent to refresh unread count
      onRefresh?.();
    } finally {
      setLoadingAction(false);
    }
  };

  const deleteNotifications = async (ids: string[]) => {
    setLoadingAction(true);
    try {
      await Promise.all(ids.map((id) => deleteNotification(id)));
      setSelected([]);
      // Refresh notifications after deletion
      await fetchNotifications();
      // Notify parent to refresh unread count
      onRefresh?.();
    } finally {
      setLoadingAction(false);
    }
  };

  // Search and pagination
  const filtered = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    return matchesSearch && matchesType;
  });
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Helper function to format notification data
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl bg-white/95 backdrop-blur border border-white/40 shadow-xl">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-cyan-600" />
            <DialogTitle className="text-xl font-bold sidebar-gradient-text">
              Notifications
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            View and manage your notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex gap-3">
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
              <SelectTrigger className="sort-select">
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
                    {value.icon} {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selected.length > 0 && (
            <div className="flex gap-2 p-3  rounded-lg border border-cyan-200/30">
              <Button
                size="sm"
                onClick={() => markAsRead(selected)}
                disabled={loadingAction}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Mark as Read ({selected.length})
              </Button>
              <Button
                onClick={() => deleteNotifications(selected)}
                disabled={loadingAction}
                className="h-8 flex items-center gap-2 bg-destructive/10 text-destructive border-destructive hover:bg-destructive/20"
              >
                <Trash className="w-4 h-4 mr-1" />
                <span>{selected.length}</span>
              </Button>
            </div>
          )}

          {/* Notifications Table */}
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-center align-middle">
                    <Checkbox
                      checked={
                        selected.length === paginated.length &&
                        paginated.length > 0
                      }
                      onCheckedChange={(v) =>
                        setSelected(v ? paginated.map((n) => n.$id) : [])
                      }
                    />
                  </th>
                  <th className="text-slate-700">Title</th>
                  <th className="text-slate-700">Message</th>
                  <th className="text-slate-700">Type</th>
                  <th className="text-slate-700">Status</th>
                  <th className="text-slate-700">Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      Loading notifications...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      <div className="flex flex-col items-center">
                        <Bell className="w-12 h-12 mb-3 text-gray-300" />
                        <p className="text-lg font-medium">
                          No notifications found
                        </p>
                        <p className="text-sm">You&apos;re all caught up!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((n) => (
                    <tr
                      key={n.$id}
                      className={`border-b hover:bg-gray-50 transition`}
                    >
                      <td className="text-center align-middle py-4">
                        <Checkbox
                          checked={selected.includes(n.$id)}
                          onCheckedChange={() => handleSelect(n.$id)}
                        />
                      </td>
                      <td className="pl-2 font-medium text-slate-900 max-w-xs">
                        <div className="truncate">{n.title}</div>
                      </td>
                      <td className="text-slate-700 max-w-md">
                        <div className="line-clamp-2">{n.message}</div>
                      </td>
                      <td>
                        <span
                          className="flex items-center gap-2 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800'
                         "
                        >
                          {NOTIFICATION_TYPES[n.type as NotificationType]
                            ?.icon || '📢'}{' '}
                          {NOTIFICATION_TYPES[n.type as NotificationType]
                            ?.label || n.type}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            n.read
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {n.read ? 'Read' : 'Unread'}
                        </span>
                      </td>
                      <td className="text-slate-500">
                        {formatNotificationTime(n.$createdAt)}
                      </td>
                      <td>
                        {!n.read && (
                          <Button variant="link" size="sm">
                            Mark as read
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bulk Actions */}
          {selected.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">
                  {selected.length} notification
                  {selected.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsRead(selected)}
                  disabled={loadingAction}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Mark as read
                </Button> */}
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div>
              <label className="text-xs text-slate-700">
                Items per page:
                <select
                  className="ml-2 border rounded px-2 py-1"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  {[6, 10, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <span className="ml-4 text-gray-500">
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
                Prev
              </Button>
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
    </Dialog>
  );
};

export default NotificationCenter;
