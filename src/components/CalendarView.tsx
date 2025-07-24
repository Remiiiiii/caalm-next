'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';
import {
  format,
  isSameDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from 'date-fns';
import { cn } from '@/lib/utils';
import {
  CalendarEvent as DBCalendarEvent,
  getCalendarEventsByMonth,
  createCalendarEvent,
} from '@/lib/actions/calendar.client';
import { useToast } from '@/hooks/use-toast';

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
  dateString: string; // Store as string to avoid timezone issues
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description: string;
  startTime: string;
  endTime: string;
  amount: string;
  contractName: string;
}

// Convert database event to local event format
const convertDBEventToLocal = (
  dbEvent: DBCalendarEvent
): LocalCalendarEvent => {
  const dbDate = new Date(dbEvent.date);
  // Create a date string in YYYY-MM-DD format to avoid timezone issues
  const year = dbDate.getFullYear();
  const month = String(dbDate.getMonth() + 1).padStart(2, '0');
  const day = String(dbDate.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  const normalizedDate = new Date(dateString);

  return {
    id: dbEvent.$id || '',
    title: dbEvent.title,
    date: normalizedDate,
    type: dbEvent.type,
    description: dbEvent.description,
    participants: dbEvent.participants ? dbEvent.participants.split(', ') : [],
    contractName: dbEvent.contractName,
    amount: dbEvent.amount,
    startTime: dbEvent.startTime,
    endTime: dbEvent.endTime,
  };
};

interface CalendarViewProps {
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

const CalendarView: React.FC<CalendarViewProps> = ({
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
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [dbEvents, setDbEvents] = useState<LocalCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    dateString: '',
    type: 'meeting',
    description: '',
    startTime: '',
    endTime: '',
    amount: '',
    contractName: '',
  });

  // Fetch events from database
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        console.log('Fetching events for:', year, month);
        const dbEventsData = await getCalendarEventsByMonth(year, month);
        console.log('Database events:', dbEventsData);
        const localEvents = dbEventsData.map(convertDBEventToLocal);
        console.log('Local events:', localEvents);
        setDbEvents(localEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentMonth]);

  // Combine database events with prop events
  const allEvents = [...dbEvents, ...events];

  const handleDateSelect = (date: Date | undefined) => {
    // Don't allow selecting past dates
    if (date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date < today) {
        toast({
          title: 'Error',
          description: 'Cannot select dates in the past',
          variant: 'destructive',
        });
        return;
      }
    }

    setSelectedDate(date);
    onDateSelect?.(date!);

    // Pre-fill the date in the new event form if modal is open
    if (date && isAddEventOpen) {
      // Create a date string in YYYY-MM-DD format to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      setNewEvent((prev) => ({
        ...prev,
        dateString: dateString,
      }));
    }
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const getEventTypeConfig = (type: LocalCalendarEvent['type']) => {
    const configs = {
      contract: { label: 'Contract', color: 'bg-blue-500', icon: FileText },
      deadline: { label: 'Deadline', color: 'bg-red-500', icon: Clock },
      meeting: { label: 'Meeting', color: 'bg-green-500', icon: Users },
      review: { label: 'Review', color: 'bg-yellow-500', icon: FileText },
      audit: { label: 'Audit', color: 'bg-purple-500', icon: FileText },
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

    if (!newEvent.dateString) {
      toast({
        title: 'Error',
        description: 'Please select a date for the event',
        variant: 'destructive',
      });
      return;
    }

    // Validate that the selected date is not in the past
    const selectedDate = new Date(newEvent.dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast({
        title: 'Error',
        description: 'Cannot create events for dates in the past',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'User information not available. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingEvent(true);
    try {
      // Create event in database
      const eventData = {
        title: newEvent.title.trim(),
        date: `${newEvent.dateString}T00:00:00.000Z`,
        type: newEvent.type,
        description: newEvent.description?.trim() || '',
        contractName: newEvent.contractName?.trim() || '',
        amount: newEvent.amount?.trim() || '',
        startTime: newEvent.startTime || '',
        endTime: newEvent.endTime || '',
        participants: '',
        createdBy: user.fullName || user.$id,
      };

      const createdEvent = await createCalendarEvent(eventData);

      if (createdEvent) {
        // Call the callback with the correct format
        const eventForCallback: Omit<LocalCalendarEvent, 'id'> = {
          title: newEvent.title,
          date: new Date(newEvent.dateString),
          type: newEvent.type,
          description: newEvent.description,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          amount: newEvent.amount,
          contractName: newEvent.contractName,
        };
        onEventCreate?.(eventForCallback);

        // Show success toast
        toast({
          title: 'Success',
          description: `Event "${newEvent.title}" created successfully!`,
        });

        // Reset form
        setNewEvent({
          title: '',
          dateString: '',
          type: 'meeting',
          description: '',
          startTime: '',
          endTime: '',
          amount: '',
          contractName: '',
        });
        setIsAddEventOpen(false);

        // Refresh events
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const dbEventsData = await getCalendarEventsByMonth(year, month);
        const localEvents = dbEventsData.map(convertDBEventToLocal);
        setDbEvents(localEvents);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create event. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      toast({
        title: 'Error',
        description:
          'Error creating event. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingEvent(false);
    }
  };

  const WeekView = () => {
    const weekDays = eachDayOfInterval({
      start: startOfWeek(currentMonth),
      end: endOfWeek(currentMonth),
    });

    return (
      <div className="space-y-6 w-full">
        {/* Week header */}
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-slate-600">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-2">
              <div className="text-xs text-slate-500">{format(day, 'EEE')}</div>
              <div
                className={cn(
                  'text-lg font-semibold rounded-full w-8 h-8 flex items-center justify-center mx-auto cursor-pointer transition-colors',
                  selectedDate && isSameDay(day, selectedDate)
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
                onClick={() => handleDateSelect(day)}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Week events list - scrollable container */}
        <div className="h-[280px] overflow-y-auto border rounded-lg w-full">
          <div className="space-y-0">
            {weekDays.map((day) => {
              const dayEvents = allEvents.filter(
                (event) => event.date && isSameDay(event.date, day)
              );
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-b border-slate-200 last:border-b-0 transition-colors',
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-800 text-sm">
                      {format(day, 'EEEE, MMMM d, yyyy')}
                    </h3>
                    {dayEvents.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dayEvents.length} event
                        {dayEvents.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {dayEvents.length > 0 ? (
                    <div className="p-3 space-y-2">
                      {dayEvents.map((event) => {
                        const config = getEventTypeConfig(event.type);
                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                            onClick={() => onEventClick?.(event)}
                          >
                            <div
                              className={cn(
                                'w-1 h-full rounded-full flex-shrink-0',
                                config.color
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-500 mb-1">
                                {config.label}
                              </div>
                              <div className="font-semibold text-slate-800 text-sm mb-1">
                                {event.title}
                              </div>
                              {event.contractName && (
                                <div className="text-sm text-slate-600 mb-1">
                                  {event.contractName}
                                </div>
                              )}
                              {event.description && (
                                <div className="text-xs text-slate-500 line-clamp-2">
                                  {event.description}
                                </div>
                              )}
                              {event.startTime && event.endTime && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  {event.startTime} - {event.endTime}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500">
                      <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No events scheduled</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-bold sidebar-gradient-text">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const prevMonth = new Date(currentMonth);
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                handleMonthChange(prevMonth);
              }}
              className="h-8 w-8 p-0 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const nextMonth = new Date(currentMonth);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                handleMonthChange(nextMonth);
              }}
              className="h-8 w-8 p-0 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as 'month' | 'week')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="month"
                className="flex items-center space-x-2"
              >
                <Grid3X3 className="h-4 w-4" />
                <span>Month</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="flex items-center space-x-2">
                <CalendarDays className="h-4 w-4" />
                <span>Week</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Calendar and Events Layout */}
      <div className="space-y-4">
        {/* Centered Calendar */}
        <div className="flex justify-center">
          <Card className="bg-white/95 backdrop-blur border border-white/60 shadow-xl w-full">
            <CardContent className="pl-0 pr-2 py-3">
              {loading && (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              )}
              {viewMode === 'month' ? (
                <div className="[&_.rdp-caption]:!hidden [&_.rdp-nav]:!hidden">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    month={currentMonth}
                    onMonthChange={handleMonthChange}
                    disabled={(date) => {
                      // Disable dates prior to today
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    className="w-full"
                    classNames={{
                      months:
                        'flex flex-col sm:flex-row space-y-2 sm:space-x-4 sm:space-y-0',
                      month: 'space-y-1',
                      caption: 'hidden',
                      caption_label: 'hidden',
                      nav: 'hidden',
                      nav_button: 'hidden',
                      nav_button_previous: 'hidden',
                      nav_button_next: 'hidden',
                      table: 'w-full border-collapse space-y-0',
                      head_row: 'flex w-full justify-between',
                      head_cell:
                        'text-slate-600 rounded-md flex-1 text-center font-semibold text-xs py-1 px-0',
                      row: 'flex w-full mt-0',
                      cell: 'h-8 sm:h-9 flex-1 text-center text-xs px-0 py-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                      day: cn(
                        'h-8 sm:h-9 w-full px-0 py-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full transition-colors relative text-xs'
                      ),
                      day_range_end: 'day-range-end',
                      day_selected:
                        'bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-500',
                      day_today: 'bg-slate-100 text-[slate-900] font-semibold',
                      day_outside:
                        'day-outside text-slate-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-slate-500 aria-selected:opacity-30',
                      day_disabled: 'text-slate-400 opacity-50',
                      day_range_middle:
                        'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      day_hidden: 'invisible',
                    }}
                  />
                </div>
              ) : (
                <WeekView />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Scheduler - Full Width Button */}
      <div className="flex justify-center">
        <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="w-full max-w-md bg-blue-500 hover:bg-blue-600 text-slate-700 font-medium py-3 px-6 shadow-lg"
            >
              <Plus className="h-5 w-5 mr-3" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    placeholder="Enter event title"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Event Type</Label>
                  <Select
                    value={newEvent.type}
                    onValueChange={(value) =>
                      setNewEvent({
                        ...newEvent,
                        type: value as LocalCalendarEvent['type'],
                      })
                    }
                  >
                    <SelectTrigger>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEvent.dateString}
                    min={(() => {
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(
                        2,
                        '0'
                      );
                      const day = String(today.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()}
                    onChange={(e) => {
                      setNewEvent({
                        ...newEvent,
                        dateString: e.target.value,
                      });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (Optional)</Label>
                  <Input
                    id="amount"
                    value={newEvent.amount || ''}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, amount: e.target.value })
                    }
                    placeholder="Enter amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newEvent.startTime || ''}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newEvent.endTime || ''}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, endTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contractName">Contract Name (Optional)</Label>
                <Input
                  id="contractName"
                  value={newEvent.contractName || ''}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, contractName: e.target.value })
                  }
                  placeholder="Enter contract name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={newEvent.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                  placeholder="Enter event description"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddEventOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEvent}
                  disabled={!newEvent.title.trim() || creatingEvent}
                  className="bg-blue-500 hover:bg-blue-600 text-slate-500 "
                >
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CalendarView;
