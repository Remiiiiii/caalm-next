'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Bell, Mail, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';
import { Client, TablesDB, Query } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Models } from 'appwrite';
import { signOutUser } from '@/lib/actions/user.actions';

interface DashboardHeaderProps {
  user?: Models.User<Models.Preferences> | null;
}

const DashboardHeader = ({ user }: DashboardHeaderProps) => {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      // Fetch unread notifications for the current user
      try {
        if (!user) return;
        const client = new Client();
        client
          .setEndpoint(appwriteConfig.endpointUrl)
          .setProject(appwriteConfig.projectId);
        const tablesDB = new TablesDB(client);
        const res = await tablesDB.listRows({
          databaseId: appwriteConfig.databaseId,
          tableId: 'notifications',
          queries: [
            Query.equal('userId', user.$id),
            Query.equal('read', false),
          ],
        });
        setUnreadCount(res.total);
      } catch {}
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [user]);

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

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'head_admin':
        return 'Executive';
      case 'manager':
        return 'Manager';
      case 'hr_admin':
        return 'Admin';
      default:
        return role;
    }
  };

  return (
    <header className="bg-background shadow-drop-1 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-coral" />
            <span className="ml-2 text-2xl font-bold text-navy font-poppins">
              CAALM Solutions
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="text-sm text-foreground">
                  <p className="font-medium text-navy">{user.name}</p>
                  <p className="text-xs text-slate-dark">
                    {getRoleDisplay(user.prefs?.role || '')} -{' '}
                    {user.prefs?.division || 'Unknown Division'}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setNotifOpen(true)}
                  className="relative"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs rounded-full px-1.5 py-0.5 border-2 border-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-coral/10"
                >
                  <Mail className="h-5 w-5 text-slate-dark" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="hover:bg-coral/10"
                >
                  <LogOut className="h-5 w-5 text-slate-dark" />
                </Button>
              </>
            ) : (
              // Guest/loading state
              <div className="text-sm text-foreground">
                <p className="font-medium text-navy">Welcome</p>
                <p className="text-xs text-slate-dark">Loading...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <NotificationCenter
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </header>
  );
};

export default DashboardHeader;
