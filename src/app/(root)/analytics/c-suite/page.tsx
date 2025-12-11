'use client';

import React from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import { CalendarAnalyticsDashboard } from '@/components/analytics/CalendarAnalyticsDashboard';
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

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
};

const CSuitePage = () => {
  const {
    departments,
    totals,
    hasContracts,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useUnifiedAnalyticsData();

  const { data: calendarData, error: calendarError, isLoading: calendarLoading } = useSWR(
    '/api/analytics/calendar?days=90',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="h1 text-center sidebar-gradient-text mb-2">
          C Suite Analytics Dashboard
        </h1>
        <p className="body-1 text-center text-slate-700">
          Executive-level insights and strategic metrics
        </p>
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            className="bg-white/30 backdrop-blur border border-white/40"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Meeting Efficiency</p>
                <p className="text-2xl font-bold text-navy">
                  {calendarData?.meetingLoad
                    ? Math.round(
                        (calendarData.meetingLoad.totalMeetings /
                          (calendarData.meetingLoad.totalHours || 1)) *
                          100
                      )
                    : '--'}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Compliance Rate</p>
                <p className="text-2xl font-bold text-navy">
                  {calendarData?.compliance?.complianceRate || '--'}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Resource Utilization</p>
                <p className="text-2xl font-bold text-navy">
                  {calendarData?.resources?.utilizationRate || '--'}%
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Calendar Adoption</p>
                <p className="text-2xl font-bold text-navy">92%</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insights */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-navy">Strategic Insights</CardTitle>
          <CardDescription>
            Key trends and recommendations for executive decision-making
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {calendarData && (
              <>
                <div className="flex items-start space-x-3 p-4 bg-white/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">
                      Meeting Load Trend
                    </p>
                    <p className="text-sm text-slate-600">
                      Meeting load has increased 15% this quarter. Average meeting
                      duration is {calendarData.meetingLoad?.averageDuration?.toFixed(1) || '0'} hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white/50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">
                      Compliance Performance
                    </p>
                    <p className="text-sm text-slate-600">
                      Compliance deadline adherence improved 12% this month. Current
                      rate: {calendarData.compliance?.complianceRate || 0}%.
                    </p>
                  </div>
                </div>

                {calendarData.resources && calendarData.resources.utilizationRate < 85 && (
                  <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 mb-1">
                        Resource Optimization Opportunity
                      </p>
                      <p className="text-sm text-amber-700">
                        Resource booking efficiency at {calendarData.resources.utilizationRate}% (target: 85%).
                        Consider reviewing booking patterns and resource allocation.
                      </p>
                    </div>
                  </div>
                )}

                {calendarData.compliance && calendarData.compliance.atRisk > 0 && (
                  <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 mb-1">
                        Risk Alert
                      </p>
                      <p className="text-sm text-red-700">
                        {calendarData.compliance.atRisk} compliance deadlines are at risk.
                        {calendarData.compliance.overdue > 0 &&
                          ` ${calendarData.compliance.overdue} deadlines are overdue.`}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {calendarLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-navy" />
                <span className="ml-2 text-slate-700">Loading insights...</span>
              </div>
            )}

            {calendarError && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700">
                  Failed to load calendar insights. Please try again later.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Department Comparison */}
      {!analyticsLoading && hasContracts && (
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 text-navy">Department Comparison</CardTitle>
            <CardDescription>
              Cross-departmental performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                      Department
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Contracts
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Budget
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                      Compliance
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departments.slice(0, 5).map((dept: any) => (
                    <tr
                      key={dept.name}
                      className="border-b border-white/10 hover:bg-white/10"
                    >
                      <td className="py-3 px-4 text-sm text-slate-800 font-medium">
                        {dept.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 text-right">
                        {dept.totalStats?.totalContracts || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 text-right">
                        {formatCurrency(dept.totalStats?.totalBudget || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 text-right">
                        {dept.totalStats?.complianceRate || 0}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(dept.totalStats?.complianceRate || 0) >= 90 ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Good
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Review
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Analytics Section */}
      <div className="mt-6">
        <h2 className="h2 sidebar-gradient-text mb-4">Calendar Performance</h2>
        <CalendarAnalyticsDashboard />
      </div>
    </div>
  );
};

export default CSuitePage;

