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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './ui/alert-dialog';
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
  MessageSquare,
  Trash2,
  Ban,
  Save,
  RotateCcw,
  Globe,
  Smartphone,
  ShieldCheck,
  ShieldX,
  BellOff,
  ClockArrowDown,
  CalendarSync,
  CalendarClock,
  FileUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { appwriteConfig } from '@/lib/appwrite/config';
import { client } from '@/lib/appwrite/client';
import { RealtimeResponseEvent } from 'appwrite';
import { SmsFormDialog } from './SmsFormDialog';

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
  sms: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const NOTIFICATION_TYPES = {
  'contract-expiry': {
    label: 'Contract Expiry',
    icon: <CalendarClock className="w-4 h-4 text-[#0f5384]" />,
    description: 'Notifications when contracts are about to expire',
    defaultPriority: 'high' as const,
  },
  'contract-renewal': {
    label: 'Contract Renewal',
    icon: <CalendarSync className="w-4 h-4 text-[#0f5384]" />,
    description: 'Notifications for contract renewal opportunities',
    defaultPriority: 'medium' as const,
  },
  'audit-due': {
    label: 'Audit Due',
    icon: <CalendarClock className="w-4 h-4 text-[#0f5384]" />,
    description: 'Notifications when audits are due',
    defaultPriority: 'high' as const,
  },
  'compliance-alert': {
    label: 'Compliance Alert',
    icon: <AlertTriangle className="w-4 h-4 text-[#0f5384]" />,
    description: 'Critical compliance and regulatory alerts',
    defaultPriority: 'urgent' as const,
  },
  'file-uploaded': {
    label: 'File Uploaded',
    icon: <FileUp className="w-4 h-4 text-[#0f5384]" />,
    description: 'Notifications when new files are uploaded',
    defaultPriority: 'low' as const,
  },
  'user-invited': {
    label: 'User Invited',
    icon: <Users className="w-4 h-4 text-[#0f5384]" />,
    description: 'Notifications when users are invited to the system',
    defaultPriority: 'medium' as const,
  },
  'system-update': {
    label: 'System Update',
    icon: <Zap className="w-4 h-4 text-[#0f5384]" />,
    description: 'System maintenance and update notifications',
    defaultPriority: 'low' as const,
  },
  'performance-metric': {
    label: 'Performance Metric',
    icon: <TrendingUp className="w-4 h-4 text-[#0f5384]" />,
    description: 'Performance and analytics notifications',
    defaultPriority: 'medium' as const,
  },
  'deadline-approaching': {
    label: 'Deadline Approaching',
    icon: <Clock className="w-4 h-4 text-[#0f5384]" />,
    description: 'Notifications for approaching deadlines',
    defaultPriority: 'high' as const,
  },
  'task-completed': {
    label: 'Task Completed',
    icon: <CheckCircle className="w-4 h-4 text-[#0f5384]" />,
    description: 'Notifications when tasks are completed',
    defaultPriority: 'low' as const,
  },
  info: {
    label: 'Information',
    icon: <Info className="w-4 h-4 text-[#0f5384]" />,
    description: 'General information notifications',
    defaultPriority: 'low' as const,
  },
} as const;

// Generate time options in 12-hour format (30-minute intervals)
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Format as 12-hour time
      const hours12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const minutesStr = minute.toString().padStart(2, '0');
      const displayTime = `${hours12}:${minutesStr} ${ampm}`;

      // Also create the 24-hour format for storage
      const hours24 = hour.toString().padStart(2, '0');
      const time24 = `${hours24}:${minutesStr}`;

      times.push({
        value: time24, // Store as 24-hour format
        label: displayTime, // Display as 12-hour format
      });
    }
  }
  return times;
};

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  open,
  onClose,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [saving, setSaving] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    emailNotifications: false,
    pushNotifications: false,
    phoneNumber: '',
    inAppNotifications: true,
    smsNotifications: false,
    quietHours: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    digestFrequency: 'daily',
    maxNotificationsPerDay: 50,
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showSmsSetupModal, setShowSmsSetupModal] = useState(false);
  const [smsFormSubmitted, setSmsFormSubmitted] = useState(false);
  const [formSubmissionPhoneNumber, setFormSubmissionPhoneNumber] = useState<
    string | null
  >(null);
  const [checkingFormStatus, setCheckingFormStatus] = useState(false);
  const [hasShownPhoneMismatch, setHasShownPhoneMismatch] = useState(false);
  const [phoneNumberVerified, setPhoneNumberVerified] = useState(false);
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
          sms: false,
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
            smsNotifications: !!data.phone_number,
            phoneNumber: data.phone_number || '',
            digestFrequency: (data.frequency as string) || 'daily',
          }));
          const savedPhoneNumber = (data.phone_number as string) || '';
          setPhoneNumber(savedPhoneNumber);
          // Phone number verification will be set after form status check
          // to ensure it matches the form submission
        }
      } catch {
        // noop
      }
    };
    load();
    return () => controller.abort();
  }, [open, user?.$id]);

  // Check SMS form submission status on open
  useEffect(() => {
    if (!open || !user?.$id) return;
    const controller = new AbortController();
    const checkFormStatus = async () => {
      setCheckingFormStatus(true);
      try {
        const res = await fetch(`/api/sms-form-submission?userId=${user.$id}`, {
          signal: controller.signal,
        });
        const result = await res.json();
        // Enable switch whenever a row exists in SMS form submissions collection
        if (result.submitted) {
          setSmsFormSubmitted(true);
          // Enable SMS Notifications switch if a submission exists
          handleGlobalSettingChange('smsNotifications', true);
          // Store the phone number from form submission for comparison
          // Do NOT auto-populate - user must enter it manually to verify
          if (result.data?.phone_number) {
            const dbPhoneNumber = result.data.phone_number;
            setFormSubmissionPhoneNumber(dbPhoneNumber);
            // Don't pre-fill phone number field - user needs to enter it manually for verification
            // Only set if it's empty to avoid overwriting user input
            if (!phoneNumber.trim()) {
              setPhoneNumber('');
            }
            // Check if saved phone number matches form submission (already verified)
            // Use normalizePhoneNumber for comparison (defined later in component)
            if (phoneNumber.trim()) {
              const normalizePhone = (phone: string): string => {
                if (!phone) return '';
                const digits = phone.replace(/\D/g, '');
                if (!digits) return '';
                if (digits.length === 10) return '+1' + digits;
                if (digits.length === 11 && digits.startsWith('1'))
                  return '+' + digits;
                return '+' + digits;
              };
              const normalized1 = normalizePhone(dbPhoneNumber);
              const normalized2 = normalizePhone(phoneNumber);
              if (normalized1 === normalized2) {
                setPhoneNumberVerified(true);
              }
            }
            // Debug logging in development
            if (process.env.NODE_ENV === 'development') {
              console.log(
                'Form submission phone number from DB:',
                dbPhoneNumber
              );
            }
          }
        } else {
          setSmsFormSubmitted(false);
          setFormSubmissionPhoneNumber(null);
          // Disable SMS Notifications switch if no submission exists
          handleGlobalSettingChange('smsNotifications', false);
        }
      } catch {
        setSmsFormSubmitted(false);
        handleGlobalSettingChange('smsNotifications', false);
      } finally {
        setCheckingFormStatus(false);
      }
    };
    checkFormStatus();
    return () => controller.abort();
  }, [open, user?.$id]);

  // When SMS is disabled, clear all per-type SMS selections
  useEffect(() => {
    if (!globalSettings.smsNotifications) {
      setPreferences((prev) => prev.map((p) => ({ ...p, sms: false })));
      // Also disable SMS Notifications switch when Enable SMS is off
      handleGlobalSettingChange('pushNotifications', false);
      // Reset verified state when SMS is disabled
      setPhoneNumberVerified(false);
    }
  }, [globalSettings.smsNotifications]);

  // Auto-enable SMS Notifications when Enable SMS is on AND phone number matches form submission
  useEffect(() => {
    if (
      globalSettings.smsNotifications &&
      phoneNumber.trim() &&
      formSubmissionPhoneNumber &&
      phoneNumber.replace(/\D/g, '').length >= 10 // Only check if we have at least 10 digits
    ) {
      const matches = comparePhoneNumbers(
        formSubmissionPhoneNumber,
        phoneNumber
      );
      if (matches && !globalSettings.pushNotifications) {
        // Only enable if phone numbers match
        setGlobalSettings((prev) => ({ ...prev, pushNotifications: true }));
      } else if (!matches && globalSettings.pushNotifications) {
        // Disable if phone numbers don't match
        setGlobalSettings((prev) => ({ ...prev, pushNotifications: false }));
      }
    } else if (
      !phoneNumber.trim() &&
      globalSettings.pushNotifications &&
      globalSettings.smsNotifications &&
      !formSubmissionPhoneNumber
    ) {
      // Only disable if phone number is cleared AND there's no form submission phone number
      // This prevents disabling right after form submission when phone number is cleared
      // to allow user to enter it manually for verification
      // If formSubmissionPhoneNumber exists, keep the switch state as-is until user enters number
      setGlobalSettings((prev) => ({ ...prev, pushNotifications: false }));
    }
    // If formSubmissionPhoneNumber exists but phoneNumber is empty, don't change pushNotifications state
    // This prevents the flicker after form submission
  }, [
    globalSettings.smsNotifications,
    phoneNumber || '',
    globalSettings.pushNotifications,
    formSubmissionPhoneNumber || '', // Use empty string instead of null to keep array stable
  ]);

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
            phoneNumber: (payload.phone_number as string) || prev.phoneNumber,
            digestFrequency:
              (payload.frequency as string) || prev.digestFrequency,
          }));
          if (typeof payload.phone_number === 'string') {
            setPhoneNumber(payload.phone_number);
          }
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
    // Validate phone number match if SMS notifications are enabled
    if (globalSettings.smsNotifications && formSubmissionPhoneNumber) {
      if (!phoneNumber.trim()) {
        toast({
          title: 'Phone Number Required',
          description:
            'Please enter your phone number in the SMS Phone Number field to enable SMS notifications.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const matches = comparePhoneNumbers(
        formSubmissionPhoneNumber,
        phoneNumber
      );
      if (!matches) {
        toast({
          title: 'Phone Number Mismatch',
          description:
            'The phone number you entered does not match the phone number provided in the SMS setup form. Please enter the correct phone number.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
    }

    setSaving(true);
    try {
      const sanitizedPhone = formatUSPhoneToE164(phoneNumber);
      const res = await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.$id,
          emailEnabled: globalSettings.emailNotifications,
          pushEnabled: globalSettings.pushNotifications,
          phoneNumber: sanitizedPhone || undefined,
          notificationTypes: preferences
            .filter((p) => p.email || p.push || p.inApp || p.sms)
            .map((p) => p.type),
          frequency: globalSettings.digestFrequency as
            | 'daily'
            | 'weekly'
            | 'instant',
        }),
      });
      if (!res.ok) throw new Error('Save failed');

      // If SMS notifications are enabled and phone numbers matched, mark as verified
      if (
        globalSettings.smsNotifications &&
        formSubmissionPhoneNumber &&
        phoneNumber.trim()
      ) {
        const matches = comparePhoneNumbers(
          formSubmissionPhoneNumber,
          phoneNumber
        );
        if (matches) {
          setPhoneNumberVerified(true);
        }
      }

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
      sms: false,
      priority: config.defaultPriority,
    }));
    setPreferences(defaultPreferences);
    setGlobalSettings({
      emailNotifications: true,
      pushNotifications: true,
      phoneNumber: '',
      inAppNotifications: true,
      smsNotifications: false,
      quietHours: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      digestFrequency: 'daily',
      maxNotificationsPerDay: 50,
    });
  };

  // Normalize phone number for comparison
  // Handles: (555) 123-4567 → +15551234567 or 5551234567 → +15551234567
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return '';

    // Extract all digits
    const digits = phone.replace(/\D/g, '');

    if (!digits) return '';

    // If 10 digits, add +1 prefix (US number)
    if (digits.length === 10) {
      return '+1' + digits;
    }

    // If 11 digits starting with 1, add + prefix
    if (digits.length === 11 && digits.startsWith('1')) {
      return '+' + digits;
    }

    // For any other format, just add + prefix
    return '+' + digits;
  };

  // Compare two phone numbers (lenient with formatting)
  const comparePhoneNumbers = (phone1: string, phone2: string): boolean => {
    if (!phone1 || !phone2) return false;
    const normalized1 = normalizePhoneNumber(phone1);
    const normalized2 = normalizePhoneNumber(phone2);

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Phone comparison:', {
        original1: phone1,
        original2: phone2,
        normalized1,
        normalized2,
        match: normalized1 === normalized2,
      });
    }

    return normalized1 === normalized2;
  };

  const formatUSPhoneToE164 = (input: string): string => {
    const digits = (input || '').replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length === 12 && digits.startsWith('01'))
      return `+${digits.slice(1)}`;
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
        {/* Professional Cap */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

        {/* Header with gradient background */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
          <div className="flex items-center gap-3 px-6">
            <Settings className="w-5 h-5 text-[#0f5384]" />
            <DialogTitle className="text-xl font-semibold sidebar-gradient-text">
              Notification Settings
            </DialogTitle>
          </div>
          <p className="text-sm text-slate-600 mt-1 ml-14">
            Configure how and when you receive notifications
          </p>
          <DialogDescription className="sr-only">
            Configure how and when you receive notifications
          </DialogDescription>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          {/* Global Settings */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#0f5384]" />
                Global Settings
              </h3>
              <div className="flex items-center gap-2">
                <Label className="flex items-center gap-2">
                  {globalSettings.smsNotifications ? (
                    <>
                      <ShieldX className="w-4 h-4 text-[#0f5384]" />
                      Disable SMS Notifications
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#0f5384]" />
                      Enable SMS Notifications
                    </>
                  )}
                </Label>
                <Switch
                  checked={globalSettings.smsNotifications}
                  disabled={checkingFormStatus}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      // Always allow toggle ON - show form dialog if not submitted
                      if (!smsFormSubmitted) {
                        // Temporarily enable switch to show it's ON, then show dialog
                        handleGlobalSettingChange('smsNotifications', true);
                        setShowSmsSetupModal(true);
                      } else {
                        // Form already submitted, just enable SMS
                        handleGlobalSettingChange('smsNotifications', true);
                      }
                    } else {
                      // Toggling OFF - disable SMS notifications
                      try {
                        const res = await fetch(
                          `/api/sms-form-submission?userId=${user?.$id}`,
                          {
                            method: 'DELETE',
                          }
                        );

                        const result = await res.json();

                        // Handle both success cases: newly disabled or already disabled
                        if (!res.ok && !result.alreadyDisabled) {
                          throw new Error(
                            result.error ||
                              'Failed to disable SMS notifications'
                          );
                        }

                        // Disable SMS Notifications switch
                        handleGlobalSettingChange('smsNotifications', false);
                        // Also disable SMS Notifications switch (pushNotifications)
                        handleGlobalSettingChange('pushNotifications', false);
                        // Clear form submission state
                        setSmsFormSubmitted(false);
                        setFormSubmissionPhoneNumber(null);
                        // Clear phone number field
                        setPhoneNumber('');
                        // Reset verified state
                        setPhoneNumberVerified(false);

                        toast({
                          title: 'SMS Notifications Disabled',
                          description: result.alreadyDisabled
                            ? 'SMS notifications were already disabled.'
                            : 'SMS notifications have been disabled. You will need to re-verify to enable them again.',
                        });
                      } catch (error: any) {
                        console.error(
                          'Failed to disable SMS notifications:',
                          error
                        );
                        toast({
                          title: 'Error',
                          description:
                            error.message ||
                            'Failed to disable SMS notifications. Please try again.',
                          variant: 'destructive',
                        });
                        // Revert switch state on error
                        handleGlobalSettingChange('smsNotifications', true);
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-5">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#0f5384]" />
                      Email Notifications
                    </Label>
                    <Switch
                      checked={globalSettings.emailNotifications}
                      onCheckedChange={(checked) =>
                        handleGlobalSettingChange('emailNotifications', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center gap-5">
                    <Label className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#0f5384]" />
                      SMS Notifications
                    </Label>
                    <Switch
                      checked={globalSettings.pushNotifications}
                      disabled={
                        !globalSettings.smsNotifications || !phoneNumber.trim()
                      }
                      onCheckedChange={(checked) =>
                        handleGlobalSettingChange('pushNotifications', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#0f5384]" />
                      In-App Notifications
                    </Label>
                    <Switch
                      checked={globalSettings.inAppNotifications}
                      onCheckedChange={(checked) =>
                        handleGlobalSettingChange('inAppNotifications', checked)
                      }
                    />
                  </div>

                  {globalSettings.smsNotifications && (
                    <div className="space-y-1">
                      <Label className="text-xs">SMS Phone Number (US)</Label>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="(555) 123-4567 or 5551234567"
                        value={phoneNumber}
                        disabled={phoneNumberVerified}
                        onChange={(e) => {
                          // Only allow digits, spaces, dashes, parentheses, and + sign
                          const value = e.target.value;
                          const allowedChars = /^[\d\s\-\(\)\+]*$/;
                          if (allowedChars.test(value) || value === '') {
                            const newPhoneNumber = value;
                            setPhoneNumber(newPhoneNumber);
                            // Reset verified state if phone number is changed
                            if (phoneNumberVerified) {
                              setPhoneNumberVerified(false);
                            }

                            // Reset mismatch flag when phone number changes
                            if (hasShownPhoneMismatch) {
                              setHasShownPhoneMismatch(false);
                            }

                            // Check if phone number matches form submission (only show once, and only if we have enough digits)
                            if (
                              formSubmissionPhoneNumber &&
                              newPhoneNumber.trim() &&
                              !hasShownPhoneMismatch &&
                              newPhoneNumber.replace(/\D/g, '').length >= 10 // Only check if we have at least 10 digits
                            ) {
                              const matches = comparePhoneNumbers(
                                formSubmissionPhoneNumber,
                                newPhoneNumber
                              );
                              if (!matches) {
                                setHasShownPhoneMismatch(true);
                                toast({
                                  title: 'Phone Number Mismatch',
                                  description:
                                    'The phone number you entered does not match the phone number provided in the SMS setup form.',
                                  variant: 'destructive',
                                });
                              }
                            }
                          }
                        }}
                        className={`text-xs border border-slate-300 ${
                          phoneNumberVerified
                            ? 'bg-slate-100 cursor-not-allowed'
                            : 'bg-white'
                        }`}
                      />
                      <p className="text-[11px] text-gray-500">
                        Enter a valid US number. We&#39;ll store it securely to
                        enable SMS alerts.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="flex items-center gap-2">
                      <BellOff className="w-4 h-4 text-[#0f5384]" />
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
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="quietHoursStart"
                          className="text-sm font-medium text-slate-700 mb-2 block"
                        >
                          Start Time
                        </Label>
                        <Select
                          value={globalSettings.quietHoursStart}
                          onValueChange={(value) =>
                            handleGlobalSettingChange('quietHoursStart', value)
                          }
                        >
                          <SelectTrigger
                            id="quietHoursStart"
                            className="h-11 bg-white border-slate-300 hover:border-blue-500"
                          >
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent className="shadow-lg border-slate-200">
                            {generateTimeOptions().map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="quietHoursEnd"
                          className="text-sm font-medium text-slate-700 mb-2 block"
                        >
                          End Time
                        </Label>
                        <Select
                          value={globalSettings.quietHoursEnd}
                          onValueChange={(value) =>
                            handleGlobalSettingChange('quietHoursEnd', value)
                          }
                        >
                          <SelectTrigger
                            id="quietHoursEnd"
                            className="h-11 bg-white border-slate-300 hover:border-blue-500"
                          >
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent className="shadow-lg border-slate-200">
                            {generateTimeOptions().map((time) => (
                              <SelectItem key={time.value} value={time.value}>
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 pb-2">
                      <ClockArrowDown className="w-4 h-4 text-[#0f5384]" />
                      <Label>Digest Frequency</Label>
                    </div>
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
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#0f5384]" />
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
                      className="p-4 border-2 border-slate-200 rounded-lg bg-white hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
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

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${preference.type}-sms`}
                            checked={preference.sms}
                            disabled={!globalSettings.smsNotifications}
                            onCheckedChange={(checked) =>
                              handlePreferenceChange(
                                preference.type,
                                'sms',
                                checked
                              )
                            }
                          />
                          <Label
                            htmlFor={`${preference.type}-sms`}
                            className={`text-sm ${
                              !globalSettings.smsNotifications
                                ? 'opacity-60'
                                : ''
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" /> SMS Text
                              Messages
                            </span>
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
        </div>

        {/* Professional Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            className="primary-btn px-3 sm:px-4 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="primary-btn px-3 sm:px-4"
            >
              <Ban className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="primary-btn px-3 sm:px-4 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* SMS Form Dialog */}
        <SmsFormDialog
          open={showSmsSetupModal}
          onOpenChange={async (open) => {
            setShowSmsSetupModal(open);
            // If dialog is closed, check form status to ensure switch state is correct
            if (!open) {
              // Small delay to allow onSuccess to complete first
              setTimeout(async () => {
                try {
                  const res = await fetch(
                    `/api/sms-form-submission?userId=${user?.$id}`
                  );
                  const result = await res.json();
                  if (result.submitted) {
                    // Submission exists - ensure switch is enabled
                    setSmsFormSubmitted(true);
                    handleGlobalSettingChange('smsNotifications', true);
                    if (result.data?.phone_number) {
                      setFormSubmissionPhoneNumber(result.data.phone_number);
                    }
                  } else if (!smsFormSubmitted) {
                    // No submission and form wasn't submitted - disable switch
                    handleGlobalSettingChange('smsNotifications', false);
                  }
                } catch (error) {
                  console.error(
                    'Failed to check form status after dialog close:',
                    error
                  );
                  // If check fails and form wasn't submitted, disable switch
                  if (!smsFormSubmitted) {
                    handleGlobalSettingChange('smsNotifications', false);
                  }
                }
              }, 200);
            }
          }}
          onSuccess={async () => {
            // Form submitted successfully - enable switch immediately
            setSmsFormSubmitted(true);
            handleGlobalSettingChange('smsNotifications', true);
            // Ensure SMS Notifications switch is disabled until phone numbers match
            handleGlobalSettingChange('pushNotifications', false);

            // Fetch the form submission to get the phone number for comparison
            // Do NOT auto-populate the phone number field - user must enter it manually to verify
            try {
              const res = await fetch(
                `/api/sms-form-submission?userId=${user?.$id}`
              );
              const result = await res.json();
              if (result.submitted && result.data?.phone_number) {
                const dbPhoneNumber = result.data.phone_number;
                // Store for comparison FIRST, before clearing phone number
                // This prevents the useEffect from disabling the switch
                setFormSubmissionPhoneNumber(dbPhoneNumber);
                // Clear phone number field so user can enter it manually for verification
                // Do this after setting formSubmissionPhoneNumber to prevent flicker
                setPhoneNumber('');
              }

              // Ensure switch is enabled (double-check after fetching)
              if (result.submitted) {
                handleGlobalSettingChange('smsNotifications', true);
                // Keep pushNotifications disabled until user enters matching phone number
                handleGlobalSettingChange('pushNotifications', false);
              }
            } catch (error) {
              console.error('Failed to fetch form submission:', error);
            }

            toast({
              title: 'Form Submitted',
              description:
                'Please enter your phone number in the SMS Phone Number field to verify and enable SMS notifications.',
            });
          }}
          onCancel={() => {
            // User cancelled, turn off SMS switch
            handleGlobalSettingChange('smsNotifications', false);
            setShowSmsSetupModal(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettings;
