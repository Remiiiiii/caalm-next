'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Target,
} from 'lucide-react';

interface ExecutiveMetricsDashboardProps {
  selectedDepartment?: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  description: string;
}

const ExecutiveMetricsDashboard: React.FC<ExecutiveMetricsDashboardProps> = ({
  selectedDepartment,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d'
  );
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in real implementation, this would come from API
  const generateMetrics = (department?: string): MetricCard[] => {
    const baseMetrics = {
      totalContracts: 1247,
      totalBudget: 15600000,
      complianceRate: 89.2,
      activeContracts: 892,
      expiringSoon: 23,
      overdueRenewals: 7,
      averageContractValue: 12500,
      contractGrowth: 12.5,
    };

    // Adjust metrics based on department
    if (department && department !== 'all') {
      const departmentMultiplier =
        {
          'child-welfare': 0.25,
          'behavioral-health': 0.2,
          cfs: 0.15,
          residential: 0.18,
          clinic: 0.22,
          administration: 0.1,
        }[department] || 0.2;

      Object.keys(baseMetrics).forEach((key) => {
        if (typeof baseMetrics[key as keyof typeof baseMetrics] === 'number') {
          (baseMetrics as Record<string, number>)[key] = Math.round(
            (baseMetrics as Record<string, number>)[key] * departmentMultiplier
          );
        }
      });
    }

    return [
      {
        title: 'Total Contracts',
        value: baseMetrics.totalContracts.toLocaleString(),
        change: baseMetrics.contractGrowth,
        changeType: baseMetrics.contractGrowth > 0 ? 'increase' : 'decrease',
        icon: FileText,
        color: 'text-blue-600',
        description: 'Active and completed contracts',
      },
      {
        title: 'Total Budget',
        value: `$${(baseMetrics.totalBudget / 1000000).toFixed(1)}M`,
        change: 8.3,
        changeType: 'increase',
        icon: DollarSign,
        color: 'text-green-600',
        description: 'Total contract value',
      },
      {
        title: 'Compliance Rate',
        value: `${baseMetrics.complianceRate}%`,
        change: 2.1,
        changeType: 'increase',
        icon: CheckCircle,
        color: 'text-emerald-600',
        description: 'Contracts meeting compliance standards',
      },
      {
        title: 'Active Contracts',
        value: baseMetrics.activeContracts.toLocaleString(),
        change: 5.7,
        changeType: 'increase',
        icon: Activity,
        color: 'text-purple-600',
        description: 'Currently active contracts',
      },
      {
        title: 'Expiring Soon',
        value: baseMetrics.expiringSoon,
        change: -15.2,
        changeType: 'decrease',
        icon: Clock,
        color: 'text-orange-600',
        description: 'Contracts expiring in next 30 days',
      },
      {
        title: 'Overdue Renewals',
        value: baseMetrics.overdueRenewals,
        change: -25.0,
        changeType: 'decrease',
        icon: AlertTriangle,
        color: 'text-red-600',
        description: 'Contracts past renewal date',
      },
      {
        title: 'Avg Contract Value',
        value: `$${baseMetrics.averageContractValue.toLocaleString()}`,
        change: 3.8,
        changeType: 'increase',
        icon: Target,
        color: 'text-indigo-600',
        description: 'Average value per contract',
      },
      {
        title: 'Contract Growth',
        value: `${baseMetrics.contractGrowth}%`,
        change: 1.2,
        changeType: 'increase',
        icon: TrendingUp,
        color: 'text-teal-600',
        description: 'Year-over-year growth',
      },
    ];
  };

  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setMetrics(generateMetrics(selectedDepartment));
      setIsLoading(false);
    }, 1000);
  }, [selectedDepartment, timeRange]);

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600 bg-green-50';
      case 'decrease':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card
              key={i}
              className="bg-white/60 backdrop-blur border border-white/40 shadow-lg"
            >
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-white/20 rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-3 bg-white/20 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="h2 sidebar-gradient-text">Executive Metrics</h2>
          <p className="body-2 text-slate-700">
            Key performance indicators and business metrics
          </p>
        </div>
        <Tabs
          value={timeRange}
          onValueChange={(value) =>
            setTimeRange(value as '7d' | '30d' | '90d' | '1y')
          }
        >
          <TabsList className="bg-white/20 backdrop-blur border border-white/40">
            <TabsTrigger value="7d" className="data-[state=active]:bg-white/30">
              7D
            </TabsTrigger>
            <TabsTrigger
              value="30d"
              className="data-[state=active]:bg-white/30"
            >
              30D
            </TabsTrigger>
            <TabsTrigger
              value="90d"
              className="data-[state=active]:bg-white/30"
            >
              90D
            </TabsTrigger>
            <TabsTrigger value="1y" className="data-[state=active]:bg-white/30">
              1Y
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card
              key={index}
              className="bg-white/60 backdrop-blur border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="body-2 text-slate-700">
                  {metric.title}
                </CardTitle>
                <IconComponent className={`h-5 w-5 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="h2 text-navy font-bold mb-2">
                  {metric.value}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="secondary"
                    className={`${getChangeColor(metric.changeType)} border-0`}
                  >
                    <div className="flex items-center space-x-1">
                      {getChangeIcon(metric.changeType)}
                      <span className="text-xs font-medium">
                        {metric.change > 0 ? '+' : ''}
                        {metric.change}%
                      </span>
                    </div>
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800">Performance Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Overall Health</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Excellent
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Risk Level</span>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Low
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Growth Trend</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Positive
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800">Compliance Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Compliant</span>
                <span className="font-semibold text-green-800">89.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Action Required</span>
                <span className="font-semibold text-green-800">7.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Non-Compliant</span>
                <span className="font-semibold text-green-800">3.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-purple-800">Growth Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Contract Growth</span>
                <span className="font-semibold text-purple-800">+12.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Budget Growth</span>
                <span className="font-semibold text-purple-800">+8.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Efficiency</span>
                <span className="font-semibold text-purple-800">+5.7%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveMetricsDashboard;
