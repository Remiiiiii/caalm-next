'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface TrendAnalysisProps {
  department?: string;
}

interface TrendData {
  period: string;
  contracts: number;
  budget: number;
  compliance: number;
  renewals: number;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }>;
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ department }) => {
  const [activeTab, setActiveTab] = useState<
    'contracts' | 'budget' | 'compliance' | 'renewals'
  >('contracts');
  const [timeRange, setTimeRange] = useState<'6m' | '1y' | '2y' | '5y'>('1y');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation
  const generateTrendData = (dept?: string, range: string = '1y') => {
    const periods = {
      '6m': 6,
      '1y': 12,
      '2y': 24,
      '5y': 60,
    };

    const months = periods[range as keyof typeof periods] || 12;
    const data: TrendData[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      // Generate realistic trend data with some randomness
      const baseContracts = 100 + Math.sin(i * 0.5) * 20 + Math.random() * 10;
      const baseBudget =
        1000000 + Math.sin(i * 0.3) * 200000 + Math.random() * 50000;
      const baseCompliance = 85 + Math.sin(i * 0.2) * 5 + Math.random() * 3;
      const baseRenewals = 15 + Math.sin(i * 0.4) * 5 + Math.random() * 3;

      data.push({
        period: date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        contracts: Math.round(baseContracts),
        budget: Math.round(baseBudget),
        compliance: Math.round(baseCompliance * 10) / 10,
        renewals: Math.round(baseRenewals),
      });
    }

    // Adjust data based on department
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

      data.forEach((item) => {
        item.contracts = Math.round(item.contracts * departmentMultiplier);
        item.budget = Math.round(item.budget * departmentMultiplier);
        item.renewals = Math.round(item.renewals * departmentMultiplier);
      });
    }

    return data;
  };

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setTrendData(generateTrendData(department, timeRange));
      setIsLoading(false);
    }, 1000);
  }, [department, timeRange]);

  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return { direction: 'stable', percentage: 0 };

    const first = data[0];
    const last = data[data.length - 1];
    const percentage = ((last - first) / first) * 100;

    return {
      direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable',
      percentage: Math.abs(percentage),
    };
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'contracts':
        return trendData.map((d) => d.contracts);
      case 'budget':
        return trendData.map((d) => d.budget);
      case 'compliance':
        return trendData.map((d) => d.compliance);
      case 'renewals':
        return trendData.map((d) => d.renewals);
      default:
        return [];
    }
  };

  const getCurrentValue = () => {
    const data = getCurrentData();
    return data[data.length - 1] || 0;
  };

  const getTrendInfo = () => {
    const data = getCurrentData();
    return calculateTrend(data);
  };

  const formatValue = (value: number) => {
    switch (activeTab) {
      case 'budget':
        return `$${(value / 1000000).toFixed(1)}M`;
      case 'compliance':
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'contracts':
        return <BarChart3 className="h-4 w-4" />;
      case 'budget':
        return <TrendingUp className="h-4 w-4" />;
      case 'compliance':
        return <PieChart className="h-4 w-4" />;
      case 'renewals':
        return <Calendar className="h-4 w-4" />;
      default:
        return <LineChart className="h-4 w-4" />;
    }
  };

  const getTabColor = (tab: string) => {
    switch (tab) {
      case 'contracts':
        return 'text-blue-600';
      case 'budget':
        return 'text-green-600';
      case 'compliance':
        return 'text-purple-600';
      case 'renewals':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  // Simple chart component (in a real app, you'd use a proper charting library like Chart.js or Recharts)
  const SimpleChart = ({
    data,
    labels,
  }: {
    data: number[];
    labels: string[];
  }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;

    return (
      <div className="h-64 w-full">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={200 * ratio}
              x2="400"
              y2={200 * ratio}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Data line */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={data
              .map((value, index) => {
                const x = (index / (data.length - 1)) * 400;
                const y = 200 - ((value - min) / range) * 180 - 10;
                return `${x},${y}`;
              })
              .join(' ')}
          />

          {/* Area under the curve */}
          <polygon
            fill="url(#gradient)"
            points={`0,200 ${data
              .map((value, index) => {
                const x = (index / (data.length - 1)) * 400;
                const y = 200 - ((value - min) / range) * 180 - 10;
                return `${x},${y}`;
              })
              .join(' ')} 400,200`}
          />

          {/* Data points */}
          {data.map((value, index) => {
            const x = (index / (data.length - 1)) * 400;
            const y = 200 - ((value - min) / range) * 180 - 10;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="currentColor"
                className="hover:r-4 transition-all"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
          <div className="h-64 bg-white/20 rounded-xl backdrop-blur"></div>
        </div>
      </div>
    );
  }

  const currentValue = getCurrentValue();
  const trendInfo = getTrendInfo();
  const currentData = getCurrentData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="h2 sidebar-gradient-text">Trend Analysis</h2>
          <p className="body-2 text-slate-700">
            Historical trends and performance indicators
          </p>
        </div>
        <div className="flex space-x-2">
          <Tabs
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as any)}
          >
            <TabsList className="bg-white/20 backdrop-blur border border-white/40">
              <TabsTrigger
                value="6m"
                className="data-[state=active]:bg-white/30"
              >
                6M
              </TabsTrigger>
              <TabsTrigger
                value="1y"
                className="data-[state=active]:bg-white/30"
              >
                1Y
              </TabsTrigger>
              <TabsTrigger
                value="2y"
                className="data-[state=active]:bg-white/30"
              >
                2Y
              </TabsTrigger>
              <TabsTrigger
                value="5y"
                className="data-[state=active]:bg-white/30"
              >
                5Y
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Current Value and Trend */}
      <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {getTabIcon(activeTab)}
            <span className={getTabColor(activeTab)}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Trend
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h1 text-navy font-bold">
                {formatValue(currentValue)}
              </div>
              <div className="flex items-center space-x-2">
                {trendInfo.direction === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : trendInfo.direction === 'down' ? (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                ) : (
                  <div className="h-4 w-4 text-gray-600">—</div>
                )}
                <span
                  className={`text-sm font-medium ${
                    trendInfo.direction === 'up'
                      ? 'text-green-600'
                      : trendInfo.direction === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {trendInfo.direction === 'up'
                    ? '+'
                    : trendInfo.direction === 'down'
                    ? '-'
                    : ''}
                  {trendInfo.percentage.toFixed(1)}% from start
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Tabs */}
      <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as any)}
          >
            <TabsList className="grid w-full grid-cols-4 bg-white/20 backdrop-blur border border-white/40">
              <TabsTrigger
                value="contracts"
                className="data-[state=active]:bg-white/30"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Contracts
              </TabsTrigger>
              <TabsTrigger
                value="budget"
                className="data-[state=active]:bg-white/30"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Budget
              </TabsTrigger>
              <TabsTrigger
                value="compliance"
                className="data-[state=active]:bg-white/30"
              >
                <PieChart className="h-4 w-4 mr-2" />
                Compliance
              </TabsTrigger>
              <TabsTrigger
                value="renewals"
                className="data-[state=active]:bg-white/30"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Renewals
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className={getTabColor(activeTab)}>
            <SimpleChart
              data={currentData}
              labels={trendData.map((d) => d.period)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            key: 'contracts',
            label: 'Total Contracts',
            icon: BarChart3,
            color: 'text-blue-600',
          },
          {
            key: 'budget',
            label: 'Total Budget',
            icon: TrendingUp,
            color: 'text-green-600',
          },
          {
            key: 'compliance',
            label: 'Avg Compliance',
            icon: PieChart,
            color: 'text-purple-600',
          },
          {
            key: 'renewals',
            label: 'Total Renewals',
            icon: Calendar,
            color: 'text-orange-600',
          },
        ].map(({ key, label, icon: Icon, color }) => {
          const data =
            key === 'contracts'
              ? trendData.map((d) => d.contracts)
              : key === 'budget'
              ? trendData.map((d) => d.budget)
              : key === 'compliance'
              ? trendData.map((d) => d.compliance)
              : trendData.map((d) => d.renewals);

          const total = data.reduce((sum, val) => sum + val, 0);
          const average = total / data.length;
          const trend = calculateTrend(data);

          return (
            <Card
              key={key}
              className="bg-white/60 backdrop-blur border border-white/40 shadow-lg"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="body-2 text-slate-700">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <div className="h2 text-navy font-bold mb-2">
                  {key === 'budget'
                    ? `$${(total / 1000000).toFixed(1)}M`
                    : key === 'compliance'
                    ? `${average.toFixed(1)}%`
                    : total.toLocaleString()}
                </div>
                <div className="flex items-center space-x-2">
                  {trend.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : trend.direction === 'down' ? (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  ) : (
                    <div className="h-3 w-3 text-gray-600">—</div>
                  )}
                  <span
                    className={`text-xs ${
                      trend.direction === 'up'
                        ? 'text-green-600'
                        : trend.direction === 'down'
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {trend.direction === 'up'
                      ? '+'
                      : trend.direction === 'down'
                      ? '-'
                      : ''}
                    {trend.percentage.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TrendAnalysis;
