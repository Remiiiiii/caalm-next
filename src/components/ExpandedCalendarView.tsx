'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarIcon,
  Plus,
  Clock,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  CalendarDays,
  Expand,
  Share2,
  Filter,
  Printer,
  UserPlus,
  Link,
  Eye,
  Edit,
  Trash2,
  ChevronDownIcon,
  Settings,
  CheckCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  format,
  isSameDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval as eachDay,
  isToday,
  isSameMonth,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { createCalendarEvent } from '@/lib/actions/calendar.client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import CalendarSettings from '@/components/CalendarSettings';
import {
  hasMicrosoftCalendarIntegration,
  syncMicrosoftCalendar,
} from '@/lib/actions/calendar.actions';
import type {
  CalendarApprovalRequest,
  CalendarApprovalChangeSummary,
} from '@/lib/actions/calendar-approval.actions';
import {
  CalendarApprovalStatus,
  CalendarSensitivity,
  PermissionOverrideRecord,
  SENSITIVITY_LABELS,
} from '@/constants/rbac';
import { useUserRole } from '@/hooks/useUserRole';
import { useCalendarPermissions } from '@/hooks/useCalendarPermissions';
import { useCalendarApprovals } from '@/hooks/useCalendarApprovals';
import { resolveCalendarPermissions } from '@/lib/auth/permissions';

// Local event interface for component use
interface LocalCalendarEvent {
  id: string;
  title: string;
  date?: Date;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  participants?: string[];
  contractName?: string;
  amount?: string;
  startTime?: string;
  endTime?: string;
  sensitivityLevel?: CalendarSensitivity;
  requiresApproval?: boolean;
  approvalStatus?: CalendarApprovalStatus;
  pendingApprovalId?: string | null;
  overrides?: PermissionOverrideRecord[];
}

type EventWithExtras = LocalCalendarEvent & {
  sensitivityLevel?: CalendarSensitivity;
  approvalStatus?: CalendarApprovalStatus;
  requiresApproval?: boolean;
  pendingApprovalId?: string | null;
  overrides?: PermissionOverrideRecord[];
};

// Internal state interface for new event form
interface NewEventForm {
  title: string;
  date: Date | undefined;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description: string;
  startTime: string;
  endTime: string;
  sensitivityLevel: CalendarSensitivity;
}

// Sharing interface
interface ShareSettings {
  users: string[];
  permissions: 'view' | 'edit';
  linkEnabled: boolean;
}

interface ExpandedCalendarViewProps {
  events?: LocalCalendarEvent[];
  onEventClick?: (event: LocalCalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
  onEventCreate?: (event: Omit<LocalCalendarEvent, 'id'>) => void;
  user?: {
    $id: string;
    fullName?: string;
    role?: string;
    department?: string;
  } | null;
}

const ExpandedCalendarView: React.FC<ExpandedCalendarViewProps> = ({
  events = [],
  onEventClick,
  onDateSelect,
  onEventCreate,
  user,
}) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocalCalendarEvent | null>(
    null
  );
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    users: [],
    permissions: 'view',
    linkEnabled: false,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // New event form state
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    date: new Date(),
    type: 'meeting',
    description: '',
    startTime: '',
    endTime: '',
    sensitivityLevel: 'standard',
  });

  const { events: calendarEvents, refresh } = useCalendarEvents();
  const { role, userId, accountId } = useUserRole();
  const { permissions: basePermissions } = useCalendarPermissions({
    userId,
  });
  const canCreateEvent = basePermissions.createEvent;
  const isApprover = role === 'approver' || role === 'admin';
  const {
    approvals,
    isLoading: approvalsLoading,
    refresh: refreshApprovals,
  } = useCalendarApprovals({ status: 'pending', enabled: isApprover });

  const selectedEventPermissions = useMemo(() => {
    if (!selectedEvent) {
      return null;
    }
    const overrides = (selectedEvent as EventWithExtras)?.overrides || [];
    return resolveCalendarPermissions({
      role,
      overrides,
      context: {
        userId: userId || '',
        teamIds: [],
      },
    });
  }, [selectedEvent, role, userId]);

  // Combine local events with calendar events
  const allEvents = [...events, ...(calendarEvents || [])];
  const normalizedEvents: EventWithExtras[] = allEvents.map((event) => {
    const extended = event as EventWithExtras;
    return {
      ...extended,
      sensitivityLevel: extended.sensitivityLevel || 'standard',
      approvalStatus: extended.approvalStatus || 'not_required',
      requiresApproval: Boolean(extended.requiresApproval),
      pendingApprovalId:
        extended.pendingApprovalId !== undefined
          ? extended.pendingApprovalId
          : null,
      overrides: extended.overrides || [],
    };
  });

  // Check Outlook connection status
  useEffect(() => {
    const checkOutlookConnection = async () => {
      if (user?.$id) {
        try {
          const connected = await hasMicrosoftCalendarIntegration(user.$id);
          setOutlookConnected(connected);
        } catch (error) {
          console.error('Error checking Outlook connection:', error);
        }
      }
    };

    checkOutlookConnection();
  }, [user]);

  const handleSync = async () => {
    if (!user?.$id) return;

    try {
      setSyncing(true);
      const result = await syncMicrosoftCalendar(user.$id);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        // Refresh calendar events
        refresh();
      } else {
        toast({
          title: 'Sync Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync calendar',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (onDateSelect && date) {
      onDateSelect(date);
    }
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const getEventTypeConfig = (type: LocalCalendarEvent['type']) => {
    const configs = {
      contract: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: FileText,
      },
      deadline: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: Clock,
      },
      meeting: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Users,
      },
      review: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: FileText,
      },
      audit: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: FileText,
      },
    };
    return configs[type];
  };

  // Check if event is from Outlook
  const isOutlookEvent = (event: LocalCalendarEvent): boolean => {
    return !!(event as any).outlook_id || (event as any).source === 'outlook';
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an event title',
        variant: 'destructive',
      });
      return;
    }

    if (!canCreateEvent) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to create events.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingEvent(true);

    try {
      // Create date string in YYYY-MM-DD format to avoid timezone issues
      const eventDate = newEvent.date || new Date();
      const year = eventDate.getFullYear();
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const day = String(eventDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const eventData = {
        title: newEvent.title,
        startDate: dateString,
        type: newEvent.type,
        description: newEvent.description,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        createdBy: accountId || user?.$id || 'unknown',
        createdByAccountId: accountId || user?.$id || 'unknown',
        createdByUserId: userId,
        sensitivityLevel: newEvent.sensitivityLevel,
        requiresApproval: newEvent.sensitivityLevel !== 'standard',
        participants: '',
        contractName: '',
        amount: '',
      } as const;

      // Create event in database
      const result = await createCalendarEvent(eventData);

      // Call parent callback if provided
      if (onEventCreate) {
        onEventCreate({
          title: newEvent.title,
          date: newEvent.date || new Date(),
          type: newEvent.type,
          description: newEvent.description,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
        });
      }

      // Reset form
      setNewEvent({
        title: '',
        date: new Date(),
        type: 'meeting',
        description: '',
        startTime: '',
        endTime: '',
        sensitivityLevel: 'standard',
      });

      // Close modal
      setIsAddEventOpen(false);

      // Refresh events
      if (refresh) {
        refresh();
      }
      if (result?.approval && isApprover && refreshApprovals) {
        refreshApprovals();
      }

      toast({
        title: result?.approval
          ? 'Submitted for approval'
          : 'Event created successfully',
        description: result?.approval
          ? 'Your event is awaiting approval before it appears on the shared calendar.'
          : 'Event created successfully.',
      });
    } catch (error) {
      console.error('Failed to create event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleEventClick = (event: LocalCalendarEvent) => {
    setSelectedEvent(event);
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const handleShare = async () => {
    try {
      // Generate shareable link
      const shareLink = `${window.location.origin}/calendar?shared=true&id=${selectedEvent?.id}`;

      if (navigator.share) {
        await navigator.share({
          title: selectedEvent?.title || 'Calendar Event',
          text: selectedEvent?.description || '',
          url: shareLink,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareLink);
        toast({
          title: 'Link Copied',
          description: 'Shareable link copied to clipboard',
        });
      }

      setIsShareOpen(false);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to share event',
        variant: 'destructive',
      });
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDay({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-slate-600 bg-slate-50"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
        const dayEvents = normalizedEvents.filter(
            (event) => event.date && isSameDay(new Date(event.date), day)
          );
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[120px] p-2 border border-slate-200 cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-slate-50 text-slate-400',
                isSelected && 'bg-blue-50 border-blue-300',
                isCurrentDay && 'bg-blue-100'
              )}
              onClick={() => handleDateSelect(day)}
            >
              <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>

              {/* Events for this day */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const config = getEventTypeConfig(event.type);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'text-xs p-1 rounded cursor-pointer truncate relative',
                        config.color
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate">{event.title}</span>
                        {isOutlookEvent(event) && (
                          <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-slate-500 text-center">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate || new Date());
    const weekEnd = endOfWeek(selectedDate || new Date());
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="p-3 text-center text-sm font-medium text-slate-600 bg-slate-50"
          >
            <div>{format(day, 'EEE')}</div>
            <div className="text-lg font-bold">{format(day, 'd')}</div>
          </div>
        ))}

        {/* Day content */}
        {days.map((day) => {
        const dayEvents = normalizedEvents.filter(
            (event) => event.date && isSameDay(new Date(event.date), day)
          );
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[200px] p-2 border border-slate-200 cursor-pointer transition-colors',
                isSelected && 'bg-blue-50 border-blue-300',
                isCurrentDay && 'bg-blue-100'
              )}
              onClick={() => handleDateSelect(day)}
            >
              <div className="space-y-1">
                {dayEvents.map((event) => {
                  const config = getEventTypeConfig(event.type);
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'text-xs p-2 rounded cursor-pointer',
                        config.color
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div className="font-medium flex-1">{event.title}</div>
                        {isOutlookEvent(event) && (
                          <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      {event.startTime && (
                        <div className="text-xs opacity-75">
                          {event.startTime}
                        </div>
                      )}
                      {event.approvalStatus === 'pending' && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] uppercase"
                        >
                          Pending
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Expand Button */}
      <Button
        onClick={() => setIsExpanded(true)}
        className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
      >
        <Expand className="h-4 w-4 mr-2" />
        Expand
      </Button>

      {/* Expanded Calendar Modal */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-5xl w-full h-[90vh] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Expanded Calendar View</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-white">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold sidebar-gradient-text">
                  Calendar
                </h2>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleMonthChange(subMonths(currentMonth, 1))
                    }
                    className="h-8 w-8 p-0 hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleMonthChange(addMonths(currentMonth, 1))
                    }
                    className="h-8 w-8 p-0 hover:bg-slate-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-lg font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCurrentMonth(new Date());
                    setSelectedDate(new Date());
                  }}
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  Today
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Tabs
                  value={viewMode}
                  onValueChange={(value) =>
                    setViewMode(value as 'month' | 'week')
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="month"
                      className="flex items-center space-x-2"
                    >
                      <Grid3X3 className="h-4 w-4" />
                      <span>Month</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="week"
                      className="flex items-center space-x-2"
                    >
                      <CalendarDays className="h-4 w-4" />
                      <span>Week</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>

                {/* Outlook Status and Controls */}
                {outlookConnected && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
                      <CheckCircle className="h-3 w-3" />
                      <span>Outlook</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSync}
                      disabled={syncing}
                      className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                    >
                      {syncing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />{' '}
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" /> Sync
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Settings Button */}
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur border border-white/60 shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="sidebar-gradient-text">
                        Calendar Settings
                      </DialogTitle>
                    </DialogHeader>
                    <CalendarSettings
                      userId={user?.$id || ''}
                      onClose={() => setShowSettings(false)}
                    />
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={() => canCreateEvent && setIsAddEventOpen(true)}
                  disabled={!canCreateEvent}
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </div>
            </div>

            {isApprover && (
              <div className="border-b bg-slate-50 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">
                      Pending approvals
                    </h3>
                    <p className="text-xs text-slate-500">
                      {approvalsLoading
                        ? 'Loading approvals...'
                        : approvals.length
                        ? `${approvals.length} awaiting review`
                        : 'No pending approvals'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refreshApprovals()}
                    className="bg-white text-slate-700 hover:bg-slate-100"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Refresh
                  </Button>
                </div>
                <div className="mt-3 max-h-32 space-y-2 overflow-auto">
                  {!approvalsLoading &&
                    approvals.map((approval: CalendarApprovalRequest) => {
                      const summary =
                        (approval.changeSummary as CalendarApprovalChangeSummary) ||
                        {};
                      const after = (summary.after || {}) as Record<
                        string,
                        unknown
                      >;
                      const before = (summary.before || {}) as Record<
                        string,
                        unknown
                      >;
                      const title =
                        (after.title as string) ||
                        (before.title as string) ||
                        'Untitled';
                      return (
                        <div
                          key={approval.$id}
                          className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-700">
                              {title}
                            </span>
                            <Badge variant="outline">
                              {approval.changeType}
                            </Badge>
                          </div>
                          <p className="mt-1 capitalize text-slate-500">
                            Submitted{' '}
                            {approval.submittedAt
                              ? new Date(
                                  approval.submittedAt
                                ).toLocaleString()
                              : 'recently'}
                          </p>
                        </div>
                      );
                    })}
                  {!approvalsLoading && approvals.length === 0 && (
                    <div className="text-xs text-slate-500">
                      You're all caught up.
                    </div>
                  )}
                  {approvalsLoading && (
                    <div className="text-xs text-slate-500">
                      Gathering latest requests...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Calendar Content */}
            <div className="flex-1 p-2 overflow-auto">
              {viewMode === 'month' ? renderMonthView() : renderWeekView()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="title"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Event Title
              </Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, title: e.target.value })
                }
                placeholder="Enter event title"
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
              />
            </div>

            <div>
              <Label
                htmlFor="date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="date"
                    className="w-full justify-between font-normal bg-white/30 backdrop-blur border border-white/40 shadow-md"
                  >
                    {newEvent.date
                      ? newEvent.date.toLocaleDateString()
                      : 'Select date'}
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={newEvent.date}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setNewEvent({ ...newEvent, date });
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label
                htmlFor="type"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Event Type
              </Label>
              <Select
                value={newEvent.type}
                onValueChange={(value: string) =>
                  setNewEvent({
                    ...newEvent,
                    type: value as LocalCalendarEvent['type'],
                  })
                }
              >
                <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="startTime"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, startTime: e.target.value })
                  }
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
                />
              </div>
              <div>
                <Label
                  htmlFor="endTime"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, endTime: e.target.value })
                  }
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="description"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Description
              </Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                placeholder="Enter event description"
                rows={3}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">
                Sensitivity
              </Label>
              <Select
                value={newEvent.sensitivityLevel}
                onValueChange={(value: string) =>
                  setNewEvent({
                    ...newEvent,
                    sensitivityLevel: value as CalendarSensitivity,
                  })
                }
              >
                <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Standard</span>
                      <span className="text-xs text-slate-500">
                        Visible immediately, no approval needed.
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="restricted">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Restricted</span>
                      <span className="text-xs text-slate-500">
                        Requires approval before publishing.
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="confidential">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Confidential</span>
                      <span className="text-xs text-slate-500">
                        Approval required, sensitive details hidden until
                        approved.
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {newEvent.sensitivityLevel !== 'standard' && (
                <p className="mt-2 text-xs text-slate-500">
                  This event will remain hidden until an approver approves it.
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAddEventOpen(false)}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEvent}
                disabled={
                  !newEvent.title.trim() || creatingEvent || !canCreateEvent
                }
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
              >
                {creatingEvent ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Event Details</span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsShareOpen(true)}
                  disabled={
                    selectedEventPermissions
                      ? !selectedEventPermissions.manageParticipants
                      : false
                  }
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
                  title={
                    selectedEventPermissions &&
                    !selectedEventPermissions.manageParticipants
                      ? 'You do not have permission to manage participants'
                      : undefined
                  }
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    selectedEventPermissions
                      ? !selectedEventPermissions.updateEvent
                      : false
                  }
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
                  title={
                    selectedEventPermissions &&
                    !selectedEventPermissions.updateEvent
                      ? 'You do not have permission to edit this event'
                      : undefined
                  }
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    selectedEventPermissions
                      ? !selectedEventPermissions.cancelEvent
                      : false
                  }
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
                  title={
                    selectedEventPermissions &&
                    !selectedEventPermissions.cancelEvent
                      ? 'You do not have permission to cancel this event'
                      : undefined
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                <Badge
                  className={cn(
                    'mt-2',
                    getEventTypeConfig(selectedEvent.type).color
                  )}
                >
                  {selectedEvent.type}
                </Badge>
                {selectedEvent.sensitivityLevel && (
                  <Badge variant="outline" className="ml-2">
                    {SENSITIVITY_LABELS[selectedEvent.sensitivityLevel]}
                  </Badge>
                )}
                {selectedEvent.approvalStatus &&
                  selectedEvent.approvalStatus !== 'not_required' && (
                    <Badge
                      variant={
                        selectedEvent.approvalStatus === 'approved'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="ml-2 uppercase"
                    >
                      {selectedEvent.approvalStatus.replace('_', ' ')}
                    </Badge>
                  )}
                {selectedEvent.approvalStatus === 'pending' && (
                  <p className="mt-2 text-xs text-amber-600">
                    Awaiting approval; editing is limited until a decision is
                    made.
                  </p>
                )}
              </div>

              {selectedEvent.date && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {format(new Date(selectedEvent.date), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
              )}

              {selectedEvent.startTime && selectedEvent.endTime && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    {selectedEvent.startTime} - {selectedEvent.endTime}
                  </span>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-1">
                    Description
                  </h4>
                  <p className="text-sm text-slate-600">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.contractName && (
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-1">
                    Contract
                  </h4>
                  <p className="text-sm text-slate-600">
                    {selectedEvent.contractName}
                  </p>
                </div>
              )}

              {selectedEvent.amount && (
                <div>
                  <h4 className="font-medium text-sm text-slate-700 mb-1">
                    Amount
                  </h4>
                  <p className="text-sm text-slate-600">
                    {selectedEvent.amount}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">
                Share with users
              </Label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Search users..."
                  className="flex-1 bg-white/30 backdrop-blur border border-white/40 shadow-md"
                />
                <Button
                  size="sm"
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">
                Permissions
              </Label>
              <Select
                value={shareSettings.permissions}
                onValueChange={(value: 'view' | 'edit') =>
                  setShareSettings({ ...shareSettings, permissions: value })
                }
              >
                <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>View only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <span>Can edit</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleShare}
                className="flex-1 bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
              >
                <Link className="h-4 w-4 mr-2" />
                Generate Link
              </Button>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsShareOpen(false)}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
              >
                Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpandedCalendarView;
