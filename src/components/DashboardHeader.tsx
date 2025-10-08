'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Mail, LogOut, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';
import NotificationBadge from '@/components/NotificationBadge';
import QuickActions from '@/components/QuickActions';
import { Models } from 'appwrite';
import { signOutUser } from '@/lib/actions/user.actions';
import { getUnreadNotificationsCount } from '@/lib/actions/notification.actions';
import Avatar from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { avatarPlaceholderUrl } from '../../constants';

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
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    (user as any)?.prefs?.avatar || (user as any)?.avatar || undefined
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const fetchUnread = useCallback(async () => {
    // Fetch unread notifications for the current user
    try {
      if (!user) return;
      const count = await getUnreadNotificationsCount(user.$id);
      setUnreadCount(count);
    } catch {}
  }, [user]);

  useEffect(() => {
    // Initial fetch
    fetchUnread();

    // Only poll if user is active and component is mounted
    const interval = setInterval(fetchUnread, 300000); // Poll every 5 minutes

    return () => clearInterval(interval);
  }, [user, fetchUnread]);

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

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.$id) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.$id);
      formData.append('department', '');
      formData.append('uploadId', `avatar_${Date.now()}`);

      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      const newUrl = json?.data?.url as string | undefined;
      if (!newUrl) throw new Error('Missing file URL');

      // Persist to user profile
      await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.$id, avatarUrl: newUrl }),
      });

      setAvatarUrl(newUrl);
      toast({ title: 'Profile photo updated' });
    } catch (e) {
      toast({ title: 'Failed to update photo', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.$id) return;
    try {
      setIsUploading(true);
      await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.$id, avatarUrl: '' }),
      });
      setAvatarUrl(undefined);
      toast({ title: 'Profile photo removed' });
    } catch {
      toast({ title: 'Failed to remove photo', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex gap-4">
      <QuickActions user={user} />
      <header className="bg-white/30 backdrop-blur border border-white/40 shadow-lg mt-6 md:px-9 sm:mr-7 rounded-full mb-6 ml-auto w-fit px-4">
        <div className="flex items-center h-10">
          {/* Action buttons */}
          {user && (
            <div className="flex items-center space-x-2">
              {/* Profile avatar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative flex items-center justify-center rounded-full overflow-hidden w-8 h-8 border border-white/60 bg-white/70 hover:bg-white/90 transition-colors"
                    aria-label="Profile menu"
                    disabled={isUploading}
                  >
                    {avatarUrl && avatarUrl !== avatarPlaceholderUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Avatar name={user.name || (user as any)?.fullName} userId={user.email} size="sm" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={openFilePicker} className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {isUploading ? 'Uploading…' : 'Upload photo'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleRemoveAvatar} className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Remove photo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
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
    </div>
  );
};

export default DashboardHeader;
