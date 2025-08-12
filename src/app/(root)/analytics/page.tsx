'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReportsPage from '@/components/ReportsPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Building,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/hooks/useUserRole';

const AnalyticsPage = () => {
  const { role, department: userDepartment, loading } = useUserRole();
  const router = useRouter();

  // Map database department values to route department values
  const mapDatabaseToRouteDepartment = (dbDepartment: string): string => {
    const mapping: Record<string, string> = {
      childwelfare: 'child-welfare',
      behavioralhealth: 'behavioral-health',
      'cins-fins-snap': 'cfs',
      administration: 'administration',
      residential: 'residential',
      clinic: 'clinic',
    };
    return mapping[dbDepartment] || dbDepartment;
  };

  // Redirect managers and admins to their department page
  useEffect(() => {
    if (!loading && role && userDepartment) {
      if (role === 'manager') {
        const routeDepartment = mapDatabaseToRouteDepartment(userDepartment);
        router.replace(`/analytics/${routeDepartment}`);
      } else if (role === 'admin') {
        router.replace('/analytics/administration');
      }
    }
  }, [loading, role, userDepartment, router]);

  // Show loading while redirecting
  if (loading || (role === 'manager' && userDepartment) || role === 'admin') {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
          <div className="h-4 bg-white/20 rounded-xl w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 bg-white/20 rounded-xl backdrop-blur"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Only executives should see this page
  if (role !== 'executive') {
    return null;
  }

  const allDepartments = [
    {
      id: 'child-welfare',
      name: 'Child Welfare',
      description: 'Child welfare services and program metrics',
      icon: Users,
      color: 'bg-green-500',
      route: '/analytics/child-welfare',
      stats: {
        contracts: 234,
        budget: '$2.8M',
        staff: 156,
        compliance: '92%',
      },
    },
    {
      id: 'behavioral-health',
      name: 'Behavioral Health',
      description: 'Behavioral health services and outcomes',
      icon: TrendingUp,
      color: 'bg-purple-500',
      route: '/analytics/behavioral-health',
      stats: {
        contracts: 189,
        budget: '$2.1M',
        staff: 134,
        compliance: '88%',
      },
    },
    {
      id: 'cfs',
      name: 'CFS',
      description: 'CFS program analytics and performance',
      icon: FileText,
      color: 'bg-orange-500',
      route: '/analytics/cfs',
      stats: {
        contracts: 145,
        budget: '$1.6M',
        staff: 98,
        compliance: '91%',
      },
    },
    {
      id: 'residential',
      name: 'Residential',
      description: 'Residential services and facility metrics',
      icon: Building,
      color: 'bg-red-500',
      route: '/analytics/residential',
      stats: {
        contracts: 167,
        budget: '$2.3M',
        staff: 112,
        compliance: '87%',
      },
    },
    {
      id: 'clinic',
      name: 'Clinic',
      description: 'Clinical services and patient outcomes',
      icon: BarChart3,
      color: 'bg-teal-500',
      route: '/analytics/clinic',
      stats: {
        contracts: 198,
        budget: '$2.5M',
        staff: 145,
        compliance: '94%',
      },
    },
    {
      id: 'administration',
      name: 'Administration',
      description: 'Administrative operations and performance metrics',
      icon: Building,
      color: 'bg-blue-500',
      route: '/analytics/administration',
      stats: {
        contracts: 156,
        budget: '$1.9M',
        staff: 89,
        compliance: '85%',
      },
    },
  ];

  // For executives, show all departments
  const departments = allDepartments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="h1 text-dark-200 mb-2">Reports & Analytics</h1>
        <p className="body-1 text-slate-700">
          Comprehensive analytics and reporting for all departments
        </p>
      </div>

      {/* Department Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {departments.map((dept) => {
          const IconComponent = dept.icon;
          return (
            <Card
              key={dept.id}
              className="bg-white/30 backdrop-blur border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-xl ${dept.color} shadow-lg`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="h4 text-dark-200">
                        {dept.name}
                      </CardTitle>
                      <p className="body-2 text-slate-700 mt-1">
                        {dept.description}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-white/20 rounded-lg backdrop-blur">
                    <div className="h3 text-dark-200 font-bold">
                      {dept.stats.contracts}
                    </div>
                    <div className="caption text-slate-700">Contracts</div>
                  </div>
                  <div className="text-center p-3 bg-white/20 rounded-lg backdrop-blur">
                    <div className="h3 text-dark-200 font-bold">
                      {dept.stats.budget}
                    </div>
                    <div className="caption text-slate-700">Budget</div>
                  </div>
                  <div className="text-center p-3 bg-white/20 rounded-lg backdrop-blur">
                    <div className="h3 text-dark-200 font-bold">
                      {dept.stats.staff}
                    </div>
                    <div className="caption text-slate-700">Staff</div>
                  </div>
                  <div className="text-center p-3 bg-white/20 rounded-lg backdrop-blur">
                    <div className="h3 text-dark-200 font-bold">
                      {dept.stats.compliance}
                    </div>
                    <div className="caption text-slate-700">Compliance</div>
                  </div>
                </div>
                <Link href={dept.route}>
                  <Button
                    className="w-full bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
                    variant="outline"
                  >
                    <span className="body-2">View Analytics</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reports Section */}
      <div className="border-t border-white/20 pt-6">
        <h2 className="h2 text-dark-200 mb-6">Generated Reports</h2>
        <div className="bg-white/30 backdrop-blur border border-white/40 rounded-xl shadow-lg">
          <ReportsPage />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
