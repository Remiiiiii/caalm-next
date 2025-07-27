'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';

// Mock data for Administration Analytics
const mockData = {
  // Contract trends over time
  contractTrends: [
    { month: 'Jan', active: 45, pending: 12, expired: 3 },
    { month: 'Feb', active: 52, pending: 15, expired: 5 },
    { month: 'Mar', active: 48, pending: 18, expired: 7 },
    { month: 'Apr', active: 61, pending: 22, expired: 4 },
    { month: 'May', active: 58, pending: 19, expired: 6 },
    { month: 'Jun', active: 67, pending: 25, expired: 8 },
  ],

  // Department budget allocation
  budgetAllocation: [
    { department: 'Child Welfare', budget: 450000, spent: 380000 },
    { department: 'Behavioral Health', budget: 320000, spent: 295000 },
    { department: 'CINS/FINS/SNAP', budget: 280000, spent: 265000 },
    { department: 'Residential', budget: 380000, spent: 345000 },
    { department: 'Clinic', budget: 290000, spent: 275000 },
    { department: 'Administration', budget: 180000, spent: 165000 },
  ],

  // License compliance status
  licenseCompliance: [
    { status: 'Compliant', count: 85, color: '#10B981' },
    { status: 'At Risk', count: 12, color: '#F59E0B' },
    { status: 'Non-Compliant', count: 8, color: '#EF4444' },
    { status: 'Pending Review', count: 15, color: '#6B7280' },
  ],

  // Monthly expenses
  monthlyExpenses: [
    { month: 'Jan', expenses: 125000 },
    { month: 'Feb', expenses: 138000 },
    { month: 'Mar', expenses: 142000 },
    { month: 'Apr', expenses: 156000 },
    { month: 'May', expenses: 149000 },
    { month: 'Jun', expenses: 162000 },
  ],

  // Staff distribution
  staffDistribution: [
    { role: 'Executives', count: 8 },
    { role: 'Managers', count: 24 },
    { role: 'Administrators', count: 15 },
    { role: 'Support Staff', count: 42 },
  ],

  // Contract types distribution
  contractTypes: [
    { type: 'Service Contracts', count: 35, color: '#3B82F6' },
    { type: 'Vendor Agreements', count: 28, color: '#10B981' },
    { type: 'Partnerships', count: 18, color: '#F59E0B' },
    { type: 'Consulting', count: 12, color: '#8B5CF6' },
    { type: 'Equipment', count: 8, color: '#EF4444' },
  ],
};

// KPI Cards Data
const kpiData = [
  {
    title: 'Total Contracts',
    value: '156',
    change: '+12%',
    trend: 'up',
    icon: FileText,
    description: 'Active contracts this month',
  },
  {
    title: 'Total Budget',
    value: '$1.9M',
    change: '+8%',
    trend: 'up',
    icon: DollarSign,
    description: 'Annual budget allocation',
  },
  {
    title: 'Staff Count',
    value: '89',
    change: '+3%',
    trend: 'up',
    icon: Users,
    description: 'Total employees',
  },
  {
    title: 'Compliance Rate',
    value: '85%',
    change: '+5%',
    trend: 'up',
    icon: TrendingUp,
    description: 'License compliance rate',
  },
];

const AdministrationAnalytics = () => {
  const handleRefresh = () => {
    // TODO: Implement refresh logic
    console.log('Refreshing analytics data...');
  };

  const handleExport = () => {
    // TODO: Implement export logic
    console.log('Exporting analytics data...');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Administration Analytics
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive overview of administrative operations and performance
            metrics
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {kpi.value}
              </div>
              <div className="flex items-center space-x-2">
                {kpi.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm ${
                    kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {kpi.change}
                </span>
                <span className="text-sm text-gray-500">from last month</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contract Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Trends</CardTitle>
                <CardDescription>
                  Monthly contract status over the last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={mockData.contractTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="active"
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      stackId="1"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="expired"
                      stackId="1"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Staff Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Distribution</CardTitle>
                <CardDescription>Current staff count by role</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockData.staffDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ role, percent }) =>
                        `${role} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {mockData.staffDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][
                              index % 4
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contract Types */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Types Distribution</CardTitle>
                <CardDescription>
                  Breakdown of contracts by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockData.contractTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) =>
                        `${type} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {mockData.contractTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Contract Trends Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Growth</CardTitle>
                <CardDescription>
                  Active contracts growth over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockData.contractTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="active"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget Allocation */}
            <Card>
              <CardHeader>
                <CardTitle>Department Budget Allocation</CardTitle>
                <CardDescription>
                  Budget vs actual spending by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={mockData.budgetAllocation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="department"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="budget" fill="#3B82F6" name="Budget" />
                    <Bar dataKey="spent" fill="#10B981" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Expenses Trend</CardTitle>
                <CardDescription>
                  Total monthly expenses over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={mockData.monthlyExpenses}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* License Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>License Compliance Status</CardTitle>
                <CardDescription>
                  Current compliance status across all licenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockData.licenseCompliance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) =>
                        `${status} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {mockData.licenseCompliance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Compliance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Summary</CardTitle>
                <CardDescription>
                  Detailed breakdown of compliance status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockData.licenseCompliance.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.status}</span>
                      </div>
                      <Badge variant="secondary">{item.count} licenses</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdministrationAnalytics;
