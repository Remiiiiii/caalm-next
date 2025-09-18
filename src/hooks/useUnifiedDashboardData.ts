import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
  stats: {
    totalContracts: number;
    expiringContracts: number;
    activeUsers: number;
    complianceRate: string;
  };
  files: unknown[];
  invitations: unknown[];
  authUsers: unknown[];
  reports: unknown[];
  departments: unknown[];
  reportTemplates: unknown[];
  notifications: unknown[];
  notificationsStats: unknown;
  recentActivities: unknown[];
  calendarEvents: unknown[];
}

interface UnifiedDashboardDataResponse {
  data: DashboardData;
  timestamp: number;
}

const fetcher = async (url: string): Promise<UnifiedDashboardDataResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch unified dashboard data');
  }
  return response.json();
};

export const useUnifiedDashboardData = (orgId: string) => {
  const { user } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    user?.$id
      ? `/api/dashboard/unified?orgId=${orgId}&userId=${user.$id}`
      : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false, // Disable focus revalidation to prevent flickering
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      revalidateIfStale: true,
      revalidateOnMount: true,
      keepPreviousData: true, // Keep previous data to prevent flickering
    }
  );

  // Debug logging
  console.log('useUnifiedDashboardData Debug:', {
    hasData: !!data,
    hasDataData: !!data?.data,
    filesLength: data?.data?.files?.length || 0,
    recentActivitiesLength: data?.data?.recentActivities?.length || 0,
    rawData: data ? 'present' : 'missing',
  });

  return {
    // Data
    stats: data?.data?.stats || {
      totalContracts: 0,
      expiringContracts: 0,
      activeUsers: 0,
      complianceRate: '94%',
    },
    files: data?.data?.files || [],
    invitations: data?.data?.invitations || [],
    authUsers: data?.data?.authUsers || [],
    reports: data?.data?.reports || [],
    departments: data?.data?.departments || [],
    reportTemplates: data?.data?.reportTemplates || [],
    notifications: data?.data?.notifications || [],
    notificationsStats: data?.data?.notificationsStats || {},
    recentActivities: data?.data?.recentActivities || [],
    calendarEvents: data?.data?.calendarEvents || [],

    // Loading states
    isLoading,
    error,

    // Actions
    refresh: mutate,
  };
};
