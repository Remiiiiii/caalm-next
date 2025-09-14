'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Shield,
  Activity,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import AnalyticsErrorBoundary from './AnalyticsErrorBoundary';

interface EnhancedAnalyticsDashboardProps {
  department?: string;
  userRole?: 'executive' | 'admin' | 'manager';
}

const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({
  department,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'metrics' | 'compliance' | 'trends'
  >('overview');
  const [isRealTime, setIsRealTime] = useState(false);

  // Mock data to avoid webpack issues
  const data = {
    executiveMetrics: {
      totalContracts: 1247,
      totalBudget: 15600000,
      complianceRate: 89.2,
      activeContracts: 892,
      expiringSoon: 23,
      overdueRenewals: 5,
      averageContractValue: 12500,
      contractGrowth: 12.5,
    },
    complianceData: {
      overall: {
        rate: 89.2,
        trend: 'up' as const,
        change: 2.1,
      },
      byStatus: [
        {
          status: 'compliant',
          count: 1112,
          percentage: 89,
          trend: 'up' as const,
        },
        {
          status: 'action-required',
          count: 23,
          percentage: 2,
          trend: 'down' as const,
        },
        {
          status: 'non-compliant',
          count: 5,
          percentage: 0,
          trend: 'down' as const,
        },
        {
          status: 'pending-review',
          count: 107,
          percentage: 9,
          trend: 'stable' as const,
        },
      ],
      riskFactors: [
        {
          factor: 'Expiring Contracts',
          impact: 'high' as const,
          count: 23,
          description: 'Contracts expiring within 30 days',
        },
        {
          factor: 'Overdue Renewals',
          impact: 'critical' as const,
          count: 5,
          description: 'Contracts past renewal date',
        },
        {
          factor: 'Missing Documentation',
          impact: 'medium' as const,
          count: 12,
          description: 'Contracts missing required documents',
        },
        {
          factor: 'Budget Overruns',
          impact: 'low' as const,
          count: 3,
          description: 'Contracts exceeding budget limits',
        },
      ],
    },
    trendData: {
      contracts: [
        { period: 'Jan', contracts: 45, budget: 560000, renewals: 8 },
        { period: 'Feb', contracts: 52, budget: 640000, renewals: 12 },
        { period: 'Mar', contracts: 48, budget: 580000, renewals: 9 },
        { period: 'Apr', contracts: 61, budget: 720000, renewals: 15 },
        { period: 'May', contracts: 55, budget: 680000, renewals: 11 },
        { period: 'Jun', contracts: 58, budget: 710000, renewals: 13 },
      ],
    },
  };

  const isLoading = false;
  const error = null;
  const lastUpdated = new Date();

  const handleExport = () => {
    // In a real implementation, this would export the current analytics data
    console.log('Exporting analytics data...', data);
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'overview':
        return <BarChart3 className="h-4 w-4" />;
      case 'metrics':
        return <TrendingUp className="h-4 w-4" />;
      case 'compliance':
        return <Shield className="h-4 w-4" />;
      case 'trends':
        return <Activity className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getOverviewCards = () => {
    if (!data) return [];

    const { executiveMetrics, complianceData } = data;

    return [
      {
        title: 'Total Contracts',
        value: executiveMetrics.totalContracts.toLocaleString(),
        change: `+${executiveMetrics.contractGrowth}%`,
        trend: 'up' as const,
        icon: BarChart3,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      },
      {
        title: 'Total Budget',
        value: `$${(executiveMetrics.totalBudget / 1000000).toFixed(1)}M`,
        change: '+8.2%',
        trend: 'up' as const,
        icon: TrendingUp,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      },
      {
        title: 'Compliance Rate',
        value: `${complianceData.overall.rate}%`,
        change: `+${complianceData.overall.change}%`,
        trend: complianceData.overall.trend,
        icon: Shield,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
      },
      {
        title: 'Active Contracts',
        value: executiveMetrics.activeContracts.toLocaleString(),
        change: '+5.1%',
        trend: 'up' as const,
        icon: Activity,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
      },
    ];
  };

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
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️ Error Loading Analytics</div>
        <p className="text-red-700 mb-4">{error}</p>
      </div>
    );
  }

  return (
    <AnalyticsErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="h1 sidebar-gradient-text">
              Enhanced Analytics Dashboard
            </h2>
            <p className="body-1 text-light-200 mt-1">
              {department
                ? `${
                    department.charAt(0).toUpperCase() + department.slice(1)
                  } Department`
                : 'Organization-wide'}{' '}
              Analytics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="bg-white/60 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRealTime(!isRealTime)}
              className="bg-white/60 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
            >
              {isRealTime ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getOverviewCards().map((card, index) => (
            <Card
              key={index}
              className="bg-white/60 backdrop-blur border border-white/40 shadow-lg"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="body-2 text-slate-700">{card.title}</p>
                    <p className="h2 text-navy font-bold mt-1">{card.value}</p>
                    <div className="flex items-center mt-2">
                      <span
                        className={`text-sm font-medium ${
                          card.trend === 'up'
                            ? 'text-green-600'
                            : card.trend === 'down'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {card.change}
                      </span>
                      <span className="text-slate-500 text-sm ml-2">
                        vs last month
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(
              value as 'overview' | 'metrics' | 'compliance' | 'trends'
            )
          }
        >
          <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur border border-white/40">
            <TabsTrigger
              value="overview"
              className="flex items-center space-x-2"
            >
              {getTabIcon('overview')}
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="metrics"
              className="flex items-center space-x-2"
            >
              {getTabIcon('metrics')}
              <span>Metrics</span>
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="flex items-center space-x-2"
            >
              {getTabIcon('compliance')}
              <span>Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center space-x-2">
              {getTabIcon('trends')}
              <span>Trends</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-700">Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  This is a simplified overview of the analytics dashboard. The
                  full implementation would include detailed charts and metrics.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-700">
                  Executive Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Executive-level metrics and KPIs would be displayed here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-700">
                  Compliance Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Compliance status and risk factors would be displayed here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
              <CardHeader>
                <CardTitle className="text-slate-700">Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Historical trends and forecasting would be displayed here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Last Updated */}
        <div className="text-center text-light-200 text-sm">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      </div>
    </AnalyticsErrorBoundary>
  );
};

export default EnhancedAnalyticsDashboard;
