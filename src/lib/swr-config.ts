/**
 * Global SWR configuration for optimal performance
 */

import { SWRConfiguration } from 'swr';

/**
 * Default SWR fetcher with error handling
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'x-no-cache': '1',
    },
  });

  if (!res.ok) {
    let errorMessage = 'An error occurred while fetching the data.';
    let errorDetails: any = null;

    try {
      const errorData = await res.json();
      // Handle different error response formats
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else {
        errorMessage = res.statusText || errorMessage;
      }
      errorDetails = errorData;
    } catch (parseError) {
      // If JSON parsing fails, use status text
      errorMessage = res.statusText || errorMessage;
    }

    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).details = errorDetails;
    (error as any).response = res;
    throw error;
  }

  return res.json();
};

/**
 * SWR key generators for consistent caching
 */
export const swrKeys = {
  currentUser: () => '/api/user/current',
  users: () => '/api/users',
  calendarEvents: (year: number, month: number) =>
    `/api/calendar/events?year=${year}&month=${month}`,
  managerContracts: (userId: string) => `/api/contracts/manager/${userId}`,
  allContracts: () => '/api/contracts/all',
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
    // Log errors for monitoring with safe property access
    let errorMessage = 'Unknown error';
    let status: number | string = 'unknown';
    let details: any = null;

    // Handle different error types
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message || 'Unknown error';
      status = (error as any).status || 'unknown';
      details = (error as any).details || null;
    } else if (error && typeof error === 'object') {
      errorMessage = (error as any).message || (error as any).error || 'Unknown error';
      status = (error as any).status || 'unknown';
      details = (error as any).details || null;
    }

    // Only log non-4xx errors to avoid noise from authentication/authorization issues
    if (typeof status === 'number' && status < 400) {
      return; // Don't log non-error responses
    }

    console.error('SWR Error:', {
      key,
      error: errorMessage,
      status,
      details,
      errorType: typeof error,
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
