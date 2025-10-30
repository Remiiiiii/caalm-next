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
  Pencil,
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
  MapPin,
  Tag,
  FileSliders,
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
  type:
    | 'contract review'
    | 'deadline discussion'
    | 'meeting'
    | 'internal review'
    | 'audit';
  description?: string;
  startTime?: string;
  endTime?: string;
  contractName?: string;
  participants?: string;
  location?: string;
  createdBy?: string;
  outlook_id?: string;
}

interface NewEventForm {
  title: string;
  date: Date;
  endDate: Date;
  type:
    | 'contract review'
    | 'deadline discussion'
    | 'meeting'
    | 'internal review'
    | 'audit';
  description: string;
  startTime: string;
  endTime: string;
  contractName: string;
  participants: string;
  location: string;
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
  // Overflow dialog state for days with more than 3 events
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [overflowDate, setOverflowDate] = useState<Date | null>(null);
  const [overflowEvents, setOverflowEvents] = useState<LocalCalendarEvent[]>(
    []
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

  // Contracts state for dropdown
  const [contracts, setContracts] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  // Location search state
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<
    Array<{ id: string; name: string; address: string }>
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

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

  // Function to generate time options for dropdowns (30-minute intervals, 12-hour format)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);

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

  // Function to convert 24-hour format to 12-hour format for display
  const formatTimeForDisplay = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const hours12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hours12}:${minutes} ${ampm}`;
  };

  // Function to fetch contracts from database
  const fetchContracts = async () => {
    setLoadingContracts(true);
    try {
      const response = await fetch('/api/contracts/database');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.contracts) {
          setContracts(data.contracts);
        }
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoadingContracts(false);
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

  // Function to search for locations
  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setLocationResults([]);
      return;
    }

    setIsSearchingLocation(true);
    try {
      const response = await fetch(
        `/api/locations/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.locations) {
          setLocationResults(data.locations);
        }
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setLocationResults([]);
    } finally {
      setIsSearchingLocation(false);
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
      contractName: '',
      participants: '',
      location: '',
    });
    // Reset participant state
    setSelectedParticipants([]);
    setParticipantSearch('');
    setSearchResults([]);
    // Reset location state
    setLocationSearch('');
    setLocationResults([]);
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
    contractName: '',
    participants: '',
    location: '',
  });

  // Fetch contracts when Contract Name becomes visible (when type is contract)
  useEffect(() => {
    const t = (newEvent.type as unknown as string)?.toLowerCase?.() || '';
    if (
      (t === 'contract' || t === 'contract review') &&
      contracts.length === 0
    ) {
      fetchContracts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newEvent.type]);

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
      'contract review': {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: FileText,
      },
      'deadline discussion': {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: Clock,
      },
      meeting: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: Users,
      },
      'internal review': {
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
        contractName: newEvent.contractName,
        participants: selectedParticipants
          .map((p) => `${p.fullName || p.name} <${p.email}>`)
          .join(', '),
        location: newEvent.location || undefined,
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
        contractName: '',
        participants: '',
        location: '',
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
      const normalizeEventType = (
        t: string
      ): 'contract' | 'deadline' | 'meeting' | 'review' | 'audit' => {
        const v = (t || '').toLowerCase().trim();
        if (v === 'contract review' || v === 'contract') return 'contract';
        if (v === 'deadline discussion' || v === 'deadline') return 'deadline';
        if (v === 'internal review' || v === 'review') return 'review';
        if (v === 'meeting') return 'meeting';
        return 'audit';
      };
      const eventData = {
        title: selectedEvent.title,
        startDate:
          typeof selectedEvent.startDate === 'string'
            ? selectedEvent.startDate
            : selectedEvent.startDate.toISOString(),
        type: normalizeEventType(selectedEvent.type as unknown as string),
        description: selectedEvent.description || '',
        startTime: selectedEvent.startTime || '',
        endTime: selectedEvent.endTime || '',
        contractName: selectedEvent.contractName || '',
        participants:
          selectedParticipants.length > 0
            ? selectedParticipants
                .map((p) => `${p.fullName || p.name} <${p.email}>`)
                .join(', ')
            : selectedEvent.participants || '',
        location: selectedEvent.location || undefined,
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

  // Update handler when using the Create/Update dialog in update mode
  const handleUpdateEventFromDialog = async () => {
    if (!selectedEvent || !selectedEvent.$id) return;
    setCreatingEvent(true);
    try {
      const normalizeType = (
        t: string
      ): 'contract' | 'deadline' | 'meeting' | 'review' | 'audit' => {
        const v = (t || '').toLowerCase().trim();
        if (v === 'contract review' || v === 'contract') return 'contract';
        if (v === 'deadline discussion' || v === 'deadline') return 'deadline';
        if (v === 'internal review' || v === 'review') return 'review';
        if (v === 'meeting') return 'meeting';
        return 'audit';
      };

      const eventData = {
        title: newEvent.title,
        startDate: (newEvent.date || new Date()).toISOString(),
        type: normalizeType(newEvent.type as unknown as string),
        description: newEvent.description || '',
        startTime: newEvent.startTime || '',
        endTime: newEvent.endTime || '',
        contractName: newEvent.contractName || '',
        participants:
          selectedParticipants.length > 0
            ? selectedParticipants
                .map((p) => `${p.fullName || p.name} <${p.email}>`)
                .join(', ')
            : '',
        location: (newEvent as any).location || undefined,
      };

      await updateCalendarEvent(selectedEvent.$id, eventData);

      toast({ title: 'Success', description: 'Event updated successfully' });
      setIsAddEventOpen(false);
      setSelectedEvent(null);
      refresh();
    } catch (error) {
      console.error('Error updating event from dialog:', error);
      toast({
        title: 'Error',
        description: 'Failed to update event',
        variant: 'destructive',
      });
    } finally {
      setCreatingEvent(false);
    }
  };
  // Display-friendly label for event type (keeps full text like "Deadline Discussion")
  const getEventTypeLabel = (
    t: string | undefined
  ):
    | 'Contract Review'
    | 'Deadline Discussion'
    | 'Meeting'
    | 'Internal Review'
    | 'Audit'
    | '' => {
    if (!t) return '';
    const v = t.toLowerCase().trim();
    if (v === 'contract review' || v === 'contract') return 'Contract Review';
    if (v === 'deadline discussion' || v === 'deadline')
      return 'Deadline Discussion';
    if (v === 'internal review' || v === 'review') return 'Internal Review';
    if (v === 'meeting') return 'Meeting';
    return 'Audit';
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
          // Build local day range to avoid TZ drift (off-by-one)
          const start = new Date(day);
          start.setHours(0, 0, 0, 0);
          const end = new Date(day);
          end.setHours(23, 59, 59, 999);
          const dayEvents = allEvents.filter((event) => {
            const raw = (event as any)?.startDate || (event as any)?.date;
            if (!raw) return false;
            const d = new Date(raw);
            return d >= start && d <= end;
          });

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
                'min-h-[120px] max-h-[120px] overflow-hidden p-2 bg-white border border-gray-200 cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-gray-50 text-gray-400',
                isSelected && 'bg-gray-50 border-blue-300'
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
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                          {event.startTime
                            ? formatTimeForDisplay(event.startTime)
                            : 'All Day'}
                        </span>

                        <span className="text-xs text-gray-800 truncate">
                          {event.title}
                        </span>
                        {event.outlook_id && (
                          <CheckCircle className="h-4 w-4 text-green flex-shrink-0 ml-auto" />
                        )}
                      </div>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <button
                    type="button"
                    className="w-full text-xs text-slate-600 text-center hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOverflowDate(day);
                      setOverflowEvents(dayEvents);
                      setIsOverflowOpen(true);
                    }}
                  >
                    +{dayEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Overflow dialog listing all events for a selected day
  const OverflowDialog = () => (
    <Dialog open={isOverflowOpen} onOpenChange={setIsOverflowOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {overflowDate
              ? format(overflowDate, 'EEEE, MMMM d, yyyy')
              : 'Events'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {overflowEvents.map((event) => {
            const config = getEventTypeConfig(event.type);
            const IconComp = config.icon;
            return (
              <button
                key={
                  event.$id || event.id || `${event.title}-${event.startDate}`
                }
                type="button"
                onClick={() => {
                  setIsOverflowOpen(false);
                  openEditDialog(event);
                }}
                className={cn(
                  'w-full text-left p-3 rounded border flex items-center gap-3 hover:bg-slate-50',
                  'border-slate-200'
                )}
              >
                <IconComp className="h-4 w-4 flex-shrink-0 text-slate-600" />
                <span className="text-xs text-slate-600 flex-shrink-0">
                  {event.startTime
                    ? `${formatTimeForDisplay(event.startTime)}${
                        event.endTime
                          ? ` - ${formatTimeForDisplay(event.endTime)}`
                          : ''
                      }`
                    : 'All Day'}
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-sm font-medium truncate min-w-0">
                  {event.title}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );

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
                'min-h-[160px] p-2 border border-slate-200 cursor-pointer transition-colors',
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
                        'text-xs px-2 py-1.5 rounded cursor-pointer',
                        config.color
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(event);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 leading-none">
                        <span className="text-[11px] font-medium text-gray-700 whitespace-nowrap">
                          {event.startTime
                            ? formatTimeForDisplay(event.startTime)
                            : 'All Day'}
                        </span>
                        <span className="text-slate-500 text-[11px]">•</span>
                        <span className="text-[12px] font-medium text-gray-900 truncate">
                          {event.title}
                        </span>
                        {event.outlook_id && (
                          <CheckCircle className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 ml-auto" />
                        )}
                      </div>
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
            className="primary-btn px-3 sm:px-4"
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="primary-btn px-3 sm:px-4"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="primary-btn px-3 sm:px-4"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>

          {/* Sync Button */}
          {outlookConnected && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
              className="primary-btn px-3 sm:px-4"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4" /> Sync
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
                className="primary-btn px-3 sm:px-4"
              >
                <Settings className="h-4 w-4 text-white" />
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
              <Button
                size="sm"
                variant="outline"
                className="primary-btn px-3 sm:px-4"
                onClick={() => {
                  // Ensure this dialog opens in create mode
                  setSelectedEvent(null);
                  setNewEvent({
                    title: '',
                    date: new Date(),
                    endDate: new Date(),
                    type: 'meeting',
                    description: '',
                    startTime: getSmartPlaceholderTimes(new Date()).startTime,
                    endTime: getSmartPlaceholderTimes(new Date()).endTime,
                    contractName: '',
                    participants: '',
                    location: '',
                  });
                }}
              >
                <Plus className="h-4 w-4 text-white" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[700px] p-0 max-h-[90vh] flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
              {/* Professional Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm"></div>
                    <div>
                      <div className="flex items-center gap-2">
                        {selectedEvent ? (
                          <Pencil className="h-5 w-5 text-[#0f5384]" />
                        ) : (
                          <CalendarIcon className="h-5 w-5 text-[#0f5384]" />
                        )}
                        <DialogTitle className="text-xl font-semibold sidebar-gradient-text">
                          {selectedEvent ? 'Update Event' : 'Create New Event'}
                        </DialogTitle>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 ml-7">
                        {selectedEvent
                          ? 'Update the details for your event'
                          : 'Schedule a professional meeting or event'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content section with scroll */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Event Title Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <Label
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
                    htmlFor="title"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Event Title
                  </Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    placeholder="Enter a descriptive title for your event"
                    className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 h-11 text-base"
                  />
                </div>
                {/* Participants Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <Label
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
                    htmlFor="participants"
                  >
                    <Users className="w-4 h-4 text-blue-600" />
                    Participants
                  </Label>

                  {/* Selected Participants Display */}
                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedParticipants.map((participant) => (
                        <Badge
                          key={participant.$id}
                          variant="secondary"
                          className="flex items-center gap-2 bg-blue-100 text-blue-800 border-blue-200 px-3 py-1"
                        >
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {(participant.fullName || participant.name)
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">
                            {participant.fullName || participant.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-blue-200 rounded-full"
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
                      placeholder="Search for team members..."
                      value={participantSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setParticipantSearch(value);
                        searchUsers(value);
                      }}
                      className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 h-11"
                    />

                    {/* Search Results */}
                    {participantSearch.length >= 2 && (
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                        {isSearching && (
                          <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            Searching team members...
                          </div>
                        )}
                        {!isSearching && searchResults.length === 0 && (
                          <div className="p-3 text-sm text-slate-500">
                            No team members found.
                          </div>
                        )}
                        {searchResults.length > 0 && (
                          <div className="divide-y divide-slate-100">
                            {searchResults.map((user) => (
                              <div
                                key={user.$id}
                                className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                                onClick={() => addParticipant(user)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-sm font-medium">
                                    {(user.fullName || user.name)
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm text-slate-900">
                                      {user.fullName || user.name}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {user.email}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-blue-100 rounded-full"
                                >
                                  <UserPlus className="h-4 w-4 text-blue-600" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Date and Time Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Schedule
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Column 1: Dates */}
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="date"
                          className="text-sm font-medium text-slate-700 mb-2 block"
                        >
                          Start Date
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between font-normal text-sm h-11 bg-white border-slate-300 hover:border-blue-500"
                            >
                              {newEvent.date
                                ? newEvent.date.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Select start date'}
                              <CalendarDays className="h-4 w-4 text-slate-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0 shadow-lg border-slate-200"
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
                                  endTime:
                                    newEvent.endTime || smartTimes.endTime,
                                });
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label
                          htmlFor="endDate"
                          className="text-sm font-medium text-slate-700 mb-2 block"
                        >
                          End Date
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between font-normal text-sm h-11 bg-white border-slate-300 hover:border-blue-500"
                            >
                              {newEvent.endDate
                                ? newEvent.endDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Select end date'}
                              <CalendarDays className="h-4 w-4 text-slate-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto overflow-hidden p-0 shadow-lg border-slate-200"
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
                        <Label
                          htmlFor="startTime"
                          className="text-sm font-medium text-slate-700 mb-2 block"
                        >
                          Start Time
                        </Label>
                        <Select
                          value={
                            newEvent.startTime ||
                            getSmartPlaceholderTimes(newEvent.date).startTime
                          }
                          onValueChange={(value) =>
                            setNewEvent({ ...newEvent, startTime: value })
                          }
                        >
                          <SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
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
                          htmlFor="endTime"
                          className="text-sm font-medium text-slate-700 mb-2 block"
                        >
                          End Time
                        </Label>
                        <Select
                          value={
                            newEvent.endTime ||
                            getSmartPlaceholderTimes(newEvent.date).endTime
                          }
                          onValueChange={(value) =>
                            setNewEvent({ ...newEvent, endTime: value })
                          }
                        >
                          <SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
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
                  </div>
                </div>

                {/* Event Type Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <Label
                    htmlFor="type"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
                  >
                    <Tag className="w-4 h-4 text-blue-600" />
                    Event Type
                  </Label>
                  <Select
                    value={newEvent.type}
                    onValueChange={(value: any) =>
                      setNewEvent({ ...newEvent, type: value })
                    }
                  >
                    <SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent className="shadow-lg border-slate-200">
                      <SelectItem value="audit">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          Audit
                        </div>
                      </SelectItem>
                      <SelectItem value="contract">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Contract Review
                        </div>
                      </SelectItem>
                      <SelectItem value="meeting">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Meeting
                        </div>
                      </SelectItem>
                      <SelectItem value="deadline">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Deadline Discussion
                        </div>
                      </SelectItem>
                      <SelectItem value="review">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          Internal Review
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Contract Selection (conditional) */}
                {['contract', 'contract review'].includes(
                  (newEvent.type as unknown as string).toLowerCase()
                ) && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <Label
                      htmlFor="contractName"
                      className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      Related Contract
                    </Label>
                    <Select
                      value={newEvent.contractName}
                      onValueChange={(value) =>
                        setNewEvent({ ...newEvent, contractName: value })
                      }
                    >
                      <SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
                        <SelectValue placeholder="Select a contract to review" />
                      </SelectTrigger>
                      <SelectContent className="shadow-lg border-slate-200">
                        {loadingContracts ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              Loading contracts...
                            </div>
                          </SelectItem>
                        ) : contracts.length > 0 ? (
                          contracts.map((contract) => (
                            <SelectItem key={contract.id} value={contract.name}>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-500" />
                                {contract.name}
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-contracts" disabled>
                            No contracts available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Location Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <Label
                    htmlFor="location"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
                  >
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Location
                  </Label>
                  {/* Location Search */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        placeholder="Search for a meeting room or location..."
                        value={locationSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLocationSearch(value);
                          setNewEvent({ ...newEvent, location: value });
                          searchLocations(value);
                        }}
                        onFocus={() => {
                          if (locationSearch.length >= 2) {
                            searchLocations(locationSearch);
                          }
                        }}
                        className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 h-11 pl-10"
                      />
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>

                    {/* Location Search Results */}
                    {locationSearch.length >= 2 &&
                      locationResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                          {isSearchingLocation && (
                            <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              Searching locations...
                            </div>
                          )}
                          {!isSearchingLocation &&
                            locationResults.length > 0 && (
                              <div className="divide-y divide-slate-100">
                                {locationResults.map((location) => (
                                  <div
                                    key={location.id}
                                    className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                                    onClick={() => {
                                      setNewEvent({
                                        ...newEvent,
                                        location: location.address,
                                      });
                                      setLocationSearch(location.address);
                                      setLocationResults([]);
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                        <MapPin className="h-4 w-4 text-slate-500" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-sm text-slate-900">
                                          {location.name}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                          {location.address}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-blue-100 rounded-full"
                                    >
                                      <Plus className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      )}

                    {/* No results message - only show when actively searching and no results */}
                    {locationSearch.length >= 2 &&
                      !isSearchingLocation &&
                      locationResults.length === 0 &&
                      !newEvent.location && (
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
                          <div className="p-3 text-sm text-slate-500">
                            No locations found. You can enter a custom location.
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Description Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <Label
                    htmlFor="description"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
                  >
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                    placeholder="Add meeting agenda, objectives, or any additional details..."
                    rows={4}
                    className="bg-white border-slate-300 focus:border-[#078FAB] focus:ring-1 focus:ring-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB] focus-visible:ring-offset-0 resize-none"
                  />
                </div>
              </div>

              {/* Professional Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    {newEvent.description
                      ? `${newEvent.description.length} characters`
                      : 'Enter event details'}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="primary-btn px-3 sm:px-4"
                      onClick={handleCancelEvent}
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button
                      className="primary-btn px-3 sm:px-4"
                      onClick={
                        selectedEvent
                          ? handleUpdateEventFromDialog
                          : handleCreateEvent
                      }
                      disabled={creatingEvent || !newEvent.title.trim()}
                    >
                      {creatingEvent ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          {selectedEvent ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          {selectedEvent ? (
                            <Pencil className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          {selectedEvent ? 'Update Event' : 'Create Event'}
                        </>
                      )}
                    </Button>
                  </div>
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

      {/* Event Review Dialog */}
      <Dialog open={isEditEventOpen} onOpenChange={setIsEditEventOpen}>
        <DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
          {/* Professional Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  {selectedEvent?.type === 'contract review' ? (
                    <FileSliders className="w-5 h-5 text-[#0f5384]" />
                  ) : selectedEvent &&
                    getEventTypeConfig(selectedEvent.type).icon ? (
                    React.createElement(
                      getEventTypeConfig(selectedEvent.type).icon,
                      {
                        className: 'w-5 h-5 text-white',
                      }
                    )
                  ) : (
                    <CalendarIcon className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center mt-4 gap-2">
                    <FileSliders className="w-6 h-6 text-[#0f5384]" />
                    <DialogTitle className="text-xl font-semibold sidebar-gradient-text">
                      {selectedEvent?.title}
                    </DialogTitle>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 ml-8">
                    Event Details & Management
                  </p>
                </div>
              </div>
            </div>
          </div>

          {selectedEvent && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Event Details Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Event Information
                  </div>

                  <div className="space-y-4">
                    {/* Date & Time */}
                    <div className="grid grid-cols-[1fr_.8fr] gap-4">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            {format(
                              new Date(selectedEvent.startDate),
                              'EEEE, MMMM d, yyyy'
                            )}
                          </div>
                          <div className="text-sm text-slate-600">
                            {selectedEvent.startTime && selectedEvent.endTime
                              ? `${formatTimeForDisplay(
                                  selectedEvent.startTime
                                )} - ${formatTimeForDisplay(
                                  selectedEvent.endTime
                                )}`
                              : selectedEvent.startTime
                              ? formatTimeForDisplay(selectedEvent.startTime)
                              : 'All day'}
                          </div>
                        </div>
                      </div>
                      {/* Event Type */}
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Tag className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            Event Type
                          </div>
                          <div className="text-sm text-slate-600 whitespace-nowrap">
                            {getEventTypeLabel(
                              selectedEvent.type as unknown as string
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900 mb-1">
                          Participants
                        </div>
                        <div className="text-sm text-slate-600">
                          {(() => {
                            // Check if participants exist (handle both string and array formats)
                            const hasParticipants =
                              selectedEvent.participants &&
                              (Array.isArray(selectedEvent.participants)
                                ? selectedEvent.participants.length > 0
                                : typeof selectedEvent.participants ===
                                    'string' &&
                                  selectedEvent.participants.trim().length > 0);

                            if (!hasParticipants) {
                              return (
                                <span className="text-slate-400 italic">
                                  No participants
                                </span>
                              );
                            }

                            return loadingNames ? (
                              <span className="text-slate-400 flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                Loading participants...
                              </span>
                            ) : participantNames.length > 0 ? (
                              <div className="space-y-1">
                                {participantNames.map((name, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2"
                                  >
                                    <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-medium">
                                      {name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : Array.isArray(selectedEvent.participants) ? (
                              <div className="space-y-1">
                                {selectedEvent.participants.map(
                                  (participant, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2"
                                    >
                                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-medium">
                                        {participant.charAt(0).toUpperCase()}
                                      </div>
                                      <span>{participant}</span>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : selectedEvent.participants ? (
                              <div className="space-y-1">
                                {selectedEvent.participants
                                  .split(', ')
                                  .map((participant, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2"
                                    >
                                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xs font-medium">
                                        {participant.charAt(0).toUpperCase()}
                                      </div>
                                      <span>{participant}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">
                                No participants
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    {selectedEvent.location && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                          <MapPin className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 mb-1">
                            Location
                          </div>
                          <div className="text-sm text-slate-600 break-words">
                            {selectedEvent.location}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {selectedEvent.description && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                          <MessageSquare className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 mb-1">
                            Description
                          </div>
                          <div className="text-sm text-slate-600 break-words">
                            {selectedEvent.description.replace(/<[^>]*>/g, '')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Assistant Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    AI Assistant
                  </div>

                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 bg-white border-slate-300 hover:border-blue-500 hover:bg-blue-50"
                    >
                      <Paperclip className="w-4 h-4 mr-3 text-slate-500" />
                      <div className="text-left">
                        <div className="font-medium text-slate-900">
                          What pre-reads should I review?
                        </div>
                        <div className="text-xs text-slate-500">
                          Get AI recommendations for preparation materials
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 bg-white border-slate-300 hover:border-blue-500 hover:bg-blue-50"
                    >
                      <MessageSquare className="w-4 h-4 mr-3 text-slate-500" />
                      <div className="text-left">
                        <div className="font-medium text-slate-900">
                          Chat with AI Assistant
                        </div>
                        <div className="text-xs text-slate-500">
                          Get help with meeting preparation and insights
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Static Footer */}
          {selectedEvent && (
            <div className="sticky bottom-0 z-10 bg-slate-50 border-t border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Event created{' '}
                  {format(new Date(selectedEvent.startDate), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-3">
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
                        contractName: selectedEvent.contractName || '',
                        participants: selectedEvent.participants || '',
                        location: selectedEvent.location || '',
                      });
                      setLocationSearch(selectedEvent.location || '');

                      // Parse participants string to populate selectedParticipants
                      if (
                        selectedEvent.participants &&
                        typeof selectedEvent.participants === 'string'
                      ) {
                        const participantStrings =
                          selectedEvent.participants.split(', ');
                        const parsedParticipants = participantStrings.map(
                          (p) => {
                            // Parse "Name <email>" format
                            const match = p.match(/^(.+?) <(.+?)>$/);
                            if (match) {
                              return {
                                $id: match[2], // Use email as ID for now
                                fullName: match[1],
                                name: match[1],
                                email: match[2],
                              };
                            }
                            // Fallback for old format (just user ID)
                            return {
                              $id: p,
                              fullName: p,
                              name: p,
                              email: p,
                            };
                          }
                        );
                        setSelectedParticipants(parsedParticipants);
                      } else {
                        setSelectedParticipants([]);
                      }

                      setIsEditEventOpen(false);
                      setIsAddEventOpen(true);
                    }}
                    className="primary-btn px-3 sm:px-4"
                  >
                    <Pencil className="w-4 h-4 " />
                    Edit Event
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDeleteEvent}
                    className="primary-btn px-3 sm:px-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
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
              <Button
                variant="outline"
                onClick={() => setIsShareOpen(false)}
                className="primary-btn px-3 sm:px-4"
              >
                <Trash2 className="w-4 h-4" />
                Cancel
              </Button>
              <Button onClick={handleShare}>Share</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-slate-200 shadow-xl">
          {/* Cap */}
          <div className="h-4 w-full bg-[#d6d7d8] opacity-70 " />

          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-fullflex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#f0c974]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Delete Event
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete "{selectedEvent?.title}"? This
                  action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3 bg-white">
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
              rows={4}
              className="bg-white border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
            />
            <p className="text-xs text-slate-500">
              This helps your team understand why the event was removed.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              This action is permanent.
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
                className="primary-btn px-3 sm:px-4"
              >
                <Trash2 className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteEvent}
                className="primary-btn px-3 sm:px-4"
              >
                <Trash2 className="w-4 h-4" />
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
