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
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
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

// KPI Cards Data - Commented out as not used
/*
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
*/

const AdministrationAnalytics = () => {
  const handleRefresh = () => {
    // Refresh data logic
    console.log('Refreshing analytics data...');
  };

  const handleExport = () => {
    // Export logic
    console.log('Exporting analytics data...');
  };

  return (
    <div className="relative space-y-6">
      {/* Background Video to match ExecutiveDashboard styling */}

      <source src="/assets/video/wave.mp4" type="video/mp4" />

      {/* Header Actions */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="h3 font-bold sidebar-gradient-text">
            Administration Analytics
          </h2>
          <p className="body-1 text-slate-700">
            Comprehensive overview of administrative operations
          </p>
        </div>
        <div className="flex space-x-3">
          {/* <Button
            onClick={handleRefresh}
            variant="outline"
            className="bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button> */}
          <Button
            onClick={handleExport}
            className="bg-white/20 text-slate-700 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="body-2 text-navy">Total Contracts</CardTitle>
            <FileText className="h-4 w-4" style={{ color: '#524E4E' }} />
          </CardHeader>
          <CardContent>
            <div className="h2 text-navy font-bold">156</div>
            <p className="text-xs text-[#10B981]">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="body-2 text-navy">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4" style={{ color: '#03AFBF' }} />
          </CardHeader>
          <CardContent>
            <div className="h2 text-navy font-bold">$1.9M</div>
            <p className="text-xs text-[#10B981]">+8% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="body-2 text-navy">Staff Count</CardTitle>
            <Users className="h-4 w-4" style={{ color: '#56B8FF' }} />
          </CardHeader>
          <CardContent>
            <div className="h2 text-navy font-bold">89</div>
            <p className="text-xs text-[#10B981]">+3 new hires</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="body-2 text-navy">Compliance Rate</CardTitle>
            <TrendingUp className="h-4 w-4" style={{ color: '#03AFBF' }} />
          </CardHeader>
          <CardContent>
            <div className="h2 text-navy font-bold">85%</div>
            <p className="text-xs text-[#10B981]">+2% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract Trends */}
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 sidebar-gradient-text">
              Contract Trends
            </CardTitle>
            <CardDescription className="text-slate-700">
              Monthly contract status overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData.contractTrends}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke="#10B981"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  stroke="#F59E0B"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="expired"
                  stroke="#EF4444"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budget Allocation */}
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 sidebar-gradient-text">
              Budget Allocation
            </CardTitle>
            <CardDescription className="text-slate-700">
              Department budget distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockData.budgetAllocation}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="department" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="budget" fill="#3B82F6" />
                <Bar dataKey="spent" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* License Compliance */}
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 sidebar-gradient-text">
              License Compliance
            </CardTitle>
            <CardDescription className="text-slate-700">
              Current compliance status
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
                  label={({ name, percent }) =>
                    `${name ?? ''} ${(((percent ?? 0) * 100) as number).toFixed(
                      0
                    )}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {mockData.licenseCompliance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 sidebar-gradient-text">
              Monthly Expenses
            </CardTitle>
            <CardDescription className="text-slate-700">
              Expense trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockData.monthlyExpenses}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
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

      {/* Staff and Contract Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 sidebar-gradient-text">
              Staff Distribution
            </CardTitle>
            <CardDescription className="text-slate-700">
              Staff by role and department
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.staffDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="body-2 text-slate-700">{item.role}</span>
                  <Badge
                    variant="secondary"
                    className="bg-white/20 backdrop-blur border border-white/40"
                    style={{ color: '#524E4E' }}
                  >
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 sidebar-gradient-text">
              Contract Types
            </CardTitle>
            <CardDescription className="text-slate-700">
              Distribution by contract type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.contractTypes.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="body-2 text-slate-700">{item.type}</span>
                  <Badge
                    variant="secondary"
                    className="bg-white/20 backdrop-blur border border-white/40"
                    style={{ color: '#524E4E' }}
                  >
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdministrationAnalytics;
