'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar as CalendarIcon,
  Plus,
  Globe,
  Lock,
  Check,
  Ban,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';

interface SharedCalendar {
  $id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerAccountId: string;
  organizationId: string;
  isTeamCalendar: boolean;
  teamId?: string;
  color?: string;
  isPublic: boolean;
  sharedWith?: string[];
  createdAt: string;
  updatedAt: string;
}

interface CreateSharedCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCalendarCreated?: (calendar: SharedCalendar) => void;
}

export const CreateSharedCalendarDialog: React.FC<
  CreateSharedCalendarDialogProps
> = ({ open, onOpenChange, onCalendarCreated }) => {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isTeamCalendar: false,
    teamId: '',
    color: '#3b82f6',
    isPublic: false,
    isCustomColor: false,
  });
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Calendar name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/calendar/shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: 'Shared calendar created successfully',
        });
        setFormData({
          name: '',
          description: '',
          isTeamCalendar: false,
          teamId: '',
          color: '#3b82f6',
          isPublic: false,
          isCustomColor: false,
        });
        onCalendarCreated?.(data.calendar);
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to create shared calendar',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(
        '[CLIENT] CreateSharedCalendarDialog] Error creating calendar:',
        error
      );
      toast({
        title: 'Error',
        description: 'Failed to create shared calendar',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      isTeamCalendar: false,
      teamId: '',
      color: '#3b82f6',
      isPublic: false,
      isCustomColor: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col">
        <VisuallyHiddenPrimitive.Root>
          <DialogTitle>Create Shared Calendar</DialogTitle>
          <DialogDescription>
            Create a new shared calendar for your team
          </DialogDescription>
        </VisuallyHiddenPrimitive.Root>
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
          <div className="flex items-center justify-between ml-6">
            <div className="flex items-center">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-[#0f5384]" />
                  <h2 className="text-xl font-semibold sidebar-gradient-text">
                    Create Shared Calendar
                  </h2>
                </div>
                <p className="text-sm text-slate-600 mt-1 ml-7">
                  Create a calendar that your team can access and collaborate on
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Plus className="w-4 h-4 text-blue-600" />
              Calendar Details
            </Label>

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="calendar-name"
                  className="text-sm text-slate-700 mb-1 block"
                >
                  Calendar Name *
                </Label>
                <Input
                  id="calendar-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Team Calendar, Project Alpha"
                  className="bg-white border-slate-300"
                />
              </div>

              <div>
                <Label
                  htmlFor="calendar-description"
                  className="text-sm text-slate-700 mb-1 block"
                >
                  Description
                </Label>
                <Textarea
                  id="calendar-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description for this calendar"
                  rows={3}
                  className="bg-white border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-slate-700 mb-2 block">
                    Color
                  </Label>
                  {/* Color Swatches Row */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Predefined Colors */}
                      {[
                        '#ec4899', // Pink
                        '#f97316', // Orange
                        '#eab308', // Yellow
                        '#22c55e', // Green
                        '#3b82f6', // Blue
                        '#a855f7', // Purple
                        '#d97706', // Beige/Amber
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              color,
                              isCustomColor: false,
                            });
                          }}
                          className={cn(
                            'w-8 h-8 rounded-full border-2 transition-all hover:scale-110',
                            formData.color === color &&
                              !formData.isCustomColor
                              ? 'border-slate-900 ring-2 ring-slate-300'
                              : 'border-slate-300 hover:border-slate-400'
                          )}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>

                    {/* Custom Color Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, isCustomColor: true });
                        // Open color picker
                        const colorInput =
                          document.getElementById('custom-color-input');
                        colorInput?.click();
                      }}
                      className={cn(
                        'flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition-colors',
                        formData.isCustomColor && 'text-slate-900 font-medium'
                      )}
                    >
                      {formData.isCustomColor && (
                        <Check className="w-4 h-4 text-slate-900" />
                      )}
                      <span>Custom Color...</span>
                      {formData.isCustomColor && formData.color && (
                        <div
                          className="w-4 h-4 rounded border border-slate-300 ml-auto"
                          style={{ backgroundColor: formData.color }}
                        />
                      )}
                    </button>

                    {/* Hidden color input for custom color */}
                    <input
                      id="custom-color-input"
                      type="color"
                      value={formData.color || '#3b82f6'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          color: e.target.value,
                          isCustomColor: true,
                        })
                      }
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-slate-700 mb-2 block">
                    Visibility
                  </Label>
                  <Select
                    value={formData.isPublic ? 'public' : 'private'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        isPublic: value === 'public',
                      })
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Private
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Public
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="team-calendar"
                  checked={formData.isTeamCalendar}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isTeamCalendar: checked as boolean,
                    })
                  }
                />
                <Label
                  htmlFor="team-calendar"
                  className="text-sm text-slate-700 cursor-pointer"
                >
                  This is a team calendar
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              className="primary-btn px-3 sm:px-4"
              onClick={handleCancel}
              disabled={creating}
            >
              <Ban className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              className="primary-btn px-3 sm:px-4"
              onClick={handleCreate}
              disabled={creating || !formData.name.trim()}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Calendar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

