'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, MessageSquare, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NotificationSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    contractUpdates: true,
    licenseExpiry: true,
    taskAssignments: true,
    systemAlerts: false,
    weeklyReports: true,
  });
  const { toast } = useToast();

  const handleToggle = (key: string) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement notification settings update logic with Appwrite
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

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
        <span className="text-sm font-medium text-dark-200">
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
            <Label className="text-sm text-light-200">Contract Updates</Label>
            <p className="text-xs text-light-200">
              Get notified about contract changes
            </p>
          </div>
          <Switch
            checked={notifications.contractUpdates}
            onCheckedChange={() => handleToggle('contractUpdates')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-light-200">License Expiry</Label>
            <p className="text-xs text-light-200">
              Reminders for expiring licenses
            </p>
          </div>
          <Switch
            checked={notifications.licenseExpiry}
            onCheckedChange={() => handleToggle('licenseExpiry')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-light-200">Task Assignments</Label>
            <p className="text-xs text-light-200">
              Notifications for new task assignments
            </p>
          </div>
          <Switch
            checked={notifications.taskAssignments}
            onCheckedChange={() => handleToggle('taskAssignments')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm text-light-200">System Alerts</Label>
            <p className="text-xs text-light-200">
              Important system maintenance alerts
            </p>
          </div>
          <Switch
            checked={notifications.systemAlerts}
            onCheckedChange={() => handleToggle('systemAlerts')}
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
