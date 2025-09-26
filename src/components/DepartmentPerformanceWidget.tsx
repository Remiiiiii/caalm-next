'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Target, Award, BarChart3 } from 'lucide-react';

interface DepartmentPerformanceWidgetProps {
  data?: {
    averageProductivity: number;
    meetingTargetCount: number;
    totalStaffCount: number;
    trend: 'up' | 'down' | 'stable';
  };
}

const DepartmentPerformanceWidget: React.FC<
  DepartmentPerformanceWidgetProps
> = ({ data: propData }) => {
  const [performanceData, setPerformanceData] = useState({
    averageProductivity: 89,
    meetingTargetCount: 4,
    totalStaffCount: 94,
    trend: 'up' as 'up' | 'down' | 'stable',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);

        // In production, this would fetch from your API
        // const response = await fetch('/api/departments/performance');
        // const data = await response.json();

        // For now, use prop data or default values
        if (propData) {
          setPerformanceData(propData);
        }
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load performance data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [propData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      case 'stable':
        return <BarChart3 className="h-4 w-4 text-blue-600" />;
      default:
        return <TrendingUp className="h-4 w-4 text-slate-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-blue-600';
      default:
        return 'text-slate-600';
    }
  };

  if (loading) {
    return (
      <Card className="min-w-[300px] max-w-[300px] h-[280px] bg-white/90 backdrop-blur-sm border border-white/40 shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Department Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600"></div>
              <p className="text-xs text-slate-500 font-medium">
                Loading metrics...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="min-w-[300px] max-w-[300px] h-[280px] bg-white/90 backdrop-blur-sm border border-white/40 shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Department Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-red-400" />
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

  return (
    <Card className="min-w-[300px] max-w-[300px] h-[280px] bg-white/90 backdrop-blur-sm border border-white/40 shadow-lg rounded-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-slate-600" />
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Department Performance
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2">
        <div className="space-y-4">
          {/* Main performance display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <div className="text-3xl font-bold sidebar-gradient-text tracking-tight">
                  {performanceData.averageProductivity}%
                </div>
                <div className="text-sm text-slate-600 capitalize font-medium">
                  Average Productivity
                </div>
              </div>
            </div>

            {/* Trend indicator with better styling */}
            <div className="text-right bg-white/30 rounded-lg px-3 py-1 backdrop-blur-sm">
              <div className="text-xs text-slate-500 font-medium">Trend</div>
              <div className="flex items-center gap-1">
                {getTrendIcon(performanceData.trend)}
                <span
                  className={`text-lg font-semibold ${getTrendColor(
                    performanceData.trend
                  )}`}
                >
                  {performanceData.trend === 'up'
                    ? '↗'
                    : performanceData.trend === 'down'
                    ? '↘'
                    : '→'}
                </span>
              </div>
            </div>
          </div>
          <div className="h-px bg-slate-300"></div>
          {/* Performance metrics with improved design */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Meeting Target
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {performanceData.meetingTargetCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Total Staff
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {performanceData.totalStaffCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Performance status indicator */}
          <div className="flex items-center justify-center !-mt-1">
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-slate-600 font-medium">
                Live Performance Data
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepartmentPerformanceWidget;
