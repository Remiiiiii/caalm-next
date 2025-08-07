import useSWR from 'swr';
import { swrConfig, swrKeys } from '@/lib/swr-config';

export interface RecentActivity {
  $id: string;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  contractId?: string;
  contractName?: string;
  eventId?: string;
  eventTitle?: string;
  department?: string;
  timestamp: string;
  type: 'contract' | 'user' | 'event' | 'notification' | 'file';
}

interface UseRecentActivitiesOptions {
  limit?: number;
  enableSSE?: boolean;
  pollingInterval?: number;
}

export const useRecentActivities = ({
  limit = 15,
  enableSSE = true,
  pollingInterval = 10000,
}: UseRecentActivitiesOptions = {}) => {
  // Use the global SWR key
  const key = swrKeys.recentActivities(limit);

  const {
    data: activities = [],
    error,
    isLoading,
    mutate,
  } = useSWR(key, swrConfig.fetcher || null, {
    ...swrConfig,
    refreshInterval: enableSSE ? pollingInterval : 0,
  });

  const refresh = () => mutate();

  return {
    activities,
    isLoading,
    lastUpdate: new Date(),
    connectionStatus: error ? 'disconnected' : 'connected',
    updateMethod: 'sse' as const,
    refresh,
  };
};
