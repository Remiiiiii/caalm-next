import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { getCachedData, setCachedData } from '@/lib/utils/client-cache';
import type { SharedCalendar, CalendarSharePermission } from '@/lib/actions/shared-calendar.actions';

interface SharedCalendarsResponse {
  success: boolean;
  calendars: SharedCalendar[];
  total: number;
}

const fetcher = async (url: string): Promise<SharedCalendarsResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch shared calendars');
  }
  const data = await response.json();
  
  // Cache the response client-side for stale-while-revalidate
  if (typeof window !== 'undefined') {
    setCachedData(url, data, 300000); // 5 minutes
  }
  
  return data;
};

export const useSharedCalendars = () => {
  const { user } = useAuth();
  const url = user?.$id ? '/api/calendar/shared' : null;

  // Get cached data as fallback for stale-while-revalidate
  const fallbackData = useMemo(() => {
    if (!url || typeof window === 'undefined') return undefined;
    return getCachedData<SharedCalendarsResponse>(url);
  }, [url]);

  const { data, error, isLoading, mutate } = useSWR(
    url,
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false, // Disable focus revalidation to prevent flickering
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Dedupe requests within 1 minute
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      revalidateIfStale: true,
      revalidateOnMount: true,
      keepPreviousData: true, // Keep previous data to prevent flickering
      fallbackData, // Stale-while-revalidate: show cached data immediately
      onError: (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Shared calendars fetch error:', err);
        }
      },
      onSuccess: (data) => {
        // Update cache when fresh data arrives
        if (url && typeof window !== 'undefined') {
          setCachedData(url, data, 300000);
        }
      },
    }
  );

  return {
    calendars: data?.calendars || [],
    total: data?.total || 0,
    isLoading,
    error,
    refresh: mutate || (() => Promise.resolve()),
  };
};

