import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
  Bell,
  Settings,
  Mail,
  Clock,
  Shield,
  Calendar,
  FileText,
  Users,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { appwriteConfig } from '@/lib/appwrite/config';
import { client } from '@/lib/appwrite/client';
import { RealtimeResponseEvent } from 'appwrite';

interface NotificationSettingsProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
}

interface NotificationPreference {
  type: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const NOTIFICATION_TYPES = {
  'contract-expiry': {
    label: 'Contract Expiry',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Notifications when contracts are about to expire',
    defaultPriority: 'high' as const,
  },
  'contract-renewal': {
    label: 'Contract Renewal',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Notifications for contract renewal opportunities',
    defaultPriority: 'medium' as const,
  },
  'audit-due': {
    label: 'Audit Due',
    icon: <Shield className="w-4 h-4" />,
    description: 'Notifications when audits are due',
    defaultPriority: 'high' as const,
  },
  'compliance-alert': {
    label: 'Compliance Alert',
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'Critical compliance and regulatory alerts',
    defaultPriority: 'urgent' as const,
  },
  'file-uploaded': {
    label: 'File Uploaded',
    icon: <FileText className="w-4 h-4" />,
    description: 'Notifications when new files are uploaded',
    defaultPriority: 'low' as const,
  },
  'user-invited': {
    label: 'User Invited',
    icon: <Users className="w-4 h-4" />,
    description: 'Notifications when users are invited to the system',
    defaultPriority: 'medium' as const,
  },
  'system-update': {
    label: 'System Update',
    icon: <Zap className="w-4 h-4" />,
    description: 'System maintenance and update notifications',
    defaultPriority: 'low' as const,
  },
  'performance-metric': {
    label: 'Performance Metric',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'Performance and analytics notifications',
    defaultPriority: 'medium' as const,
  },
  'deadline-approaching': {
    label: 'Deadline Approaching',
    icon: <Clock className="w-4 h-4" />,
    description: 'Notifications for approaching deadlines',
    defaultPriority: 'high' as const,
  },
  'task-completed': {
    label: 'Task Completed',
    icon: <CheckCircle className="w-4 h-4" />,
    description: 'Notifications when tasks are completed',
    defaultPriority: 'low' as const,
  },
  info: {
    label: 'Information',
    icon: <Info className="w-4 h-4" />,
    description: 'General information notifications',
    defaultPriority: 'low' as const,
  },
} as const;

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  open,
  onClose,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [saving, setSaving] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    emailNotifications: false,
    pushNotifications: false,
    inAppNotifications: true,
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    digestFrequency: 'daily',
    maxNotificationsPerDay: 50,
  });
  const { user } = useAuth();
  const { toast } = useToast();
  // Push notifications removed

  // Load settings from API on open
  useEffect(() => {
    if (!open || !user?.$id) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(
          `/api/notification-settings?userId=${user.$id}`,
          {
            signal: controller.signal,
          }
        );
        const { data } = await res.json();
        let defaultPreferences: NotificationPreference[] = Object.entries(
          NOTIFICATION_TYPES
        ).map(([type, config]) => ({
          type,
          email: false,
          push: false,
          inApp: true,
          priority: config.defaultPriority,
        }));
        if (data?.notification_types?.length) {
          const enabled = new Set<string>(data.notification_types);
          defaultPreferences = defaultPreferences.map((pref) => ({
            ...pref,
            email: enabled.has(pref.type),
            push: enabled.has(pref.type),
          }));
        }
        setPreferences(defaultPreferences);
        if (data) {
          setGlobalSettings((prev) => ({
            ...prev,
            emailNotifications: !!data.email_enabled,
            pushNotifications: !!data.push_enabled,
            digestFrequency: (data.frequency as string) || 'daily',
          }));
        }
      } catch {
        // noop
      }
    };
    load();
    return () => controller.abort();
  }, [open, user?.$id]);

  // Realtime updates
  useEffect(() => {
    if (!open || !user?.$id) return;
    const sub = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationSettingsCollectionId}.documents`,
      (event: RealtimeResponseEvent<Record<string, unknown>>) => {
        const payload = event.payload as Record<string, unknown> & {
          user_id?: string;
          email_enabled?: boolean;
          push_enabled?: boolean;
          frequency?: string;
          phone_number?: string;
        };
        if (payload.user_id === user.$id) {
          setGlobalSettings((prev) => ({
            ...prev,
            emailNotifications: !!payload.email_enabled,
            pushNotifications: !!payload.push_enabled,
            digestFrequency:
              (payload.frequency as string) || prev.digestFrequency,
          }));
          // phone number is retained in DB; UI entry removed
        }
      }
    );
    return () => {
      try {
        sub();
      } catch {}
    };
  }, [open, user?.$id]);

  const handlePreferenceChange = (
    type: string,
    field: keyof NotificationPreference,
    value: boolean | string
  ) => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.type === type ? { ...pref, [field]: value } : pref
      )
    );
  };

  const handleGlobalSettingChange = (
    field: string,
    value: boolean | string | number
  ) => {
    setGlobalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.$id,
          emailEnabled: globalSettings.emailNotifications,
          pushEnabled: globalSettings.pushNotifications,
          // phoneNumber removed from UI; use stored DB value if needed
          phoneNumber: undefined,
          notificationTypes: preferences
            .filter((p) => p.email || p.push || p.inApp)
            .map((p) => p.type),
          frequency: globalSettings.digestFrequency as
            | 'daily'
            | 'weekly'
            | 'instant',
        }),
      });
      if (!res.ok) throw new Error('Save failed');

      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save notification settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaultPreferences: NotificationPreference[] = Object.entries(
      NOTIFICATION_TYPES
    ).map(([type, config]) => ({
      type,
      email: true,
      push: true,
      inApp: true,
      priority: config.defaultPriority,
    }));
    setPreferences(defaultPreferences);
    setGlobalSettings({
      emailNotifications: true,
      pushNotifications: true,
      inAppNotifications: true,
      quietHours: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      digestFrequency: 'daily',
      maxNotificationsPerDay: 50,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl bg-white/95 backdrop-blur border border-white/40 shadow-xl">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-cyan-600" />
            <DialogTitle className="text-xl font-bold sidebar-gradient-text">
              Notification Settings
            </DialogTitle>
          </div>
          <DialogDescription>
            Configure how and when you receive notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Global Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Global Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-5">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Notifications
                  </Label>
                  <Switch
                    checked={globalSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      handleGlobalSettingChange('emailNotifications', checked)
                    }
                  />
                </div>

                {/* Push Notifications removed */}

                <div className="flex items-center gap-2">
                  <Label className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    In-App Notifications
                  </Label>
                  <Switch
                    checked={globalSettings.inAppNotifications}
                    onCheckedChange={(checked) =>
                      handleGlobalSettingChange('inAppNotifications', checked)
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Quiet Hours
                  </Label>
                  <Switch
                    checked={globalSettings.quietHours}
                    onCheckedChange={(checked) =>
                      handleGlobalSettingChange('quietHours', checked)
                    }
                  />
                </div>

                {globalSettings.quietHours && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Start Time</Label>
                      <Input
                        type="time"
                        value={globalSettings.quietHoursStart}
                        onChange={(e) =>
                          handleGlobalSettingChange(
                            'quietHoursStart',
                            e.target.value
                          )
                        }
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End Time</Label>
                      <Input
                        type="time"
                        value={globalSettings.quietHoursEnd}
                        onChange={(e) =>
                          handleGlobalSettingChange(
                            'quietHoursEnd',
                            e.target.value
                          )
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Digest Frequency</Label>
                  <Select
                    value={globalSettings.digestFrequency}
                    onValueChange={(value) =>
                      handleGlobalSettingChange('digestFrequency', value)
                    }
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Type Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Notification Types
            </h3>

            <div className="space-y-3">
              {preferences.map((preference) => {
                const typeConfig =
                  NOTIFICATION_TYPES[
                    preference.type as keyof typeof NOTIFICATION_TYPES
                  ];
                return (
                  <div
                    key={preference.type}
                    className="p-4 border rounded-lg bg-white/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {typeConfig?.icon}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {typeConfig?.label}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {typeConfig?.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${preference.type}-email`}
                          checked={preference.email}
                          onCheckedChange={(checked) =>
                            handlePreferenceChange(
                              preference.type,
                              'email',
                              checked
                            )
                          }
                        />
                        <Label
                          htmlFor={`${preference.type}-email`}
                          className="text-sm"
                        >
                          Email
                        </Label>
                      </div>

                      {/* Push channel removed */}

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${preference.type}-inapp`}
                          checked={preference.inApp}
                          onCheckedChange={(checked) =>
                            handlePreferenceChange(
                              preference.type,
                              'inApp',
                              checked
                            )
                          }
                        />
                        <Label
                          htmlFor={`${preference.type}-inapp`}
                          className="text-sm"
                        >
                          In-App
                        </Label>
                      </div>

                      <div>
                        <Label className="text-xs">Priority</Label>
                        <Select
                          value={preference.priority}
                          onValueChange={(value) =>
                            handlePreferenceChange(
                              preference.type,
                              'priority',
                              value
                            )
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="text-sm"
          >
            Reset to Defaults
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="text-sm">
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="text-sm"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Phone dialog removed */}
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettings;
