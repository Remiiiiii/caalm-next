'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fetchUserNamesByIds } from '@/lib/actions/user.actions';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import CalendarSettings from '@/components/CalendarSettings';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { cn } from '@/lib/utils';
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
  Edit,
  Trash2,
  MessageSquare,
  Paperclip,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Grid3X3,
  Share2,
  Filter,
  Printer,
  Settings,
  Loader2,
  UserPlus,
  Link,
  Eye,
  Search,
} from 'lucide-react';
import {
  format,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isSameMonth,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  hasMicrosoftCalendarIntegration,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncMicrosoftCalendar,
} from '@/lib/actions/calendar.actions';

interface OutlookStyleCalendarProps {
  events?: any[];
  onEventClick?: (event: any) => void;
  onDateSelect?: (date: Date) => void;
  onEventCreate?: (event: any) => void;
  user?: any;
}

interface LocalCalendarEvent {
  $id?: string;
  id?: string;
  title: string;
  startDate: string | Date;
  endDate?: string | Date;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  startTime?: string;
  endTime?: string;
  amount?: string;
  contractName?: string;
  participants?: string;
  createdBy?: string;
  outlook_id?: string;
}

interface NewEventForm {
  title: string;
  date: Date;
  endDate: Date;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description: string;
  startTime: string;
  endTime: string;
  amount: string;
  contractName: string;
  participants: string;
}

const OutlookStyleCalendar: React.FC<OutlookStyleCalendarProps> = ({
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

  // Participant names state
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocalCalendarEvent | null>(
    null
  );
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareSettings, setShareSettings] = useState({
    users: [],
    permissions: 'view' as 'view' | 'edit',
    linkEnabled: false,
  });

  // Participant search state
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Function to generate smart placeholder times
  const getSmartPlaceholderTimes = (selectedDate: Date) => {
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    if (isToday) {
      // If it's today, use next hour from current time
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);

      const startTime = nextHour.toTimeString().slice(0, 5); // HH:MM format
      const endTime = new Date(nextHour.getTime() + 30 * 60 * 1000)
        .toTimeString()
        .slice(0, 5); // +30 minutes

      return { startTime, endTime };
    } else {
      // If it's not today, use 8:00 AM as default
      return { startTime: '08:00', endTime: '08:30' };
    }
  };

  // Function to search for users
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const users = await response.json();
        setSearchResults(users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Function to add participant
  const addParticipant = (user: any) => {
    if (!selectedParticipants.find((p) => p.$id === user.$id)) {
      setSelectedParticipants([...selectedParticipants, user]);
    }
    setParticipantSearch('');
    setSearchResults([]);
  };

  // Function to remove participant
  const removeParticipant = (userId: string) => {
    setSelectedParticipants(
      selectedParticipants.filter((p) => p.$id !== userId)
    );
  };

  // Function to handle cancel event creation
  const handleCancelEvent = () => {
    setIsAddEventOpen(false);
    setNewEvent({
      title: '',
      date: new Date(),
      endDate: new Date(),
      type: 'meeting',
      description: '',
      startTime: '',
      endTime: '',
      amount: '',
      contractName: '',
      participants: '',
    });
    // Reset participant state
    setSelectedParticipants([]);
    setParticipantSearch('');
    setSearchResults([]);
  };

  // Initialize with smart placeholder times
  const initialDate = new Date();
  const initialEndDate = new Date();
  const initialSmartTimes = getSmartPlaceholderTimes(initialDate);

  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    date: initialDate,
    endDate: initialEndDate,
    type: 'meeting',
    description: '',
    startTime: initialSmartTimes.startTime,
    endTime: initialSmartTimes.endTime,
    amount: '',
    contractName: '',
    participants: '',
  });

  // Use proper data fetching hook with current month
  const {
    events: calendarEvents,
    refresh,
    forceRefresh,
  } = useCalendarEvents({
    month: currentMonth,
    enableRealTime: true,
    pollingInterval: 10000,
  });

  // Combine local events with calendar events
  const allEvents = [...events, ...(calendarEvents || [])];

  // Debug logging
  console.log('Calendar events from hook:', calendarEvents);
  console.log('All events (combined):', allEvents);
  console.log('Current month:', currentMonth);
  console.log(
    'API key should be:',
    `/api/calendar/events?year=${currentMonth.getFullYear()}&month=${
      currentMonth.getMonth() + 1
    }`
  );

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

  // Add this useEffect to fetch participant names
  useEffect(() => {
    if (selectedEvent?.participants && selectedEvent.participants.length > 0) {
      setLoadingNames(true);
      // Handle both string and array formats
      const participantIds = Array.isArray(selectedEvent.participants)
        ? selectedEvent.participants
        : selectedEvent.participants
            .split(',')
            .map((id: string) => id.trim())
            .filter((id: string) => id.length > 0);

      fetchUserNamesByIds(participantIds)
        .then((users) => {
          setParticipantNames(users.map((user) => user.fullName));
          setLoadingNames(false);
        })
        .catch((error) => {
          console.error('Failed to fetch participant names:', error);
          setParticipantNames([]);
          setLoadingNames(false);
        });
    } else {
      setParticipantNames([]);
      setLoadingNames(false);
    }
  }, [selectedEvent?.participants]); // Re-run when participants change

  const handleSync = async () => {
    if (!user?.$id) return;

    try {
      setSyncing(true);
      const result = await syncMicrosoftCalendar(user.$id);

      if (result.success) {
        // Force refresh immediately to show synced events
        await forceRefresh();

        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to sync calendar',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
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

    if (date && isAddEventOpen) {
      setNewEvent((prev) => ({
        ...prev,
        date: date,
      }));
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
    return configs[type] || configs.meeting;
  };

  const getEventsForDate = (date: Date) => {
    return allEvents.filter((event) => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, date);
    });
  };

  const getEventsForWeek = (startDate: Date) => {
    const weekEvents = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      const dayEvents = getEventsForDate(date);
      weekEvents.push({ date, events: dayEvents });
    }
    return weekEvents;
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
      // Create date string in YYYY-MM-DD format to avoid timezone issues
      const year = newEvent.date.getFullYear();
      const month = String(newEvent.date.getMonth() + 1).padStart(2, '0');
      const day = String(newEvent.date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // Create end date string in YYYY-MM-DD format to avoid timezone issues
      const endYear = newEvent.endDate.getFullYear();
      const endMonth = String(newEvent.endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(newEvent.endDate.getDate()).padStart(2, '0');
      const endDateString = `${endYear}-${endMonth}-${endDay}`;

      const eventData = {
        title: newEvent.title,
        startDate: dateString,
        endDate: endDateString,
        type: newEvent.type,
        description: newEvent.description,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        amount: newEvent.amount,
        contractName: newEvent.contractName,
        participants: selectedParticipants.map((p) => p.$id).join(','),
        createdBy: user?.$id || 'user',
      };

      console.log('Creating event with data:', eventData);
      console.log('Original date:', newEvent.date);
      console.log('Date string created:', dateString);
      console.log('User object:', user);
      console.log('User ID:', user?.$id);

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

      const result = await response.json();
      console.log('Event created successfully:', result);

      toast({
        title: 'Success',
        description: 'Event created successfully',
      });

      setIsAddEventOpen(false);
      setNewEvent({
        title: '',
        date: new Date(),
        endDate: new Date(),
        type: 'meeting',
        description: '',
        startTime: '',
        endTime: '',
        amount: '',
        contractName: '',
        participants: '',
      });
      // Reset participant state
      setSelectedParticipants([]);
      setParticipantSearch('');
      setSearchResults([]);

      // Force refresh of calendar events
      await refresh();
      console.log('Calendar events refreshed after creation');

      // Auto-sync with Outlook if connected
      if (outlookConnected && user?.$id) {
        console.log('Auto-syncing with Outlook after event creation...');
        try {
          await syncMicrosoftCalendar(user.$id);
          console.log('Auto-sync completed');
        } catch (syncError) {
          console.warn('Auto-sync failed:', syncError);
          // Don't show error to user as the main event was created successfully
        }
      }
    } catch (error) {
      console.error('Error creating event:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        eventData: {
          title: newEvent.title,
          date: newEvent.date.toISOString(),
          type: newEvent.type,
          description: newEvent.description,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          amount: newEvent.amount,
          contractName: newEvent.contractName,
          participants: newEvent.participants,
          createdBy: user?.$id || 'user',
        },
        user: user,
      });
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

  const handleEditEvent = async () => {
    if (!selectedEvent || !selectedEvent.$id) return;

    setCreatingEvent(true);
    try {
      const eventData = {
        title: selectedEvent.title,
        startDate:
          typeof selectedEvent.startDate === 'string'
            ? selectedEvent.startDate
            : selectedEvent.startDate.toISOString(),
        type: selectedEvent.type,
        description: selectedEvent.description || '',
        startTime: selectedEvent.startTime || '',
        endTime: selectedEvent.endTime || '',
        amount: selectedEvent.amount || '',
        contractName: selectedEvent.contractName || '',
        participants: selectedEvent.participants || '',
      };

      await updateCalendarEvent(selectedEvent.$id, eventData);

      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });

      setIsEditEventOpen(false);
      setSelectedEvent(null);
      refresh();
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleDeleteEvent = () => {
    console.log('Delete button clicked, selectedEvent:', selectedEvent);
    if (!selectedEvent || (!selectedEvent.$id && !selectedEvent.id)) {
      console.log('No selected event or event ID');
      return;
    }

    setIsDeleteModalOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!selectedEvent || (!selectedEvent.$id && !selectedEvent.id)) {
      return;
    }

    // Use $id if available (from database), otherwise use id (from converted event)
    const eventId = selectedEvent.$id || selectedEvent.id;
    console.log('Attempting to delete event with ID:', eventId);

    try {
      const response = await fetch(
        `/api/calendar/events?id=${eventId}${
          deleteReason ? `&reason=${encodeURIComponent(deleteReason)}` : ''
        }`,
        {
          method: 'DELETE',
        }
      );

      console.log('Delete response status:', response.status);
      console.log('Delete response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Delete error data:', errorData);
        throw new Error(errorData.message || 'Failed to delete event');
      }

      const result = await response.json();
      console.log('Delete success result:', result);

      // Close dialogs and clear state IMMEDIATELY to prevent errors
      setIsEditEventOpen(false);
      setIsDeleteModalOpen(false);
      setSelectedEvent(null);
      setDeleteReason('');

      // Immediately force refresh to update the UI
      await forceRefresh();

      // Show success toast after UI is updated
      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting event:', error);

      // Close dialogs even on error to prevent UI issues
      setIsEditEventOpen(false);
      setIsDeleteModalOpen(false);
      setSelectedEvent(null);
      setDeleteReason('');

      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteReason('');
  };

  const openEditDialog = (event: LocalCalendarEvent) => {
    setSelectedEvent(event);
    setIsEditEventOpen(true);
  };

  const handleShare = async () => {
    try {
      // Generate shareable link
      const shareLink = `${window.location.origin}/calendar?shared=true&id=${selectedEvent?.$id}`;

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
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-700 bg-gray-50"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const dayEvents = allEvents.filter(
            (event) =>
              event.startDate && isSameDay(new Date(event.startDate), day)
          );

          // Debug logging for specific dates
          if (dayEvents.length > 0) {
            console.log(`Events for ${format(day, 'yyyy-MM-dd')}:`, dayEvents);
          }

          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[120px] p-2 bg-white border border-gray-200 cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-gray-50 text-gray-400',
                isSelected && 'bg-blue-50 border-blue-300'
              )}
              onClick={() => handleDateSelect(day)}
            >
              <div className="flex items-center justify-start mb-1">
                {isCurrentDay ? (
                  <div
                    className="w-7 h-7 rounded-full"
                    style={{
                      background:
                        'linear-gradient(135deg, #12477d 0%, #03afbf 100%)',
                    }}
                  >
                    <span className="text-white text-sm font-medium flex items-center justify-center h-full">
                      {format(day, 'd')}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm font-medium">{format(day, 'd')}</div>
                )}
              </div>

              {/* Events for this day */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, index) => {
                  const config = getEventTypeConfig(event.type);
                  return (
                    <div
                      key={event.$id || `event-${index}-${event.title}`}
                      className="bg-gray-100 border-l-4 border-gray-400 p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(event);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600">
                            {event.startTime || 'All Day'}
                          </span>
                          <span className="text-xs text-gray-800 truncate">
                            {event.title}
                          </span>
                        </div>
                        {event.outlook_id && (
                          <CheckCircle className="h-4 w-4 text-green flex-shrink-0 ml-2" />
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
            className="p-2 text-center text-sm font-medium text-gray-700 bg-gray-50"
          >
            <div>{format(day, 'EEE')}</div>
            <div className="text-lg font-bold">{format(day, 'd')}</div>
          </div>
        ))}

        {/* Day content */}
        {days.map((day) => {
          const dayEvents = allEvents.filter(
            (event) =>
              event.startDate && isSameDay(new Date(event.startDate), day)
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
                {dayEvents.map((event, index) => {
                  const config = getEventTypeConfig(event.type);
                  return (
                    <div
                      key={event.$id || `event-${index}-${event.title}`}
                      className={cn(
                        'text-xs p-2 rounded cursor-pointer',
                        config.color
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(event);
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div className="font-medium flex-1">{event.title}</div>
                        {event.outlook_id && (
                          <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
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
    <div className="space-y-6">
      {/* Calendar Title and Outlook Status */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold sidebar-gradient-text">Calendar</h1>
        {outlookConnected && (
          <div className="flex items-center border border-green-200 rounded-full gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm">
            <CheckCircle className="h-4 w-4 text-green" />
            <span>Outlook</span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex rounded-t-lg items-center justify-between p-6 border-b bg-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="h-8 w-8 p-0 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4 rotate-90" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="h-8 w-8 p-0 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4 rotate-90" />
            </Button>
          </div>
          <div className="text-2xl font-bold sidebar-gradient-text">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
            className="bg-white/30 backdrop-blur border border-white/40 shadow-md sidebar-gradient-text hover:bg-white/40"
          >
            Today
          </Button>
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
                <Grid3X3 className="h-4 w-4 text-slate-700 flex-shrink-0" />
                <span className="sidebar-gradient-text">Month</span>
              </TabsTrigger>
              <TabsTrigger value="week" className="flex items-center space-x-2">
                <CalendarDays className="h-4 w-4 flex-shrink-0" />
                <span className="sidebar-gradient-text">Week</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            variant="outline"
            className="bg-white/30 backdrop-blur border border-white/40 shadow-md sidebar-gradient-text hover:bg-white/40"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="bg-white/30 backdrop-blur border border-white/40 shadow-md sidebar-gradient-text hover:bg-white/40"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="bg-white/30 backdrop-blur border border-white/40 shadow-md sidebar-gradient-text hover:bg-white/40"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>

          {/* Sync Button */}
          {outlookConnected && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
              className="bg-white/30 backdrop-blur border border-white/40 shadow-md sidebar-gradient-text hover:bg-white/40"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 mr-2" /> Sync
                </>
              )}
            </Button>
          )}

          {/* Settings Button */}
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md sidebar-gradient-text hover:bg-white/40"
              >
                <Settings className="h-4 w-4 mr-2 text-slate-700" />
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

          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white/30 backdrop-blur border border-white/40 shadow-md sidebar-gradient-text hover:bg-white/40">
                <Plus className="h-4 w-4 mr-2 text-slate-700" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md p-0">
              {/* Gray top section */}
              <div className="bg-[#F0F0F0] px-6 py-6 border-b border-gray-200">
                <div className="flex items-center gap-2"></div>
              </div>
              <div className="flex items-center gap-2 px-6">
                <CalendarIcon className="h-4 w-4 text-[#0f5384]" />
                <DialogTitle className="sidebar-gradient-text font-bold text-lg">
                  Create New Event
                </DialogTitle>
              </div>

              {/* Content section */}
              <div className="p-6 space-y-4">
                <div>
                  <Label
                    className="block text-md text-slate-700 mb-1"
                    htmlFor="title"
                  >
                    Add a title
                  </Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    placeholder="Event title"
                    className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
                  />
                </div>
                <div>
                  <Label
                    className="block text-md text-slate-700 mb-1"
                    htmlFor="participants"
                  >
                    Participants
                  </Label>

                  {/* Selected Participants Display */}
                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedParticipants.map((participant) => (
                        <Badge
                          key={participant.$id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {participant.fullName || participant.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeParticipant(participant.$id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Participant Search */}
                  <div className="space-y-2">
                    <Input
                      placeholder="Search for participants..."
                      value={participantSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setParticipantSearch(value);
                        searchUsers(value);
                      }}
                      className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
                    />

                    {/* Search Results */}
                    {participantSearch.length >= 2 && (
                      <div className="max-h-40 overflow-y-auto border rounded-md bg-white">
                        {isSearching && (
                          <div className="p-2 text-sm text-gray-500">
                            Searching...
                          </div>
                        )}
                        {!isSearching && searchResults.length === 0 && (
                          <div className="p-2 text-sm text-gray-500">
                            No users found.
                          </div>
                        )}
                        {searchResults.length > 0 && (
                          <div className="space-y-1">
                            {searchResults.map((user) => (
                              <div
                                key={user.$id}
                                className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                onClick={() => addParticipant(user)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">
                                    {user.fullName || user.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {user.email}
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  <UserPlus className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Date and Time Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Column 1: Dates */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="date" className="text-sm">
                        Start Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between font-normal text-sm h-9"
                          >
                            {newEvent.date
                              ? newEvent.date.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: '2-digit',
                                })
                              : 'Start date'}
                            <CalendarDays className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto overflow-hidden p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={newEvent.date}
                            onSelect={(date) => {
                              const selectedDate = date || new Date();
                              const smartTimes =
                                getSmartPlaceholderTimes(selectedDate);
                              setNewEvent({
                                ...newEvent,
                                date: selectedDate,
                                startTime:
                                  newEvent.startTime || smartTimes.startTime,
                                endTime: newEvent.endTime || smartTimes.endTime,
                              });
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="endDate" className="text-sm">
                        End Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between font-normal text-sm h-9"
                          >
                            {newEvent.endDate
                              ? newEvent.endDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: '2-digit',
                                })
                              : 'End date'}
                            <CalendarDays className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto overflow-hidden p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={newEvent.endDate}
                            onSelect={(date) => {
                              const selectedEndDate = date || new Date();
                              setNewEvent({
                                ...newEvent,
                                endDate: selectedEndDate,
                              });
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Column 2: Times */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="startTime" className="text-sm">
                        Start Time
                      </Label>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal text-sm h-9"
                        onClick={() => {
                          const timeInput = document.getElementById(
                            'startTime'
                          ) as HTMLInputElement;
                          timeInput?.showPicker?.();
                        }}
                      >
                        {newEvent.startTime ||
                          getSmartPlaceholderTimes(newEvent.date).startTime}
                        <Clock className="h-3 w-3" />
                      </Button>
                      <Input
                        id="startTime"
                        type="time"
                        value={newEvent.startTime}
                        placeholder={
                          getSmartPlaceholderTimes(newEvent.date).startTime
                        }
                        onChange={(e) =>
                          setNewEvent({
                            ...newEvent,
                            startTime: e.target.value,
                          })
                        }
                        className="h-9 text-sm hidden"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime" className="text-sm">
                        End Time
                      </Label>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal text-sm h-9"
                        onClick={() => {
                          const timeInput = document.getElementById(
                            'endTime'
                          ) as HTMLInputElement;
                          timeInput?.showPicker?.();
                        }}
                      >
                        {newEvent.endTime ||
                          getSmartPlaceholderTimes(newEvent.date).endTime}
                        <Clock className="h-3 w-3" />
                      </Button>
                      <Input
                        id="endTime"
                        type="time"
                        value={newEvent.endTime}
                        placeholder={
                          getSmartPlaceholderTimes(newEvent.date).endTime
                        }
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, endTime: e.target.value })
                        }
                        className="h-9 text-sm hidden"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newEvent.type}
                    onValueChange={(value: any) =>
                      setNewEvent({ ...newEvent, type: value })
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

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                    placeholder="Event description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="contractName">Contract Name</Label>
                  <Input
                    id="contractName"
                    value={newEvent.contractName}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, contractName: e.target.value })
                    }
                    placeholder="Contract name (optional)"
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    value={newEvent.amount}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, amount: e.target.value })
                    }
                    placeholder="Amount (optional)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelEvent}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEvent} disabled={creatingEvent}>
                    {creatingEvent ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar View */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'month' ? renderMonthView() : renderWeekView()}
        </CardContent>
      </Card>

      {/* Event Edit Dialog */}
      <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent &&
                getEventTypeConfig(selectedEvent.type).icon &&
                React.createElement(
                  getEventTypeConfig(selectedEvent.type).icon,
                  {
                    className: 'w-5 h-5',
                  }
                )}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {/* Event Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(new Date(selectedEvent.startDate), 'EEE M/d/yyyy')}
                    {selectedEvent.startTime && ` ${selectedEvent.startTime}`}
                    {selectedEvent.endTime && ` - ${selectedEvent.endTime}`}
                  </span>
                </div>

                {selectedEvent.description && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MessageSquare className="w-4 h-4 mt-0.5" />
                    <span className="break-words">
                      {selectedEvent.description.replace(/<[^>]*>/g, '')}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 mt-0.5" />
                  <span>
                    {(() => {
                      // Check if participants exist (handle both string and array formats)
                      const hasParticipants =
                        selectedEvent.participants &&
                        (Array.isArray(selectedEvent.participants)
                          ? selectedEvent.participants.length > 0
                          : typeof selectedEvent.participants === 'string' &&
                            selectedEvent.participants.trim().length > 0);

                      if (!hasParticipants) {
                        return 'No participants';
                      }

                      return loadingNames ? (
                        <span className="text-gray-400">
                          Loading participants...
                        </span>
                      ) : participantNames.length > 0 ? (
                        participantNames.join(', ')
                      ) : Array.isArray(selectedEvent.participants) ? (
                        selectedEvent.participants.join(', ')
                      ) : selectedEvent.participants ? (
                        selectedEvent.participants.toString()
                      ) : (
                        'No participants'
                      );
                    })()}
                  </span>
                </div>
              </div>

              {/* AI Suggestions (Outlook-style) */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Paperclip className="w-4 h-4" />
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs">
                      What pre-reads should I review?
                    </span>
                  </div>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat with AI Assistant
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Pre-fill edit form
                    setNewEvent({
                      title: selectedEvent.title,
                      date: new Date(selectedEvent.startDate),
                      endDate: new Date(
                        selectedEvent.endDate || selectedEvent.startDate
                      ), // Use endDate if available, otherwise startDate
                      type: selectedEvent.type,
                      description: selectedEvent.description || '',
                      startTime: selectedEvent.startTime || '',
                      endTime: selectedEvent.endTime || '',
                      amount: selectedEvent.amount || '',
                      contractName: selectedEvent.contractName || '',
                      participants: selectedEvent.participants || '',
                    });
                    setIsEditEventOpen(false);
                    setIsAddEventOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteEvent}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
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
                <Input placeholder="Search users..." className="flex-1" />
                <Button size="sm">
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
                <SelectTrigger>
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
                className="flex-1"
              >
                <Link className="h-4 w-4 mr-2" />
                Generate Link
              </Button>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsShareOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleShare}>Share</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Event
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedEvent?.title}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="deleteReason"
                className="text-sm font-medium text-slate-700"
              >
                Reason for deletion (optional)
              </Label>
              <Textarea
                id="deleteReason"
                placeholder="Please provide a reason for deleting this event..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={cancelDelete}
                className="border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteEvent}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutlookStyleCalendar;
