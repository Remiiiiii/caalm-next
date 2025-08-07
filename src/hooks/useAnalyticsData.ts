import useSWR from 'swr';

// interface AnalyticsStats {
//   totalContracts: number;
//   totalBudget: string;
//   staffCount: number;
//   complianceRate: string;
//   trend: 'up' | 'down';
//   change: string;
// }

// interface DepartmentAnalytics {
//   stats: AnalyticsStats;
//   contracts: any[];
//   compliance: any[];
//   performance: any[];
// }

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics data');
  }
  return response.json();
};

export const useAnalyticsData = (department?: string) => {
  // const { user } = useAuth();

  // Department stats
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR(
    department ? `/api/analytics/${department}/stats` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  // Department contracts
  const {
    data: contractsData,
    error: contractsError,
    isLoading: contractsLoading,
  } = useSWR(
    department ? `/api/analytics/${department}/contracts` : null,
    fetcher,
    {
      refreshInterval: 120000, // Refresh every 2 minutes
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Dedupe requests within 1 minute
    }
  );

  // Department compliance
  const {
    data: complianceData,
    error: complianceError,
    isLoading: complianceLoading,
  } = useSWR(
    department ? `/api/analytics/${department}/compliance` : null,
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
      dedupingInterval: 120000, // Dedupe requests within 2 minutes
    }
  );

  // Department performance
  const {
    data: performanceData,
    error: performanceError,
    isLoading: performanceLoading,
  } = useSWR(
    department ? `/api/analytics/${department}/performance` : null,
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
      dedupingInterval: 120000, // Dedupe requests within 2 minutes
    }
  );

  return {
    // Data
    stats: statsData?.data || null,
    contracts: contractsData?.data || [],
    compliance: complianceData?.data || [],
    performance: performanceData?.data || [],

    // Loading states
    isLoading:
      statsLoading ||
      contractsLoading ||
      complianceLoading ||
      performanceLoading,
    statsLoading,
    contractsLoading,
    complianceLoading,
    performanceLoading,

    // Errors
    error: statsError || contractsError || complianceError || performanceError,
    statsError,
    contractsError,
    complianceError,
    performanceError,

    // Computed values
    hasData: !!(
      statsData ||
      contractsData ||
      complianceData ||
      performanceData
    ),
    isFullyLoaded:
      !statsLoading &&
      !contractsLoading &&
      !complianceLoading &&
      !performanceLoading,
  };
};
