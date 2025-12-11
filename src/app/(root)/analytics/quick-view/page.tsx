'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarQuickStats } from '@/components/analytics/CalendarQuickStats';
import { useUnifiedAnalyticsData } from '@/hooks/useUnifiedAnalyticsData';

// Format currency helper
const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

export const dynamic = 'force-dynamic';

const QuickViewPage = () => {
  const {
    departments,
    totals,
    hasContracts,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useUnifiedAnalyticsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="h1 text-center sidebar-gradient-text mb-2">
          Quick View Analytics
        </h1>
        <p className="body-1 text-center text-slate-700">
          At-a-glance metrics and key performance indicators
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contracts Quick Stats */}
        {!analyticsLoading && hasContracts && (
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader>
              <CardTitle className="h3 text-navy">Contracts Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Total Contracts</p>
                  <p className="text-2xl font-bold text-navy">
                    {totals.totalContracts}
                  </p>
                </div>
                <div className="p-4 bg-white/50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Total Budget</p>
                  <p className="text-2xl font-bold text-navy">
                    {formatCurrency(totals.totalBudget)}
                  </p>
                </div>
                <div className="p-4 bg-white/50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Total Staff</p>
                  <p className="text-2xl font-bold text-navy">
                    {totals.totalStaff}
                  </p>
                </div>
                <div className="p-4 bg-white/50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Compliance Rate</p>
                  <p className="text-2xl font-bold text-navy">
                    {totals.overallComplianceRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Quick Stats */}
        <CalendarQuickStats />
      </div>

      {/* Error State */}
      {analyticsError && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <p className="text-red-600">
                {typeof analyticsError === 'string'
                  ? analyticsError
                  : 'Failed to load analytics data'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuickViewPage;

