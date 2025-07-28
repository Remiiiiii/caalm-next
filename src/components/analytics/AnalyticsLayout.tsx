'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Building,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/hooks/useUserRole';

interface AnalyticsLayoutProps {
  department: string;
  children: React.ReactNode;
  departmentData?: {
    totalContracts?: number;
    totalBudget?: string;
    staffCount?: number;
    complianceRate?: string;
    trend?: 'up' | 'down';
    change?: string;
  };
}

const departmentConfig = {
  administration: {
    name: 'Administration',
    description: 'Administrative operations and performance metrics',
    icon: Building,
    color: 'bg-blue-500',
    route: '/analytics/administration',
  },
  'child-welfare': {
    name: 'Child Welfare',
    description: 'Child welfare services and program metrics',
    icon: Users,
    color: 'bg-green-500',
    route: '/analytics/child-welfare',
  },
  'behavioral-health': {
    name: 'Behavioral Health',
    description: 'Behavioral health services and outcomes',
    icon: TrendingUp,
    color: 'bg-purple-500',
    route: '/analytics/behavioral-health',
  },
  cfs: {
    name: 'CFS',
    description: 'CFS program analytics and performance',
    icon: FileText,
    color: 'bg-orange-500',
    route: '/analytics/cfs',
  },
  residential: {
    name: 'Residential',
    description: 'Residential services and facility metrics',
    icon: Building,
    color: 'bg-red-500',
    route: '/analytics/residential',
  },
  clinic: {
    name: 'Clinic',
    description: 'Clinical services and patient outcomes',
    icon: BarChart3,
    color: 'bg-teal-500',
    route: '/analytics/clinic',
  },
};

const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
  department,
  children,
  departmentData,
}) => {
  const { role, loading } = useUserRole();
  const config = departmentConfig[department as keyof typeof departmentConfig];
  const IconComponent = config?.icon || Building;

  // Check if user has access to this specific department
  const hasAccessToDepartment = () => {
    if (loading) return false;

    const hasAccess = (() => {
      switch (role) {
        case 'executive':
          return true; // Executive can access all departments
        case 'admin':
          return department === 'administration'; // Admin can only access administration
        case 'manager':
          return department !== 'administration'; // Manager can access all except administration
        default:
          return false;
      }
    })();

    return hasAccess;
  };

  // Get accessible departments for navigation tabs based on user role
  const getAccessibleDepartments = () => {
    if (loading) return [];

    switch (role) {
      case 'executive':
        return Object.entries(departmentConfig);
      case 'admin':
        return Object.entries(departmentConfig).filter(
          ([key]) => key === 'administration'
        );
      case 'manager':
        return Object.entries(departmentConfig).filter(
          ([key]) => key !== 'administration'
        );
      default:
        return [];
    }
  };

  const accessibleDepartments = getAccessibleDepartments();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
          <div className="h-4 bg-white/20 rounded-xl w-1/2 mb-6"></div>
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

  if (!config) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="h2 text-dark-200 mb-4">Department Not Found</h1>
          <p className="body-1 text-light-200 mb-6">
            The requested department analytics are not available.
          </p>
          <Link href="/analytics">
            <Button className="bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if user has access to this department
  if (!hasAccessToDepartment()) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="h2 text-dark-200 mb-4">Access Denied</h1>
          <p className="body-1 text-light-200 mb-6">
            You don&apos;t have permission to view analytics for this
            department.
          </p>
          <Link href="/analytics">
            <Button className="bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/analytics">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${config.color} shadow-lg`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="h1 text-dark-200">{config.name} Analytics</h1>
              <p className="body-1 text-light-200">{config.description}</p>
            </div>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="text-sm bg-white/20 backdrop-blur border border-white/40"
        >
          {department.toUpperCase()}
        </Badge>
      </div>

      {/* Quick Stats */}
      {departmentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="body-2 text-light-200">
                Total Contracts
              </CardTitle>
              <FileText className="h-4 w-4 text-light-200" />
            </CardHeader>
            <CardContent>
              <div className="h3 text-dark-200 font-bold">
                {departmentData.totalContracts || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="body-2 text-light-200">
                Total Budget
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-light-200" />
            </CardHeader>
            <CardContent>
              <div className="h3 text-dark-200 font-bold">
                {departmentData.totalBudget || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="body-2 text-light-200">
                Staff Count
              </CardTitle>
              <Users className="h-4 w-4 text-light-200" />
            </CardHeader>
            <CardContent>
              <div className="h3 text-dark-200 font-bold">
                {departmentData.staffCount || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="body-2 text-light-200">
                Compliance Rate
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-light-200" />
            </CardHeader>
            <CardContent>
              <div className="h3 text-dark-200 font-bold">
                {departmentData.complianceRate || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department Navigation */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-dark-200">
            Department Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={department} className="w-full">
            <TabsList
              className={`grid w-full grid-cols-${accessibleDepartments.length} bg-white/20 backdrop-blur border border-white/40`}
            >
              {accessibleDepartments.map(([key, dept]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  asChild
                  className="data-[state=active]:bg-white/30 data-[state=active]:text-dark-200"
                >
                  <Link href={dept.route} className="w-full body-2">
                    {dept.name}
                  </Link>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={department} className="mt-6">
              {children}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsLayout;
