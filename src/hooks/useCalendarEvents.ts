import useSWR from 'swr';
import { CalendarEvent as DBCalendarEvent } from '@/lib/actions/calendar.actions';
import { swrConfig, swrKeys } from '@/lib/swr-config';
import {
  CalendarApprovalStatus,
  CalendarSensitivity,
  PermissionOverrideRecord,
} from '@/constants/rbac';

interface LocalCalendarEvent {
  id: string;
  $id?: string; // Preserve original database ID
  title: string;
  startDate?: Date;
  endDate?: Date;
  type: 'contract' | 'deadline' | 'meeting' | 'review' | 'audit';
  description?: string;
  participants?: string[];
  contractName?: string;
  amount?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  outlook_id?: string;
  createdBy?: string;
  createdByAccountId?: string;
  createdByUserId?: string;
  attachments?: Array<{ $id: string }>; // File ID references (array of file IDs from files collection)
  sensitivityLevel: CalendarSensitivity;
  requiresApproval: boolean;
  approvalStatus: CalendarApprovalStatus;
  pendingApprovalId?: string | null;
  overrides: PermissionOverrideRecord[];
}

interface UseCalendarEventsOptions {
  month?: Date;
  enableRealTime?: boolean;
  pollingInterval?: number;
}

// Helper function to parse time in multiple formats
const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  if (!timeStr) return { hours: 0, minutes: 0 };

  // Check if it's 12-hour format (e.g., "1:00 PM" or "12:00 AM")
  const twelveHourMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1]);
    const minutes = parseInt(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  }

  // Assume 24-hour format (e.g., "13:00" or "HH:MM")
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

// Convert database event to local event format
const convertDBEventToLocal = (
  dbEvent: DBCalendarEvent
): LocalCalendarEvent => {
  // Parse the date string directly as date-only (no time component)
  // If it's in format "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss", extract just the date part
  let normalizedStartDate: Date;
  let normalizedEndDate: Date | undefined;

  try {
    // If the date string includes a time component or timezone, extract just the date
    const dateStr = dbEvent.startDate.split('T')[0]; // Get just YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);

    // Parse start time if available, otherwise default to midnight
    if (dbEvent.startTime) {
      const { hours, minutes } = parseTime(dbEvent.startTime);
      normalizedStartDate = new Date(year, month - 1, day, hours, minutes, 0);

      // Validate the date
      if (isNaN(normalizedStartDate.getTime())) {
        throw new Error('Invalid start date');
      }
    } else {
      // No time specified - use midnight to avoid timezone shift issues
      normalizedStartDate = new Date(year, month - 1, day, 0, 0, 0);
    }

    // Do the same for endDate if it exists
    if (dbEvent.endDate) {
      const endDateStr = dbEvent.endDate.split('T')[0];
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

      // Parse end time if available, otherwise default to midnight
      if (dbEvent.endTime) {
        const { hours, minutes } = parseTime(dbEvent.endTime);
        normalizedEndDate = new Date(
          endYear,
          endMonth - 1,
          endDay,
          hours,
          minutes,
          0
        );
      } else {
        // No time specified - use midnight
        normalizedEndDate = new Date(endYear, endMonth - 1, endDay, 0, 0, 0);
      }

      // Validate the end date
      if (normalizedEndDate && isNaN(normalizedEndDate.getTime())) {
        throw new Error('Invalid end date');
      }
    }
  } catch (error) {
    console.error('Error parsing dates:', error);
    // Fallback to original parsing
    normalizedStartDate = new Date(dbEvent.startDate);
    if (dbEvent.endDate) {
      normalizedEndDate = new Date(dbEvent.endDate);
    }
  }

  console.log('Date conversion debug:', {
    originalStartDate: dbEvent.startDate,
    originalEndDate: dbEvent.endDate,
    normalizedStartDate: normalizedStartDate.toISOString(),
    normalizedEndDate: normalizedEndDate?.toISOString() || 'N/A',
    localStartDate: normalizedStartDate.toLocaleDateString(),
  });

  return {
    id: dbEvent.$id || '',
    $id: dbEvent.$id, // Preserve original database ID
    title: dbEvent.title,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    type: dbEvent.type,
    description: dbEvent.description,
    participants: dbEvent.participants ? dbEvent.participants.split(', ') : [],
    contractName: dbEvent.contractName,
    amount: dbEvent.amount,
    startTime: dbEvent.startTime,
    endTime: dbEvent.endTime,
    location: dbEvent.location,
    outlook_id: dbEvent.outlook_id,
    createdBy: dbEvent.createdBy,
    createdByAccountId: dbEvent.createdByAccountId,
    createdByUserId: dbEvent.createdByUserId,
    // Attachments are stored as file IDs (array of strings)
    // We'll fetch full file details when needed for display
    attachments: Array.isArray((dbEvent as any).attachments)
      ? (dbEvent as any).attachments.map((fileId: string) => ({
          $id: fileId, // File ID reference
        }))
      : [],
    sensitivityLevel: dbEvent.sensitivityLevel || 'standard',
    requiresApproval: Boolean(dbEvent.requiresApproval),
    approvalStatus: dbEvent.approvalStatus || 'not_required',
    pendingApprovalId: dbEvent.pendingApprovalId || null,
    overrides: Array.isArray(dbEvent.overrides) ? dbEvent.overrides : [],
  };
};

export const useCalendarEvents = ({
  month = new Date(),
  enableRealTime = true,
  pollingInterval = 10000,
}: UseCalendarEventsOptions = {}) => {
  const year = month.getFullYear();
  const monthNumber = month.getMonth() + 1;

  // Use the global SWR key
  const key = swrKeys.calendarEvents(year, monthNumber);

  console.log('useCalendarEvents called with:', { year, monthNumber, key });

  const {
    data: dbEvents = [],
    error,
    isLoading,
    mutate,
  } = useSWR(key, swrConfig.fetcher || null, {
    ...swrConfig,
    refreshInterval: enableRealTime ? pollingInterval : 0,
  });

  console.log('SWR response:', { dbEvents, error, isLoading, key });
  console.log(
    'dbEvents type:',
    typeof dbEvents,
    'isArray:',
    Array.isArray(dbEvents)
  );
  console.log('dbEvents content:', dbEvents);

  // Convert database events to local format
  // Handle both direct array response and API wrapper response
  let eventsArray: DBCalendarEvent[] = [];
  if (Array.isArray(dbEvents)) {
    eventsArray = dbEvents as DBCalendarEvent[];
  } else if (
    dbEvents &&
    typeof dbEvents === 'object' &&
    Array.isArray((dbEvents as { events?: DBCalendarEvent[] }).events)
  ) {
    eventsArray = (
      dbEvents as {
        events: DBCalendarEvent[];
      }
    ).events;
  }

  const events = eventsArray.map(convertDBEventToLocal);

  console.log('Events after conversion:', events);
  console.log('Events count:', events.length);

  const refresh = async () => {
    console.log('Refresh called, revalidating cache for key:', key);
    // Force revalidation by passing true as second argument
    await mutate(undefined, { revalidate: true });
  };

  const forceRefresh = async () => {
    console.log('Force refresh called, fetching new data immediately');
    // Clear cache and force revalidation to ensure deleted events don't reappear
    await mutate(undefined, {
      revalidate: true,
      populateCache: true,
      rollbackOnError: false,
    });
  };

  return {
    events,
    isLoading,
    error,
    refresh,
    forceRefresh,
    lastUpdate: new Date(),
  };
};
