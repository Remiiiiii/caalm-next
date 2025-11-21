'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Plus, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EventReminderConfig {
  type: 'before_start' | 'before_end' | 'custom';
  minutes: number;
  channels: Array<'in_app' | 'email' | 'sms' | 'push'>;
}

interface EventReminderConfigProps {
  reminders: EventReminderConfig[];
  onChange: (reminders: EventReminderConfig[]) => void;
}

const REMINDER_PRESETS = [
  { label: '15 minutes before', minutes: 15 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
  { label: 'Custom', minutes: 0 },
];

export const EventReminderConfig: React.FC<EventReminderConfigProps> = ({
  reminders,
  onChange,
}) => {
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminder, setNewReminder] = useState<EventReminderConfig>({
    type: 'before_start',
    minutes: 15,
    channels: ['in_app'],
  });

  const addReminder = () => {
    if (newReminder.minutes > 0) {
      onChange([...reminders, newReminder]);
      setNewReminder({
        type: 'before_start',
        minutes: 15,
        channels: ['in_app'],
      });
      setShowAddReminder(false);
    }
  };

  const removeReminder = (index: number) => {
    onChange(reminders.filter((_, i) => i !== index));
  };

  const updateReminder = (index: number, updates: Partial<EventReminderConfig>) => {
    const updated = reminders.map((r, i) =>
      i === index ? { ...r, ...updates } : r
    );
    onChange(updated);
  };

  const toggleChannel = (index: number, channel: 'in_app' | 'email' | 'sms' | 'push') => {
    const reminder = reminders[index];
    const channels = reminder.channels.includes(channel)
      ? reminder.channels.filter((c) => c !== channel)
      : [...reminder.channels, channel];
    updateReminder(index, { channels });
  };

  const formatReminderTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
        <Bell className="w-4 h-4 text-blue-600" />
        Reminders
      </Label>

      {/* Existing Reminders */}
      {reminders.length > 0 && (
        <div className="space-y-2 mb-3">
          {reminders.map((reminder, index) => (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <Clock className="w-4 h-4 text-slate-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {formatReminderTime(reminder.minutes)} before event
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {['in_app', 'email', 'sms', 'push'].map((channel) => (
                      <div
                        key={channel}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          reminder.channels.includes(channel as any)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {channel === 'in_app'
                          ? 'In-App'
                          : channel === 'sms'
                          ? 'SMS'
                          : channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50"
                onClick={() => removeReminder(index)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Reminder Form */}
      {showAddReminder ? (
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">
                When to remind
              </Label>
              <Select
                value={newReminder.minutes.toString()}
                onValueChange={(value) => {
                  const minutes = parseInt(value);
                  if (minutes > 0) {
                    setNewReminder({ ...newReminder, minutes });
                  } else {
                    // Custom - show input
                    setNewReminder({ ...newReminder, minutes: 0 });
                  }
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.minutes}
                      value={preset.minutes.toString()}
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newReminder.minutes === 0 && (
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">
                  Custom minutes
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter minutes"
                  value={newReminder.minutes || ''}
                  onChange={(e) => {
                    const minutes = parseInt(e.target.value) || 0;
                    setNewReminder({ ...newReminder, minutes });
                  }}
                  className="h-9 text-sm"
                />
              </div>
            )}

            <div className="col-span-2">
              <Label className="text-xs text-slate-600 mb-2 block">
                Notification channels
              </Label>
              <div className="flex items-center gap-4">
                {(['in_app', 'email', 'sms'] as const).map((channel) => (
                  <div key={channel} className="flex items-center gap-2">
                    <Checkbox
                      id={`channel-${channel}`}
                      checked={newReminder.channels.includes(channel)}
                      onCheckedChange={(checked) => {
                        const channels = checked
                          ? [...newReminder.channels, channel]
                          : newReminder.channels.filter((c) => c !== channel);
                        setNewReminder({ ...newReminder, channels });
                      }}
                    />
                    <Label
                      htmlFor={`channel-${channel}`}
                      className="text-xs text-slate-700 cursor-pointer"
                    >
                      {channel === 'in_app'
                        ? 'In-App'
                        : channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={addReminder}
              disabled={newReminder.minutes <= 0 || newReminder.channels.length === 0}
              className="h-8"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Reminder
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAddReminder(false);
                setNewReminder({
                  type: 'before_start',
                  minutes: 15,
                  channels: ['in_app'],
                });
              }}
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddReminder(true)}
          className="w-full h-9 border-slate-300 hover:border-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      )}
    </div>
  );
};

