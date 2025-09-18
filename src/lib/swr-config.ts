import { SWRConfiguration } from 'swr';

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  // Default fetcher function
  fetcher: async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Revalidation settings - More aggressive for fresh data
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  revalidateOnMount: true, // Always revalidate on mount

  // Deduplication - Very short interval for immediate updates
  dedupingInterval: 500, // Prevent duplicate requests within 500ms

  // Error retry
  errorRetryCount: 3,
  errorRetryInterval: 1000, // Faster retry every 1 second

  // Cache settings
  keepPreviousData: false, // Don't keep stale data, always show fresh data

  // Focus revalidation - Very frequent
  focusThrottleInterval: 1000, // Throttle focus revalidation to 1 second

  // Refresh interval for automatic updates
  refreshInterval: 10000, // Refresh every 10 seconds by default
};

// SWR keys for consistent caching
export const swrKeys = {
  calendarEvents: (year: number, month: number) =>
    `/api/calendar/events?year=${year}&month=${month}`,
  recentActivities: (limit: number = 15) =>
    `/api/recent-activities?limit=${limit}`,
  users: () => '/api/users',
  currentUser: () => '/api/user/current',
  managerContracts: (userId: string) => `/api/contracts/manager/${userId}`,
  adminStats: () => '/api/admin/stats',
};
