'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  CalendarIcon,
  Plus,
  Clock,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  format,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isSameMonth,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { cn } from '@/lib/utils';

interface SimpleCalendarProps {
  user?: any;
}

interface LocalCalendarEvent {
  id: string;
  title: string;
  date?: Date;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  startTime?: string;
  endTime?: string;
  amount?: string;
  contractName?: string;
}

const SimpleCalendar: React.FC<SimpleCalendarProps> = ({ user }) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date(),
    type: 'meeting' as const,
    description: '',
    startTime: '',
    endTime: '',
    amount: '',
    contractName: '',
  });

  // Use proper data fetching hook
  const { events: calendarEvents, refresh } = useCalendarEvents();

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      toast({
        title: 'Error',
        description: 'Event title is required',
        variant: 'destructive',
      });
      return;
    }

    setCreatingEvent(true);
    try {
      const eventData = {
        title: newEvent.title,
        date: newEvent.date.toISOString(),
        type: newEvent.type,
        description: newEvent.description,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        amount: newEvent.amount,
        contractName: newEvent.contractName,
        createdBy: user?.$id || 'user',
      };

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create event');
      }

      toast({
        title: 'Success',
        description: 'Event created successfully',
      });

      setIsAddEventOpen(false);
      setNewEvent({
        title: '',
        date: new Date(),
        type: 'meeting',
        description: '',
        startTime: '',
        endTime: '',
        amount: '',
        contractName: '',
      });

      await refresh();
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: `Failed to create event: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        variant: 'destructive',
      });
    } finally {
      setCreatingEvent(false);
    }
  };

  const getEventTypeConfig = (type: string) => {
    const configs = {
      contract: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: FileText,
      },
      deadline: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertCircle,
      },
      meeting: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Users,
      },
      review: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: CheckCircle,
      },
      audit: {
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: FileText,
      },
    };
    return configs[type as keyof typeof configs] || configs.meeting;
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {/* Header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day) => {
          const dayEvents = (calendarEvents || []).filter((event) => {
            if (!event.date) return false;
            const eventDate = new Date(event.date);
            return isSameDay(eventDate, day);
          });

          const isCurrentDay = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[120px] bg-white p-1 border border-gray-200 cursor-pointer transition-colors',
                isSelected && 'bg-blue-50 border-blue-300',
                isCurrentDay && 'bg-blue-100',
                !isCurrentMonth && 'bg-gray-50 text-gray-400'
              )}
              onClick={() => handleDateSelect(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isCurrentDay && 'text-blue-600 font-bold',
                    isSelected && 'text-blue-700'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {isCurrentDay && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, index) => {
                  const config = getEventTypeConfig(event.type);
                  const IconComponent = config.icon;
                  return (
                    <div
                      key={event.id || `event-${index}-${event.title}`}
                      className={cn(
                        'text-xs p-1 rounded cursor-pointer flex items-center gap-1',
                        config.color
                      )}
                    >
                      <IconComponent className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{event.title}</span>
                      {event.startTime && (
                        <span className="text-xs opacity-75 ml-auto">
                          {event.startTime}
                        </span>
                      )}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
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

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddEventOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-4">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {renderMonthView()}
        </div>
      </div>

      {/* Event Creation Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, title: e.target.value })
                }
                placeholder="Event title"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={format(newEvent.date, 'yyyy-MM-dd')}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, date: new Date(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={newEvent.type}
                onValueChange={(value) =>
                  setNewEvent({ ...newEvent, type: value as any })
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
            <div className="grid grid-cols-2 gap-2">
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
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                placeholder="Event description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddEventOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateEvent} disabled={creatingEvent}>
                {creatingEvent ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleCalendar;
