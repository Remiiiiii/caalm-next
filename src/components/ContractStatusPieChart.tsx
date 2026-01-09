'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useContractsExpiring } from '@/hooks/useContractsExpiring';
import type { UIFileDoc } from '@/types/files';

interface ContractData {
  status: 'active' | 'expiring' | 'expired';
  count: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

interface ContractStatusPieChartProps {
  data?: ContractData[];
}

const ContractStatusPieChart: React.FC<ContractStatusPieChartProps> = ({
  data: propData,
}) => {
  // Fetch contracts using the hook
  const {
    contracts,
    isLoading,
    error: contractsError,
  } = useContractsExpiring();

  // Transform contracts into pie chart data
  const contractData = useMemo(() => {
    // If prop data is provided, use it (for testing/override)
    if (propData) {
      return propData;
    }

    // Don't process data while still loading (wait for first load to complete)
    if (isLoading && contracts === undefined) {
      // Return empty data structure while loading (will be replaced once data loads)
      return [
        {
          status: 'active' as const,
          count: 0,
          percentage: 0,
          color: '#10B981',
        },
        {
          status: 'expiring' as const,
          count: 0,
          percentage: 0,
          color: '#F59E0B',
        },
        {
          status: 'expired' as const,
          count: 0,
          percentage: 0,
          color: '#6B7280',
        },
      ];
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[ContractStatusPieChart] Contracts data:', {
        contractsLength: contracts?.length || 0,
        contracts: contracts?.slice(0, 3) || [],
        isLoading,
        error: contractsError,
        contractsIsUndefined: contracts === undefined,
      });
      // Log all status values to see what we're working with
      const statusCounts =
        contracts?.reduce((acc: Record<string, number>, c) => {
          const status = c.status || '(no status)';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {}) || {};
      console.log(
        '[ContractStatusPieChart] Status value counts:',
        statusCounts
      );
    }

    // If no contracts after loading completes, return empty data
    if (!contracts || contracts.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[ContractStatusPieChart] No contracts found, returning empty data',
          {
            isLoading,
            contractsIsUndefined: contracts === undefined,
            contractsIsArray: Array.isArray(contracts),
          }
        );
      }
      return [
        {
          status: 'active' as const,
          count: 0,
          percentage: 0,
          color: '#10B981',
        },
        {
          status: 'expiring' as const,
          count: 0,
          percentage: 0,
          color: '#F59E0B',
        },
        {
          status: 'expired' as const,
          count: 0,
          percentage: 0,
          color: '#6B7280',
        },
      ];
    }

    const now = new Date();
    const ninetyDaysFromNow = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000
    );

    let activeCount = 0;
    let expiringCount = 0;
    let completedCount = 0;

    // Track categorization details for debugging
    const categorizationDetails: Array<{
      id: string;
      status: string | undefined;
      statusLower: string;
      expiryDate: string | null;
      isExpired: boolean;
      isPastExpiry: boolean | null;
      categorizedAs: string;
      reason: string;
    }> = [];

    contracts.forEach((contract: UIFileDoc) => {
      // Normalize status: trim whitespace and convert to lowercase
      const status = contract.status?.trim().toLowerCase() || '';
      const expiryDate = contract.contractExpiryDate
        ? new Date(contract.contractExpiryDate)
        : null;
      const isExpired = contract.isExpired || false;
      const hasNoStatus = !contract.status || status === '';

      // Use daysUntilExpiry from contract if available, otherwise calculate from date
      let daysUntilExpiry: number | undefined = (contract as any)
        .daysUntilExpiry;
      if (daysUntilExpiry === undefined && expiryDate) {
        const expiryStr = contract.contractExpiryDate?.split('T')[0];
        if (expiryStr) {
          const [year, month, day] = expiryStr.split('-').map(Number);
          const expiry = new Date(year, month - 1, day);
          expiry.setHours(0, 0, 0, 0);
          const timeDiff = expiry.getTime() - now.getTime();
          daysUntilExpiry = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        }
      }

      // Determine if contract is expired or expiring
      // Only consider expired if explicitly marked or past expiry date
      const isPastExpiry = daysUntilExpiry !== undefined && daysUntilExpiry < 0;
      // Only consider expiring if we have a valid daysUntilExpiry between 0-90
      const isExpiringSoon =
        daysUntilExpiry !== undefined &&
        daysUntilExpiry >= 0 &&
        daysUntilExpiry <= 90;

      // Contracts can be in multiple categories (e.g., active AND expiring)
      // Track which categories this contract belongs to
      const categories: string[] = [];
      const reasons: string[] = [];

      // Category 1: Expired contracts
      // Only mark as expired if:
      // - Status is explicitly "expired", OR
      // - isExpired flag is true AND status is not "active" (trust active status from API), OR
      // - Past expiry date AND status is not "active" (trust active status from API)
      const shouldMarkAsExpired =
        status === 'expired' ||
        (isExpired && status !== 'active') ||
        (isPastExpiry && status !== 'active');

      if (shouldMarkAsExpired) {
        completedCount++;
        categories.push('expired');
        reasons.push(`Status: '${status}', isExpired: ${isExpired}, isPastExpiry: ${isPastExpiry}, daysUntilExpiry: ${daysUntilExpiry}`);
      }

      // Category 2: Contracts with status="active" are ALWAYS counted as active
      // This applies regardless of expiry status (contracts can be active AND expiring)
      if (status === 'active' && !shouldMarkAsExpired) {
        activeCount++;
        categories.push('active');
        reasons.push(`Status is 'active' (daysUntilExpiry: ${daysUntilExpiry}, isExpired: ${isExpired})`);
      }

      // Category 3: Check if contract is expiring soon (within 90 days)
      // This applies to ALL contracts (including active) that are expiring
      // Only if we have a valid daysUntilExpiry value (not undefined) and not expired
      if (isExpiringSoon && !shouldMarkAsExpired) {
        expiringCount++;
        categories.push('expiring');
        reasons.push(`Expiring within 90 days (daysUntilExpiry: ${daysUntilExpiry}, expiry: ${expiryDate?.toISOString()})`);
      }

      // Category 4: All other contracts (pending-review, inactive without expiry, etc.)
      // If no expiry date or expiry is far in future, consider active
      // If status is inactive and no expiry info, consider expired
      if (categories.length === 0) {
        // No category assigned yet - determine default category
        if (status === 'inactive' && !expiryDate) {
          completedCount++;
          categories.push('expired');
          reasons.push(`Status: 'inactive' with no expiry date`);
        } else {
          // Default: count as active for contracts without explicit status or with other statuses
          activeCount++;
          categories.push('active');
          reasons.push(`Status: '${status}' (default to active, daysUntilExpiry: ${daysUntilExpiry})`);
        }
      }

      // For debugging: use primary category (first one) as the main categorization
      const categorizedAs = categories[0] || 'unknown';
      const reason = reasons.join('; ');

      // Store categorization details for debugging
      categorizationDetails.push({
        id: contract.$id,
        status: contract.status,
        statusLower: status,
        expiryDate: contract.contractExpiryDate || null,
        isExpired,
        isPastExpiry,
        categorizedAs,
        reason,
      });
    });

    // Total should be the number of unique contracts, not the sum of categories
    // (since contracts can be in multiple categories)
    const total = contracts.length;

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[ContractStatusPieChart] Calculated counts:', {
        activeCount,
        expiringCount,
        completedCount,
        total,
        contractsProcessed: contracts.length,
      });
      // Log all contract categorizations with detailed reasons
      console.log(
        '[ContractStatusPieChart] All contract categorizations:',
        categorizationDetails
      );
      // Log contracts with status="active" specifically
      const activeStatusContracts = categorizationDetails.filter(
        (d) => d.statusLower === 'active'
      );
      console.log(
        '[ContractStatusPieChart] Contracts with status="active" (all should be counted as active):',
        activeStatusContracts.map((d) => ({
          id: d.id,
          categorizedAs: d.categorizedAs,
          expiryDate: d.expiryDate,
          reason: d.reason,
        }))
      );
      // Log contracts categorized as active (regardless of status)
      const categorizedAsActive = categorizationDetails.filter(
        (d) => d.categorizedAs === 'active'
      );
      console.log(
        '[ContractStatusPieChart] Contracts categorized as "active":',
        categorizedAsActive
      );
    }

    // Calculate percentages
    const activePercentage =
      total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const expiringPercentage =
      total > 0 ? Math.round((expiringCount / total) * 100) : 0;
    const completedPercentage =
      total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return [
      {
        status: 'active' as const,
        count: activeCount,
        percentage: activePercentage,
        color: '#10B981', // Green
      },
      {
        status: 'expiring' as const,
        count: expiringCount,
        percentage: expiringPercentage,
        color: '#F59E0B', // Amber
      },
      {
        status: 'expired' as const,
        count: completedCount,
        percentage: completedPercentage,
        color: '#6B7280', // Gray
      },
    ];
  }, [contracts, propData, isLoading]);

  const loading = isLoading;
  const error = contractsError;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'expiring':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'expired':
        return <FileText className="h-4 w-4 text-slate-600" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expiring':
        return 'Expiring';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 backdrop-blur-sm border border-white/40 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(data.status)}
            <span className="text-sm font-semibold text-slate-800">
              {getStatusLabel(data.status)}
            </span>
          </div>
          <div className="text-xs text-slate-600">
            <div>
              Count: <span className="font-semibold">{data.count}</span>
            </div>
            <div>
              Percentage:{' '}
              <span className="font-semibold">{data.percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
        <div className="glass-card-cap" />
        <CardHeader className="pb-3 pt-6 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Contract Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600"></div>
              <p className="text-xs text-slate-500 font-medium">
                Loading contracts...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && (!contracts || contracts.length === 0)) {
    return (
      <Card className="w-full h-[200px] sm:h-[250px] lg:h-[290px] glass-card overflow-hidden">
        <CardHeader className="pb-3 pt-6 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Contract Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Data Unavailable
              </p>
              <p className="text-xs text-slate-500">Check your connection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Total should be the number of unique contracts, not the sum of category counts
  // (since contracts can be in multiple categories like active AND expiring)
  const totalContracts = contracts?.length || 0;

  return (
    <Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
      <div className="glass-card-cap" />
      {/* Header */}
      <CardHeader className="pb-3 pt-6 px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-600" />
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Contract Status
          </CardTitle>
        </div>
        <div className="text-xs text-slate-500">
          Total:{' '}
          <span className="font-semibold text-slate-700">{totalContracts}</span>{' '}
          contracts
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2 flex-1 flex flex-col min-h-0">
        <div className="space-y-4 flex-1">
          {/* Main chart display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contractData}
                        cx="50%"
                        cy="50%"
                        innerRadius={12}
                        outerRadius={24}
                        paddingAngle={1}
                        dataKey="count"
                      >
                        {contractData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold sidebar-gradient-text tracking-tight">
                  {totalContracts}
                </div>
                <div className="text-sm text-slate-600 capitalize font-medium">
                  Total Contracts
                </div>
              </div>
            </div>

            {/* Active contracts with better styling */}
            <div className="text-right bg-white/30 rounded-lg px-3 py-1 backdrop-blur-sm">
              <div className="text-xs text-slate-500 font-medium">Active</div>
              <div className="text-lg font-semibold text-slate-700">
                {contractData.find((item) => item.status === 'active')?.count ||
                  0}
              </div>
            </div>
          </div>
          <div className="h-px bg-slate-300"></div>
          {/* Contract metrics with improved design */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Expiring
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {contractData.find((item) => item.status === 'expiring')
                      ?.count || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Expired
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {contractData.find((item) => item.status === 'expired')
                      ?.count || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Contract status indicator */}
        {/* Single source of truth for Live Data badge styling and width */}
        <div className="mt-3 border-t border-white/20 flex-shrink-0 -translate-y-0.5">
          <div className="flex items-center justify-center">
            <div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20 min-w-[140px]">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-slate-600 font-medium">
                Live Contract Data
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractStatusPieChart;
