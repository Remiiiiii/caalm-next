import useSWR from 'swr';
import { CalendarEvent as DBCalendarEvent } from '@/lib/actions/calendar.actions';
import { swrConfig, swrKeys } from '@/lib/swr-config';

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

interface UseCalendarEventsOptions {
  month?: Date;
  enableRealTime?: boolean;
  pollingInterval?: number;
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

export const useCalendarEvents = ({
  month = new Date(),
  enableRealTime = true,
  pollingInterval = 10000,
}: UseCalendarEventsOptions = {}) => {
  const year = month.getFullYear();
  const monthNumber = month.getMonth() + 1;

  // Use the global SWR key
  const key = swrKeys.calendarEvents(year, monthNumber);

  const {
    data: dbEvents = [],
    error,
    isLoading,
    mutate,
  } = useSWR(key, swrConfig.fetcher || null, {
    ...swrConfig,
    refreshInterval: enableRealTime ? pollingInterval : 0,
  });

  // Convert database events to local format
  const events = Array.isArray(dbEvents)
    ? dbEvents.map(convertDBEventToLocal)
    : [];

  const refresh = () => mutate();

  return {
    events,
    isLoading,
    error,
    refresh,
    lastUpdate: new Date(),
  };
};
