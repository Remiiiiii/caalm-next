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
  const dbStartDate = new Date(dbEvent.startDate);

  // Create a date in local timezone to avoid timezone shift issues
  // Use the local date components directly instead of string conversion
  const normalizedStartDate = new Date(
    dbStartDate.getFullYear(),
    dbStartDate.getMonth(),
    dbStartDate.getDate()
  );

  // Handle endDate if it exists
  let normalizedEndDate: Date | undefined;
  if (dbEvent.endDate) {
    const dbEndDate = new Date(dbEvent.endDate);
    normalizedEndDate = new Date(
      dbEndDate.getFullYear(),
      dbEndDate.getMonth(),
      dbEndDate.getDate()
    );
  }

  console.log('Date conversion debug:', {
    originalStartDate: dbEvent.startDate,
    originalEndDate: dbEvent.endDate,
    dbStartDate: dbStartDate.toISOString(),
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

  const refresh = () => mutate();

  return {
    events,
    isLoading,
    error,
    refresh,
    lastUpdate: new Date(),
  };
};
