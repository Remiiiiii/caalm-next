'use client';

import React, { useState, useEffect } from 'react';
import AdministrationAnalytics from '@/components/analytics/AdministrationAnalytics';
import EnhancedAnalyticsDashboard from '@/components/analytics/EnhancedAnalyticsDashboard';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import AnalyticsErrorBoundary from '@/components/analytics/AnalyticsErrorBoundary';

export const dynamic = 'force-dynamic';

interface DivisionData {
  totalContracts: number;
  totalBudget: string;
  staffCount: number;
  complianceRate: string;
  trend: 'up' | 'down';
  change: string;
}

const AdminAnalyticsPage = () => {
  const [divisionData, setDivisionData] = useState<DivisionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
          '/api/analytics/departments/contracts'
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

        // Mock trend and change (requires historical data)
        const trend: 'up' | 'down' = 'up';
        const change = '+12%';

        const formattedData: DivisionData = {
          totalContracts,
          totalBudget:
            totalBudget > 0
              ? `$${(totalBudget / 1000000).toFixed(1)}M`
              : '$0.0M',
          staffCount,
          complianceRate: `${complianceRate}%`,
          trend,
          change,
        };

        setDivisionData(formattedData);
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
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white/20 rounded-xl backdrop-blur"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">⚠️ Error Loading Analytics</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const defaultDivisionData: DivisionData = {
    totalContracts: 0,
    totalBudget: '$0M',
    staffCount: 0,
    complianceRate: '0%',
    trend: 'up',
    change: '0%',
  };

  return (
    <AnalyticsErrorBoundary>
      <AnalyticsLayout
        division="administration"
        divisionData={divisionData || defaultDivisionData}
      >
        <div className="space-y-6">
          <EnhancedAnalyticsDashboard
            department="administration"
            userRole="admin"
          />
          <AdministrationAnalytics />
        </div>
      </AnalyticsLayout>
    </AnalyticsErrorBoundary>
  );
};

export default AdminAnalyticsPage;
