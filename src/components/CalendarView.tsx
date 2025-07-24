'use client';

import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

// Event interface
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  participants?: string[];
  contractName?: string;
  amount?: string;
  startTime?: string;
  endTime?: string;
}

// Mock data - replace with actual data from your backend
const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Contract Renewal',
    date: new Date(2024, 11, 15),
    type: 'contract',
    description: 'Federal IT Services Contract renewal deadline',
    contractName: 'Federal IT Services Contract',
    amount: '$2.5M',
    startTime: '09:00',
    endTime: '10:30',
  },
  {
    id: '2',
    title: 'Audit Review',
    date: new Date(2024, 11, 20),
    type: 'audit',
    description: 'Annual compliance audit review meeting',
    participants: ['Legal Team', 'Finance Team'],
    startTime: '14:00',
    endTime: '16:00',
  },
  {
    id: '3',
    title: 'Vendor Meeting',
    date: new Date(2024, 11, 22),
    type: 'meeting',
    description: 'New vendor agreement discussion',
    participants: ['Procurement', 'Legal'],
    startTime: '11:00',
    endTime: '12:00',
  },
  {
    id: '4',
    title: 'Document Review',
    date: new Date(2024, 11, 25),
    type: 'review',
    description: 'State licensing agreement review',
    contractName: 'State Licensing Agreement',
    startTime: '15:30',
    endTime: '17:00',
  },
  {
    id: '5',
    title: 'Deadline Alert',
    date: new Date(2024, 11, 28),
    type: 'deadline',
    description: 'Municipal services contract expiration',
    contractName: 'Municipal Services Contract',
    startTime: '16:00',
    endTime: '16:30',
  },
];

// Event type configurations
const eventTypeConfig = {
  contract: { color: 'bg-blue-500', icon: FileText, label: 'Contract' },
  deadline: { color: 'bg-red-500', icon: Clock, label: 'Deadline' },
  meeting: { color: 'bg-green-500', icon: Users, label: 'Meeting' },
  review: { color: 'bg-yellow-500', icon: FileText, label: 'Review' },
  audit: { color: 'bg-purple-500', icon: FileText, label: 'Audit' },
};

interface CalendarViewProps {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
  onEventCreate?: (event: Omit<CalendarEvent, 'id'>) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events = mockEvents,
  onEventClick,
  onDateSelect,
  onEventCreate,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date(),
    type: 'meeting' as CalendarEvent['type'],
    description: '',
    contractName: '',
    amount: '',
    startTime: '',
    endTime: '',
    participants: [] as string[],
  });

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((event) => isSameDay(event.date, selectedDate));
  }, [events, selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const getEventTypeConfig = (type: CalendarEvent['type']) => {
    return eventTypeConfig[type];
  };

  const handleAddEvent = () => {
    if (!newEvent.title.trim()) return;

    const eventToCreate: Omit<CalendarEvent, 'id'> = {
      title: newEvent.title,
      date: newEvent.date,
      type: newEvent.type,
      description: newEvent.description || undefined,
      contractName: newEvent.contractName || undefined,
      amount: newEvent.amount || undefined,
      startTime: newEvent.startTime || undefined,
      endTime: newEvent.endTime || undefined,
      participants:
        newEvent.participants.length > 0 ? newEvent.participants : undefined,
    };

    onEventCreate?.(eventToCreate);

    // Reset form
    setNewEvent({
      title: '',
      date: new Date(),
      type: 'meeting',
      description: '',
      contractName: '',
      amount: '',
      startTime: '',
      endTime: '',
      participants: [],
    });

    setIsAddEventOpen(false);
  };

  // Week view component with list-style events
  const WeekView = () => {
    const weekDays = eachDayOfInterval({
      start: startOfWeek(currentMonth),
      end: endOfWeek(currentMonth),
    });

    return (
      <div className="space-y-6">
        {/* Week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-slate-600">
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
        <div className="h-[280px] overflow-y-auto border rounded-lg">
          <div className="space-y-0">
            {weekDays.map((day) => {
              const dayEvents = events.filter((event) =>
                isSameDay(event.date, day)
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
    <div className="space-y-6">
      {/* Calendar Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-bold text-slate-800">
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

          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
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
                          type: value as CalendarEvent['type'],
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
                      value={format(newEvent.date, 'yyyy-MM-dd')}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          date: new Date(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, startTime: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, endTime: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (optional)</Label>
                    <Input
                      id="amount"
                      value={newEvent.amount}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, amount: e.target.value })
                      }
                      placeholder="$0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contractName">Contract Name (optional)</Label>
                  <Input
                    id="contractName"
                    value={newEvent.contractName}
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
                    disabled={!newEvent.title.trim()}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Create Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="bg-white/95 backdrop-blur border border-white/60 shadow-xl">
            <CardContent className="p-6">
              {viewMode === 'month' ? (
                <div className="[&_.rdp-caption]:!hidden [&_.rdp-nav]:!hidden">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    onMonthChange={handleMonthChange}
                    className="w-full"
                    classNames={{
                      months:
                        'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                      month: 'space-y-4',
                      caption: 'hidden',
                      caption_label: 'hidden',
                      nav: 'hidden',
                      nav_button: 'hidden',
                      nav_button_previous: 'hidden',
                      nav_button_next: 'hidden',
                      table: 'w-full border-collapse space-y-1',
                      head_row: 'flex',
                      head_cell:
                        'text-slate-600 rounded-md w-10 font-semibold text-sm py-3',
                      row: 'flex w-full mt-1',
                      cell: 'h-12 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                      day: cn(
                        'h-12 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-md transition-colors relative'
                      ),
                      day_range_end: 'day-range-end',
                      day_selected:
                        'bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-500',
                      day_today: 'bg-slate-100 text-slate-900 font-semibold',
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

        {/* Events for Selected Date */}
        <div className="lg:col-span-1">
          <Card className="bg-white/95 backdrop-blur border border-white/60 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">
                {selectedDate ? (
                  <>
                    {format(selectedDate, 'EEEE')}
                    <br />
                    <span className="text-sm font-normal text-slate-500">
                      {format(selectedDate, 'MMMM d, yyyy')}
                    </span>
                  </>
                ) : (
                  'Select a date'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedDate ? (
                selectedDateEvents.length > 0 ? (
                  <div className="h-[280px] overflow-y-auto">
                    <div className="p-4 space-y-3">
                      {selectedDateEvents.map((event) => {
                        const config = getEventTypeConfig(event.type);
                        const IconComponent = config.icon;

                        return (
                          <Popover key={event.id}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-start p-4 h-auto bg-white/60 hover:bg-white/80 border border-slate-200 rounded-lg shadow-sm"
                                onClick={() => onEventClick?.(event)}
                              >
                                <div className="flex items-start gap-3 w-full">
                                  <div
                                    className={cn(
                                      'w-3 h-3 rounded-full mt-1 flex-shrink-0',
                                      config.color
                                    )}
                                  />
                                  <div className="flex-1 text-left">
                                    <div className="font-semibold text-slate-800">
                                      {event.title}
                                    </div>
                                    <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                                      <IconComponent className="h-3 w-3" />
                                      {config.label}
                                    </div>
                                    {event.startTime && (
                                      <div className="text-xs text-slate-500 mt-1">
                                        {event.startTime} - {event.endTime}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      'w-3 h-3 rounded-full',
                                      config.color
                                    )}
                                  />
                                  <span className="font-semibold text-slate-800">
                                    {event.title}
                                  </span>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-slate-600">
                                    {event.description}
                                  </p>
                                )}
                                {event.contractName && (
                                  <div className="text-sm">
                                    <span className="font-medium">
                                      Contract:
                                    </span>{' '}
                                    {event.contractName}
                                  </div>
                                )}
                                {event.amount && (
                                  <div className="text-sm">
                                    <span className="font-medium">Amount:</span>{' '}
                                    {event.amount}
                                  </div>
                                )}
                                {event.startTime && event.endTime && (
                                  <div className="text-sm">
                                    <span className="font-medium">Time:</span>{' '}
                                    {event.startTime} - {event.endTime}
                                  </div>
                                )}
                                {event.participants &&
                                  event.participants.length > 0 && (
                                    <div className="text-sm">
                                      <span className="font-medium">
                                        Participants:
                                      </span>
                                      <div className="mt-1 space-y-1">
                                        {event.participants.map(
                                          (participant, index) => (
                                            <Badge
                                              key={index}
                                              variant="secondary"
                                              className="mr-1"
                                            >
                                              {participant}
                                            </Badge>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                <div className="text-xs text-slate-500 pt-2 border-t">
                                  {format(event.date, 'EEEE, MMMM d, yyyy')}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      No events scheduled
                    </p>
                    <p className="text-sm mb-4">
                      Click &quot;Add Event&quot; to schedule something
                    </p>
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => setIsAddEventOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Select a date</p>
                  <p className="text-sm">Choose a date to view events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
