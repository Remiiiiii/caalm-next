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

  // Revalidation settings
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,

  // Deduplication
  dedupingInterval: 2000, // Prevent duplicate requests within 2 seconds

  // Error retry
  errorRetryCount: 3,
  errorRetryInterval: 5000, // Retry every 5 seconds

  // Cache settings
  keepPreviousData: true, // Keep previous data while fetching new data

  // Focus revalidation
  focusThrottleInterval: 5000, // Throttle focus revalidation to 5 seconds
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
