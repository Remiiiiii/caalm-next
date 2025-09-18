import useSWR from 'swr';

interface ContractStats {
  totalContracts: number;
  totalBudget: number;
  staffCount: number;
  complianceRate: number;
}

interface DivisionData {
  id: string;
  name: string;
  description: string;
  stats: ContractStats;
}

interface DepartmentData {
  name: string;
  divisions: DivisionData[];
  totalStats: ContractStats;
}

interface DepartmentAnalyticsResponse {
  departments: DepartmentData[];
  totals: {
    totalContracts: number;
    totalBudget: number;
    totalStaff: number;
    overallComplianceRate: number;
  };
  hasContracts: boolean;
}

const fetcher = async (url: string): Promise<DepartmentAnalyticsResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch department analytics data');
  }
  return response.json();
};

export const useDepartmentAnalytics = () => {
  const { data, error, isLoading, mutate } =
    useSWR<DepartmentAnalyticsResponse>(
      '/api/analytics/departments/contracts',
      fetcher,
      {
        refreshInterval: 60000, // Refresh every minute
        revalidateOnFocus: false,
        dedupingInterval: 30000, // Dedupe requests within 30 seconds
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        revalidateIfStale: true,
        revalidateOnMount: true,
        keepPreviousData: true,
      }
    );

  return {
    departments: data?.departments || [],
    totals: data?.totals || {
      totalContracts: 0,
      totalBudget: 0,
      totalStaff: 0,
      overallComplianceRate: 0,
    },
    hasContracts: data?.hasContracts || false,
    isLoading,
    error,
    mutate,
  };
};
