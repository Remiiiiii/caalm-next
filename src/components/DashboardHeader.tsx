'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Mail, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';
import NotificationBadge from '@/components/NotificationBadge';
import { Models } from 'appwrite';
import { signOutUser } from '@/lib/actions/user.actions';
import { getUnreadNotificationsCount } from '@/lib/actions/notification.actions';

interface DashboardHeaderProps {
  user?:
    | (Models.User<Models.Preferences> & {
        fullName?: string;
        role?: string;
        department?: string;
      })
    | null;
}

const DashboardHeader = ({ user }: DashboardHeaderProps) => {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    // Fetch unread notifications for the current user
    try {
      if (!user) return;
      const count = await getUnreadNotificationsCount(user.$id);
      setUnreadCount(count);
    } catch {}
  };

  useEffect(() => {
    // Initial fetch
    fetchUnread();

    // Only poll if user is active and component is mounted
    const interval = setInterval(fetchUnread, 300000); // Poll every 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  // Refresh count when notification center is closed
  const handleNotificationClose = () => {
    setNotifOpen(false);
    fetchUnread(); // Refresh count after any actions
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/sign-in');
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: redirect anyway
      router.push('/sign-in');
    }
  };

  return (
    <header className="bg-white/30 backdrop-blur border border-white/40 shadow-lg mt-6 md:px-9 sm:mr-7 rounded-full mb-6 ml-auto w-fit px-4">
      <div className="flex items-center h-10">
        {/* Action buttons */}
        {user && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={() => setNotifOpen(true)}
              className="relative hover:bg-white/40 text-slate-700"
            >
              <Bell className="w-6 h-6" />
              <NotificationBadge
                count={unreadCount}
                size="sm"
                className="absolute -top-1 -right-1"
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/40 text-slate-700"
            >
              <Mail className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-white/40 text-slate-700"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
      <NotificationCenter
        open={notifOpen}
        onClose={handleNotificationClose}
        onRefresh={fetchUnread}
        userId={user?.$id}
      />
    </header>
  );
};

export default DashboardHeader;
