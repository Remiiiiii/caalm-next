/**
 * Global SWR configuration for optimal performance
 */

import { SWRConfiguration } from 'swr';

/**
 * Default SWR fetcher with error handling
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object
    (error as any).status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * SWR key generators for consistent caching
 */
export const swrKeys = {
  currentUser: () => '/api/users/current',
  users: () => '/api/users',
  calendarEvents: (year: number, month: number) =>
    `/api/calendar/events?year=${year}&month=${month}`,
  managerContracts: (userId: string) => `/api/contracts?userId=${userId}`,
  recentActivities: (limit: number = 15) =>
    `/api/recent-activities?limit=${limit}`,
  adminStats: () => '/api/admin/stats',
};

/**
 * Global SWR configuration
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true, // Revalidate when window gets focused
  revalidateOnReconnect: true, // Revalidate when network recovers
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  focusThrottleInterval: 5000, // Throttle revalidation on focus (5 seconds)
  errorRetryCount: 3, // Retry failed requests 3 times
  errorRetryInterval: 5000, // Wait 5 seconds between retries
  shouldRetryOnError: (error: any) => {
    // Don't retry on 4xx errors (client errors)
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    return true;
  },
  onError: (error, key) => {
    // Log errors for monitoring
    console.error('SWR Error:', {
      key,
      error: error.message,
      status: (error as any).status,
    });
  },
};

/**
 * SWR configuration for real-time data (short refresh interval)
 */
export const realTimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // Refresh every 30 seconds
  revalidateOnFocus: true,
};

/**
 * SWR configuration for static data (long refresh interval)
 */
export const staticConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: false, // Don't refetch on focus for static data
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // Dedupe for 1 minute
};

/**
 * SWR configuration for frequently changing data
 */
export const frequentConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 5000, // Refresh every 5 seconds
  dedupingInterval: 1000, // Dedupe for 1 second
};
