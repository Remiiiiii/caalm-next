import useSWR from 'swr';
import { CalendarEvent as DBCalendarEvent } from '@/lib/actions/calendar.actions';
import { swrConfig, swrKeys } from '@/lib/swr-config';

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
}

interface UseCalendarEventsOptions {
  month?: Date;
  enableRealTime?: boolean;
  pollingInterval?: number;
}

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

    // Create date at noon local time to avoid timezone shift issues
    normalizedStartDate = new Date(year, month - 1, day, 12, 0, 0);

    // Do the same for endDate if it exists
    if (dbEvent.endDate) {
      const endDateStr = dbEvent.endDate.split('T')[0];
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
      normalizedEndDate = new Date(endYear, endMonth - 1, endDay, 12, 0, 0);
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
    normalizedEndDate: normalizedEndDate?.toISOString(),
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
  let eventsArray = [];
  if (Array.isArray(dbEvents)) {
    eventsArray = dbEvents;
  } else if (
    dbEvents &&
    typeof dbEvents === 'object' &&
    Array.isArray(dbEvents.events)
  ) {
    eventsArray = dbEvents.events;
  }

  const events = eventsArray.map(convertDBEventToLocal);

  console.log('Events after conversion:', events);
  console.log('Events count:', events.length);

  const refresh = async () => {
    console.log('Refresh called, revalidating cache for key:', key);
    // Force revalidation by passing true as second argument
    await mutate(undefined, { revalidate: true });
  };

  const forceRefresh = () => {
    console.log('Force refresh called, fetching new data immediately');
    // Immediately fetch and update without waiting for cache
    return mutate();
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
