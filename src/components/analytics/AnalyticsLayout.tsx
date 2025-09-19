'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { mapDatabaseToRouteDivision } from '@/constants/navigation';

interface AnalyticsLayoutProps {
  division: string;
  children: React.ReactNode;
  divisionData?: {
    totalContracts?: number;
    totalBudget?: string;
    staffCount?: number;
    complianceRate?: string;
    trend?: 'up' | 'down';
    change?: string;
  };
}

const divisionConfig = {
  administration: {
    name: 'Enhanced Analytics Dashboard',
    description: 'Admin operations and performance metrics',
    icon: Building,
    color: 'bg-blue-500',
    route: '/analytics/admin',
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

// Separate mapping for tab names to keep them independent from main titles
const tabNames = {
  administration: 'Administration',
  'child-welfare': 'Child Welfare',
  'behavioral-health': 'Behavioral Health',
  cfs: 'CFS',
  residential: 'Residential',
  clinic: 'Clinic',
};

// Using mapDatabaseToRouteDivision from constants/navigation.ts

const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
  division,
  children,
  divisionData,
}) => {
  const { role, division: userDivision, loading } = useUserRole();
  const { stats: analyticsStats, isLoading: analyticsLoading } =
    useAnalyticsData(division);
  const config = divisionConfig[division as keyof typeof divisionConfig];

  // Check if user has access to this specific division
  const hasAccessToDivision = () => {
    if (loading) return false;

    const hasAccess = (() => {
      switch (role) {
        case 'executive':
          return true; // Executive can access all departments
        case 'admin':
          // Admin can access administration department
          return division === 'administration';
        case 'manager':
          // Manager can only access their specific department
          if (!userDivision) return false;
          const userRouteDivision = mapDatabaseToRouteDivision(userDivision);
          return division === userRouteDivision;
        default:
          return false;
      }
    })();

    return hasAccess;
  };

  // Get accessible divisions for navigation tabs based on user role
  const getAccessibleDivisions = () => {
    if (loading) return [];

    switch (role) {
      case 'executive':
        return Object.entries(divisionConfig);
      case 'admin':
        // Admin can see all divisions but only access administration
        return Object.entries(divisionConfig);
      case 'manager':
        // Manager can only see their specific department
        if (!userDivision) return [];
        const userRouteDivision = mapDatabaseToRouteDivision(userDivision);
        return Object.entries(divisionConfig).filter(
          ([key]) => key === userRouteDivision
        );
      default:
        return [];
    }
  };

  const accessibleDivisions = getAccessibleDivisions();

  if (loading || analyticsLoading) {
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
          <h1 className="h2 text-navy mb-4">Department Not Found</h1>
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
  if (!hasAccessToDivision()) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="h2 text-navy mb-4">Access Denied</h1>
          <p className="body-1 text-light-200 mb-6">
            You don&apos;t have permission to view analytics for this
            department.
          </p>

          <Link href="/analytics">
            <Button className="bg-white/20 backdrop-blur border text-slate-700 border-white/40 hover:bg-white/30 transition-all duration-300">
              <ArrowLeft className="h-4 w-4 mr-2 text-slate-700" />
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
      <div className="relative flex items-center justify-between">
        <Link href="/analytics">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/60 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 h1 sidebar-gradient-text text-center w-full pointer-events-none">
          {config.name}
        </h1>
      </div>
      <div className="flex items-center justify-center">
        <p className="body-1 text-light-200">{config.description}</p>
      </div>

      {/* Quick Stats */}
      {(divisionData || analyticsStats) && (
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
                {analyticsStats?.totalContracts ||
                  divisionData?.totalContracts ||
                  'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="body-2 text-slate-700">
                Total Budget
              </CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: '#03AFBF' }} />
            </CardHeader>
            <CardContent>
              <div className="h2 text-navy font-bold">
                {analyticsStats?.totalBudget ||
                  divisionData?.totalBudget ||
                  'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="body-2 text-slate-700">
                Staff Count
              </CardTitle>
              <Users className="h-4 w-4" style={{ color: '#56B8FF' }} />
            </CardHeader>
            <CardContent>
              <div className="h2 text-navy font-bold">
                {analyticsStats?.staffCount ||
                  divisionData?.staffCount ||
                  'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="body-2 text-slate-700">
                Compliance Rate
              </CardTitle>
              <BarChart3 className="h-4 w-4" style={{ color: '#8B5CF6' }} />
            </CardHeader>
            <CardContent>
              <div className="h2 text-navy font-bold">
                {analyticsStats?.complianceRate ||
                  divisionData?.complianceRate ||
                  'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Division Navigation */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h2 sidebar-gradient-text">
            Department Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={division} className="w-full">
            <TabsList className="flex w-full bg-white/20 backdrop-blur border border-white/40">
              {accessibleDivisions.map(([key, division]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  asChild
                  className="tabs-underline flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-navy"
                >
                  <Link href={division.route} className="w-full body-2">
                    {tabNames[key as keyof typeof tabNames] || division.name}
                  </Link>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={division} className="mt-6">
              {children}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsLayout;
