'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Building,
  Eye,
  ClipboardCheck,
  BarChart3,
  Activity,
  Shield,
} from 'lucide-react';

interface ContractStats {
  totalContracts: number;
  totalBudget: number;
  activeContracts: number;
  expiredContracts: number;
  pendingContracts: number;
  complianceRate: number;
  staffCount: number;
}

interface DepartmentAnalytics {
  name: string;
  divisions: {
    id: string;
    name: string;
    description: string;
    stats: ContractStats;
  }[];
  totalStats: ContractStats;
}

interface AdminAnalyticsData {
  departments: DepartmentAnalytics[];
  totalStats: {
    totalContracts: number;
    totalBudget: number;
    totalActiveStaff: number;
    complianceRate: number;
  };
}

// Mock data for charts
const mockData = {
  contractTrends: [
    { month: 'Jan', active: 45, pending: 12, expired: 3 },
    { month: 'Feb', active: 52, pending: 15, expired: 5 },
    { month: 'Mar', active: 48, pending: 18, expired: 7 },
    { month: 'Apr', active: 61, pending: 22, expired: 4 },
    { month: 'May', active: 58, pending: 19, expired: 6 },
    { month: 'Jun', active: 67, pending: 25, expired: 8 },
  ],
  budgetAllocation: [
    { department: 'Child Welfare', budget: 450000, spent: 380000 },
    { department: 'Behavioral Health', budget: 320000, spent: 295000 },
    { department: 'CINS/FINS/SNAP', budget: 280000, spent: 265000 },
    { department: 'Residential', budget: 380000, spent: 345000 },
    { department: 'Clinic', budget: 290000, spent: 275000 },
    { department: 'Administration', budget: 180000, spent: 165000 },
  ],
  licenseCompliance: [
    { status: 'Compliant', count: 85, color: '#03AFBF' },
    { status: 'At Risk', count: 12, color: '#F59E0B' },
    { status: 'Non-Compliant', count: 8, color: '#EF4444' },
    { status: 'Pending Review', count: 15, color: '#524E4E' },
  ],
  monthlyExpenses: [
    { month: 'Jan', expenses: 125000 },
    { month: 'Feb', expenses: 138000 },
    { month: 'Mar', expenses: 142000 },
    { month: 'Apr', expenses: 156000 },
    { month: 'May', expenses: 149000 },
    { month: 'Jun', expenses: 162000 },
  ],
  staffDistribution: [
    { role: 'Executives', count: 8 },
    { role: 'Managers', count: 24 },
    { role: 'Administrators', count: 15 },
    { role: 'Support Staff', count: 42 },
  ],
  contractTypes: [
    { type: 'Service Contracts', count: 35, color: '#3B82F6' },
    { type: 'Vendor Agreements', count: 28, color: '#10B981' },
    { type: 'Partnerships', count: 18, color: '#F59E0B' },
    { type: 'Consulting', count: 12, color: '#8B5CF6' },
    { type: 'Equipment', count: 8, color: '#EF4444' },
  ],
};

const AdminAnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDepartmentTab, setSelectedDepartmentTab] =
    useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/analytics/admin');
        if (!response.ok) {
          throw new Error(
            `Failed to fetch admin analytics: ${response.statusText}`
          );
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch analytics data');
        }

        setAnalyticsData(result.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch analytics data'
        );
        console.error('Error fetching admin analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleExport = () => {
    console.log('Exporting analytics data...');
  };

  // Get department-specific data for charts
  const getDepartmentData = (deptName: string) => {
    if (!analyticsData || deptName === 'all') {
      return {
        budgetData: mockData.budgetAllocation,
        expensesData: mockData.monthlyExpenses,
        staffData: mockData.staffDistribution,
        contractTypesData: mockData.contractTypes,
        complianceData: mockData.licenseCompliance,
        trendsData: mockData.contractTrends,
      };
    }

    const dept = analyticsData.departments.find(
      (d) => d.name.toLowerCase() === deptName
    );
    if (!dept) {
      return {
        budgetData: [],
        expensesData: [],
        staffData: [],
        contractTypesData: [],
        complianceData: [],
        trendsData: [],
      };
    }

    // Create department-specific data
    const budgetData =
      dept.divisions.length > 0
        ? dept.divisions.map((div) => ({
            department: div.name,
            budget: div.stats.totalBudget,
            spent: div.stats.totalBudget * 0.85, // Mock 85% spent
          }))
        : [
            {
              department: dept.name,
              budget: dept.totalStats.totalBudget,
              spent: dept.totalStats.totalBudget * 0.85,
            },
          ];

    const expensesData = mockData.monthlyExpenses.map((item) => ({
      ...item,
      expenses: Math.round(
        item.expenses * (dept.totalStats.totalBudget / 2000000)
      ), // Scale based on department budget
    }));

    const staffData =
      dept.divisions.length > 0
        ? dept.divisions.map((div) => ({
            role: div.name,
            count: div.stats.staffCount,
          }))
        : [{ role: `${dept.name} Staff`, count: dept.totalStats.staffCount }];

    const contractTypesData = mockData.contractTypes.map((item, index) => ({
      ...item,
      count: Math.max(
        1,
        Math.round(dept.totalStats.totalContracts * (0.4 - index * 0.08))
      ), // Distribute contracts
    }));

    const complianceData = [
      {
        status: 'Compliant',
        count: Math.round(
          dept.totalStats.totalContracts *
            (dept.totalStats.complianceRate / 100)
        ),
        color: '#03AFBF',
      },
      {
        status: 'At Risk',
        count: Math.round(dept.totalStats.totalContracts * 0.1),
        color: '#F59E0B',
      },
      {
        status: 'Non-Compliant',
        count: Math.round(
          dept.totalStats.totalContracts *
            ((100 - dept.totalStats.complianceRate) / 100)
        ),
        color: '#EF4444',
      },
    ];

    const trendsData = mockData.contractTrends.map((item) => ({
      ...item,
      active: Math.round(item.active * (dept.totalStats.activeContracts / 67)),
      pending: Math.round(
        item.pending * (dept.totalStats.pendingContracts / 25)
      ),
      expired: Math.round(
        item.expired * (dept.totalStats.expiredContracts / 8)
      ),
    }));

    return {
      budgetData,
      expensesData,
      staffData,
      contractTypesData,
      complianceData,
      trendsData,
    };
  };

  const currentDepartmentData = getDepartmentData(selectedDepartmentTab);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
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

  if (error || !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">⚠️ Error Loading Analytics</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = window.location.pathname}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-center">
        <div>
          <h1 className="h1 sidebar-gradient-text text-center">
            Organizational Performance Dashboard
          </h1>
          <p className="body-1 text-light-200 text-center py-2">
            Cross-departmental performance metrics and insights
          </p>
        </div>
      </div>
      <div className="flex space-x-3 justify-end">
        <Button
          onClick={handleExport}
          className="bg-white/20 text-slate-700 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="outline"
          className="bg-white/20 text-slate-700 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </div>

      {/* Global Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="body-2 text-slate-700">
              Total Contracts
            </CardTitle>
            <FileText className="h-4 w-4" style={{ color: '#524E4E' }} />
          </CardHeader>
          <CardContent>
            <div className="h2 text-navy font-bold">
              {analyticsData.totalStats.totalContracts.toLocaleString()}
            </div>
            <p className="text-xs text-[#10B981]">+12.5% vs last month</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="body-2 text-slate-700">
              Total Budget
            </CardTitle>
            <DollarSign className="h-4 w-4" style={{ color: '#03AFBF' }} />
          </CardHeader>
          <CardContent>
            <div className="h2 text-navy font-bold">
              ${(analyticsData.totalStats.totalBudget / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-[#10B981]">+8.2% vs last month</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="body-2 text-slate-700">
              Active Staff
            </CardTitle>
            <Users className="h-4 w-4" style={{ color: '#56B8FF' }} />
          </CardHeader>
          <CardContent>
            <div className="h2 text-navy font-bold">
              {analyticsData.totalStats.totalActiveStaff.toLocaleString()}
            </div>
            <p className="text-xs text-[#10B981]">+5.1% vs last month</p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="body-2 text-slate-700">
              Compliance Rate
            </CardTitle>
            <ClipboardCheck className="h-4 w-4" style={{ color: '#8B5CF6' }} />
          </CardHeader>
          <CardContent>
            <div className="h2 text-navy font-bold">
              {analyticsData.totalStats.complianceRate}%
            </div>
            <p className="text-xs text-[#10B981]">+2.1% vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Navigation */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h2 sidebar-gradient-text">
            Departmental Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="all"
            className="w-full"
            onValueChange={(value) => setSelectedDepartmentTab(value)}
          >
            <TabsList className="flex w-full bg-white/20 backdrop-blur border border-white/40 overflow-x-auto">
              <TabsTrigger
                value="all"
                className="tabs-underline flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-navy"
              >
                All Departments
              </TabsTrigger>
              {analyticsData.departments.map((dept) => (
                <TabsTrigger
                  key={dept.name}
                  value={dept.name.toLowerCase()}
                  className="tabs-underline flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-navy"
                >
                  {dept.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analyticsData.departments.map((dept) => (
                  <Card
                    key={dept.name}
                    className="bg-white/60 backdrop-blur border border-white/40 shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="body-1 text-navy">
                          {dept.name}
                        </CardTitle>
                        <Building
                          className="h-5 w-5"
                          style={{ color: '#03AFBF' }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">
                            Contracts:
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-white/20 backdrop-blur"
                          >
                            {dept.totalStats.totalContracts}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Staff:</span>
                          <Badge
                            variant="secondary"
                            className="bg-white/20 backdrop-blur"
                          >
                            {dept.totalStats.staffCount}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">
                            Budget:
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-white/20 backdrop-blur"
                          >
                            $
                            {(dept.totalStats.totalBudget / 1000000).toFixed(1)}
                            M
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">
                            Compliance:
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-white/20 backdrop-blur"
                          >
                            {dept.totalStats.complianceRate}%
                          </Badge>
                        </div>
                        {dept.divisions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/20">
                            <span className="text-xs text-slate-500">
                              Divisions: {dept.divisions.length}
                            </span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {dept.divisions.slice(0, 3).map((division) => (
                                <Badge
                                  key={division.id}
                                  variant="outline"
                                  className="text-xs bg-white/10 backdrop-blur sidebar-gradient-text"
                                >
                                  {division.name}
                                </Badge>
                              ))}
                              {dept.divisions.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-white/10 backdrop-blur sidebar-gradient-text"
                                >
                                  +{dept.divisions.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {analyticsData.departments.map((dept) => (
              <TabsContent
                key={dept.name}
                value={dept.name.toLowerCase()}
                className="mt-6"
              >
                <div className="space-y-6">
                  {/* Department Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Contracts</p>
                            <p className="text-2xl font-bold text-navy">
                              {dept.totalStats.totalContracts}
                            </p>
                          </div>
                          <FileText
                            className="h-8 w-8"
                            style={{ color: '#524E4E' }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Budget</p>
                            <p className="text-2xl font-bold text-navy">
                              $
                              {(dept.totalStats.totalBudget / 1000000).toFixed(
                                1
                              )}
                              M
                            </p>
                          </div>
                          <DollarSign
                            className="h-8 w-8"
                            style={{ color: '#03AFBF' }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Staff</p>
                            <p className="text-2xl font-bold text-navy">
                              {dept.totalStats.staffCount}
                            </p>
                          </div>
                          <Users
                            className="h-8 w-8"
                            style={{ color: '#56B8FF' }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Compliance</p>
                            <p className="text-2xl font-bold text-navy">
                              {dept.totalStats.complianceRate}%
                            </p>
                          </div>
                          <ClipboardCheck
                            className="h-8 w-8"
                            style={{ color: '#8B5CF6' }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Divisions */}
                  <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
                    <CardHeader>
                      <CardTitle className="h3 sidebar-gradient-text">
                        {dept.name} Divisions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dept.divisions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {dept.divisions.map((division) => (
                            <Card
                              key={division.id}
                              className="bg-white/40 backdrop-blur border border-white/40"
                            >
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-navy">
                                  {division.name}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {division.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span>Contracts:</span>
                                    <span className="font-medium">
                                      {division.stats.totalContracts}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Staff:</span>
                                    <span className="font-medium">
                                      {division.stats.staffCount}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Budget:</span>
                                    <span className="font-medium">
                                      $
                                      {(
                                        division.stats.totalBudget / 1000
                                      ).toFixed(0)}
                                      K
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Compliance:</span>
                                    <span className="font-medium">
                                      {division.stats.complianceRate}%
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="flex flex-col items-center space-y-3">
                            <Building className="h-12 w-12 text-slate-400" />
                            <div>
                              <h4 className="body-1 text-slate-600 mb-2">
                                No Divisions Found
                              </h4>
                              <p className="text-sm text-slate-500">
                                The {dept.name} department currently has no
                                divisions configured. All operations are managed
                                at the department level.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Tabbed Analytics Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/20 backdrop-blur border border-white/40">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-white/30 data-[state=active]:text-navy flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="metrics"
            className="data-[state=active]:bg-white/30 data-[state=active]:text-navy flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger
            value="compliance"
            className="data-[state=active]:bg-white/30 data-[state=active]:text-navy flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="data-[state=active]:bg-white/30 data-[state=active]:text-navy flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <BarChart
                    data={currentDepartmentData.budgetData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(3, 175, 191, 0.1)"
                    />
                    <XAxis dataKey="department" stroke="#524E4E" />
                    <YAxis stroke="#524E4E" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="budget" fill="#03AFBF" />
                    <Bar dataKey="spent" fill="#56B8FF" />
                  </BarChart>
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
                  <AreaChart
                    data={currentDepartmentData.expensesData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
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
                      stroke="#03AFBF"
                      fill="#03AFBF"
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
                  {currentDepartmentData.staffData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
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
                  {currentDepartmentData.contractTypesData.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="body-2 text-slate-700">
                          {item.type}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-white/20 backdrop-blur border border-white/40"
                          style={{ color: '#524E4E' }}
                        >
                          {item.count}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="text-center py-12">
            <h3 className="h3 text-navy mb-4">Metrics Dashboard</h3>
            <p className="body-1 text-light-200">
              Detailed metrics and KPI tracking will be displayed here.
            </p>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
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
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={currentDepartmentData.complianceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name ?? ''} ${(Number(percent || 0) * 100).toFixed(
                        0
                      )}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {currentDepartmentData.complianceData.map(
                      (entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      )
                    )}
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
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
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
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={currentDepartmentData.trendsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
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
                    stroke="#03AFBF"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="pending"
                    stroke="#56B8FF"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="expired"
                    stroke="#524E4E"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalyticsDashboard;
