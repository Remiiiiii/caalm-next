'use client';

import React, { useState } from 'react';
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
}

// Internal state interface for new event form
interface NewEventForm {
  title: string;
  date: Date | undefined;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description: string;
  startTime: string;
  endTime: string;
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

  // New event form state
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    date: new Date(),
    type: 'meeting',
    description: '',
    startTime: '',
    endTime: '',
  });

  const { events: calendarEvents, mutate } = useCalendarEvents();

  // Combine local events with calendar events
  const allEvents = [...events, ...(calendarEvents || [])];

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

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an event title',
        variant: 'destructive',
      });
      return;
    }

    setCreatingEvent(true);

    try {
      const eventData = {
        title: newEvent.title,
        date: newEvent.date || new Date(),
        type: newEvent.type,
        description: newEvent.description,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
      };

      // Create event in database
      await createCalendarEvent(eventData);

      // Call parent callback if provided
      if (onEventCreate) {
        onEventCreate(eventData);
      }

      // Reset form
      setNewEvent({
        title: '',
        date: new Date(),
        type: 'meeting',
        description: '',
        startTime: '',
        endTime: '',
      });

      // Close modal
      setIsAddEventOpen(false);

      // Refresh events
      if (mutate) {
        mutate();
      }

      toast({
        title: 'Success',
        description: 'Event created successfully',
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
          const dayEvents = allEvents.filter(
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
                        'text-xs p-1 rounded cursor-pointer truncate',
                        config.color
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      {event.title}
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
          const dayEvents = allEvents.filter(
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
                      <div className="font-medium">{event.title}</div>
                      {event.startTime && (
                        <div className="text-xs opacity-75">
                          {event.startTime}
                        </div>
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
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
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

                <Button
                  onClick={() => setIsAddEventOpen(true)}
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </div>
            </div>

            {/* Calendar Content */}
            <div className="flex-1 p-6 overflow-auto">
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
                disabled={!newEvent.title.trim() || creatingEvent}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
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
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
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
