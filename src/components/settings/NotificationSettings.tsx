'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const NotificationSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    emailNotifications: false,
    pushNotifications: false,
    weeklyReports: false,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const handleToggle = (key: string) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  useEffect(() => {
    const load = async () => {
      if (!user?.$id) return;
      try {
        const res = await fetch(
          `/api/notification-settings?userId=${user.$id}`
        );
        const { data } = await res.json();
        if (data) {
          setNotifications((prev) => ({
            ...prev,
            emailNotifications: !!data.email_enabled,
            pushNotifications: !!data.push_enabled,
            weeklyReports: data.frequency === 'weekly',
          }));
        }
      } catch {}
    };
    load();
  }, [user?.$id]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.$id,
          emailEnabled: notifications.emailNotifications,
          pushEnabled: notifications.pushNotifications,
          frequency: notifications.weeklyReports ? 'weekly' : 'instant',
        }),
      });

      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save notification settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-blue-500" />
        <span className="text-sm font-medium text-navy">
          Notification Preferences
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-light-200">
              Email Notifications
            </Label>
            <p className="text-xs text-light-200">
              Receive notifications via email
            </p>
          </div>
          <Switch
            checked={notifications.emailNotifications}
            onCheckedChange={() => handleToggle('emailNotifications')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-light-200">Push Notifications</Label>
            <p className="text-xs text-light-200">
              Enable browser push notifications
            </p>
          </div>
          <Switch
            checked={notifications.pushNotifications}
            onCheckedChange={() => handleToggle('pushNotifications')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-light-200">Weekly Reports</Label>
            <p className="text-xs text-light-200">
              Receive weekly summary reports
            </p>
          </div>
          <Switch
            checked={notifications.weeklyReports}
            onCheckedChange={() => handleToggle('weeklyReports')}
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-blue-500 hover:bg-blue-600"
      >
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
};

export default NotificationSettings;
