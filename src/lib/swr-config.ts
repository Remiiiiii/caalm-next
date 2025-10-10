import { SWRConfiguration } from 'swr';

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  // Default fetcher function with cache control
  fetcher: async (url: string) => {
    const response = await fetch(url, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
    });
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

  // Deduplication - Disabled in dev for instant updates
  dedupingInterval: process.env.NODE_ENV === 'development' ? 0 : 500,

  // Error retry
  errorRetryCount: 3,
  errorRetryInterval: 1000, // Faster retry every 1 second

  // Cache settings
  keepPreviousData: false, // Don't keep stale data, always show fresh data

  // Focus revalidation - No throttle in dev
  focusThrottleInterval: process.env.NODE_ENV === 'development' ? 0 : 1000,

  // Refresh interval for automatic updates - More frequent in dev
  refreshInterval: process.env.NODE_ENV === 'development' ? 2000 : 10000,
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
