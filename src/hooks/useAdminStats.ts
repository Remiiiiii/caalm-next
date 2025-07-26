import useSWR from 'swr';
import { swrConfig, swrKeys } from '@/lib/swr-config';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalActivities: number;
  recentActivities: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

interface UseAdminStatsOptions {
  enableRealTime?: boolean;
  pollingInterval?: number;
}

export const useAdminStats = ({
  enableRealTime = true,
  pollingInterval = 30000, // 30 seconds for admin stats (least frequent)
}: UseAdminStatsOptions = {}) => {
  // Use the global SWR key
  const key = swrKeys.adminStats();

  const {
    data: stats = {
      totalUsers: 0,
      activeUsers: 0,
      pendingUsers: 0,
      totalActivities: 0,
      recentActivities: 0,
      systemHealth: 'good' as const,
    },
    error,
    isLoading,
    mutate,
  } = useSWR(key, swrConfig.fetcher || null, {
    ...swrConfig,
    refreshInterval: enableRealTime ? pollingInterval : 0,
  });

  const refresh = () => mutate();

  return {
    stats,
    isLoading,
    error: error ? 'Failed to load admin statistics' : null,
    lastUpdate: new Date(),
    refresh,
  };
};
