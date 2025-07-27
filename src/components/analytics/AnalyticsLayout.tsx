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
  const config = departmentConfig[department as keyof typeof departmentConfig];
  const IconComponent = config?.icon || Building;

  if (!config) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Department Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The requested department analytics are not available.
          </p>
          <Link href="/analytics">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/analytics">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {config.name} Analytics
              </h1>
              <p className="text-gray-600">{config.description}</p>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          {department.toUpperCase()}
        </Badge>
      </div>

      {/* Quick Stats */}
      {departmentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Contracts
              </CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {departmentData.totalContracts || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Budget
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {departmentData.totalBudget || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Staff Count
              </CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {departmentData.staffCount || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Compliance Rate
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {departmentData.complianceRate || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Department Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={department} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              {Object.entries(departmentConfig).map(([key, dept]) => (
                <TabsTrigger key={key} value={key} asChild>
                  <Link href={dept.route} className="w-full">
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
