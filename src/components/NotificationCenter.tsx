import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/actions/user.actions';
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} from '@/lib/actions/notification.actions';

interface Notification {
  $id: string;
  title: string;
  message: string;
  type: string;
  read?: boolean;
  $createdAt: string;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  open,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!user || !user.accountId) throw new Error('User not found');
        const res = await getNotifications(user.accountId);
        if (res) {
          setNotifications(res.documents as unknown as Notification[]);
        }
      } catch (err) {
        console.log(err);
        toast({
          title: 'Error',
          description: 'Failed to load notifications',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
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
    } finally {
      setLoadingAction(false);
    }
  };

  const deleteNotifications = async (ids: string[]) => {
    setLoadingAction(true);
    try {
      await Promise.all(ids.map((id) => deleteNotification(id)));
      setSelected([]);
    } finally {
      setLoadingAction(false);
    }
  };

  // Search and pagination
  const perPage = 6;
  const filtered = notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <Card className="w-full max-w-2xl bg-white/80 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="sidebar-gradient-text">Notifications</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <span className="sr-only">Close</span>×
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Search Notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/30 backdrop-blur border border-white/40 shadow-md"
            />
          </div>
          {/* Bulk actions */}
          {selected.length > 0 && (
            <div className="flex gap-2 mb-2">
              <Button
                size="sm"
                onClick={() => markAsRead(selected)}
                disabled={loadingAction}
              >
                Mark as Read
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteNotifications(selected)}
                disabled={loadingAction}
              >
                Delete
              </Button>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-white/30">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th>
                    <Checkbox
                      checked={
                        selected.length === notifications.length &&
                        notifications.length > 0
                      }
                      onCheckedChange={(v) =>
                        setSelected(v ? notifications.map((n) => n.$id) : [])
                      }
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                    Title
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                    Message
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                    Read
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/70 divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No notifications found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((n) => (
                    <tr key={n.$id} className={n.read ? '' : 'bg-cyan-50'}>
                      <td>
                        <Checkbox
                          checked={selected.includes(n.$id)}
                          onCheckedChange={() => handleSelect(n.$id)}
                        />
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {n.title}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{n.message}</td>
                      <td className="px-4 py-2 text-xs">
                        <span className="inline-block px-2 py-1 rounded bg-cyan-100 text-cyan-800">
                          {n.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Checkbox
                          checked={!!n.read}
                          disabled
                          className="border-cyan-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {new Date(n.$createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-xs text-slate-500">
              Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} -
              {Math.min(page * perPage, filtered.length)} of {filtered.length}
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
        </CardContent>
      </Card>
    </div>
  ) : null;
};

export default NotificationCenter;
