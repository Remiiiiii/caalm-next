'use client';

import { useState, useEffect, useCallback } from 'react';

interface DepartmentAnalyticsData {
  totalContracts: number;
  totalBudget: number;
  staffCount: number;
  complianceRate: number;
  trend: 'up' | 'down' | 'stable';
  change: string;
}

interface UseDepartmentAnalyticsOptions {
  department: string;
  refreshInterval?: number;
}

export const useDepartmentAnalytics = (
  options: UseDepartmentAnalyticsOptions
) => {
  const { department, refreshInterval = 0 } = options;
  const [data, setData] = useState<DepartmentAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDepartmentAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Only fetch on client side
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      // Fetch contracts data from the API
      const contractsResponse = await fetch(
        `/api/analytics/${department}/contracts`
      );
      if (!contractsResponse.ok) {
        throw new Error(
          `Failed to fetch contracts: ${contractsResponse.statusText}`
        );
      }

      const contractsData = await contractsResponse.json();
      const contracts = contractsData.data || [];

      // Calculate analytics from the contract data
      const totalContracts = contracts.length;
      const totalBudget = contracts.reduce(
        (sum: number, contract: { amount?: number }) => {
          return sum + (contract.amount || 0);
        },
        0
      );

      // Calculate compliance rate
      const compliantContracts = contracts.filter(
        (contract: { compliance?: string }) =>
          contract.compliance === 'compliant' ||
          contract.compliance === 'Compliant'
      ).length;
      const complianceRate =
        totalContracts > 0
          ? Math.round((compliantContracts / totalContracts) * 100)
          : 0;

      // Mock staff count (in a real implementation, this would come from a users API)
      const staffCount = Math.round(totalContracts * 0.6); // Rough estimate based on contracts

      // Calculate trend (mock calculation - in real implementation, compare with previous period)
      const trend: 'up' | 'down' | 'stable' =
        totalContracts > 100 ? 'up' : totalContracts > 50 ? 'stable' : 'down';
      const change = trend === 'up' ? '+12%' : trend === 'down' ? '-5%' : '0%';

      const analyticsData: DepartmentAnalyticsData = {
        totalContracts,
        totalBudget: Math.round(totalBudget),
        staffCount,
        complianceRate,
        trend,
        change,
      };

      setData(analyticsData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch department analytics'
      );
      console.error('Error fetching department analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [department]);

  const refresh = () => {
    fetchDepartmentAnalytics();
  };

  useEffect(() => {
    if (department) {
      fetchDepartmentAnalytics();
    }
  }, [department, fetchDepartmentAnalytics]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchDepartmentAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, department, fetchDepartmentAnalytics]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
};
