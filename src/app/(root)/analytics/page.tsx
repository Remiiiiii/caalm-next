'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportsPage from '@/components/ReportsPage';
import EnhancedAnalyticsDashboard from '@/components/analytics/EnhancedAnalyticsDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  Building2,
  Monitor,
  DollarSign,
  Users,
  Scale,
  TrendingUp,
  Megaphone,
  Crown,
  Wrench,
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const AnalyticsPage = () => {
  const { role, division: userDivision, loading } = useUserRole();
  const router = useRouter();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('IT');
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Debounced refresh function to prevent flickering
  const debouncedRefresh = React.useCallback(() => {
    if (!isRefreshing) {
      setIsRefreshing(true);
      setCacheBuster(Date.now());
      router.refresh();

      // Reset refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [router, isRefreshing]);

  // Map database division values to route division values
  const mapDatabaseToRouteDivision = (dbDivision: string): string => {
    const mapping: Record<string, string> = {
      childwelfare: 'child-welfare',
      behavioralhealth: 'behavioral-health',
      'cins-fins-snap': 'cfs',
      administration: 'administration',
      residential: 'residential',
      clinic: 'clinic',
    };
    return mapping[dbDivision] || dbDivision;
  };

  // Redirect managers and admins to their division page
  useEffect(() => {
    if (!loading && role && userDivision) {
      if (role === 'manager') {
        const routeDivision = mapDatabaseToRouteDivision(userDivision);
        router.replace(`/analytics/${routeDivision}`);
      } else if (role === 'admin') {
        router.replace('/analytics/administration');
      }
    }
  }, [loading, role, userDivision, router]);

  // Force refresh data when component mounts or when returning to page
  useEffect(() => {
    const handleFocus = () => {
      debouncedRefresh();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        debouncedRefresh();
      }
    };

    // Listen for file changes in development
    const handleBeforeUnload = () => {
      setCacheBuster(Date.now());
    };

    // Refresh on window focus
    window.addEventListener('focus', handleFocus);
    // Refresh when tab becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Refresh before page unload (for development hot reload)
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial refresh with timestamp
    const timestamp = Date.now();
    setCacheBuster(timestamp);
    router.refresh();

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router, debouncedRefresh]);

  // Show loading while redirecting
  if (loading || (role === 'manager' && userDivision) || role === 'admin') {
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

  // Department configuration with their divisions
  const departmentConfig = {
    IT: {
      name: 'IT',
      icon: Monitor,
      color: 'bg-blue',
      divisions: [
        {
          id: 'support',
          name: 'Support',
          description: 'IT support and help desk services',
          icon: BarChart3,
          color: 'bg-blue',
          route: '/analytics/support',
          stats: {
            contracts: 45,
            budget: '$1.2M',
            staff: 23,
            compliance: '95%',
          },
        },
        {
          id: 'help-desk',
          name: 'Help Desk',
          description: 'Technical support and user assistance',
          icon: BarChart3,
          color: 'bg-blue',
          route: '/analytics/help-desk',
          stats: {
            contracts: 32,
            budget: '$800K',
            staff: 18,
            compliance: '92%',
          },
        },
      ],
    },
    Finance: {
      name: 'Finance',
      icon: DollarSign,
      color: 'bg-green',
      divisions: [],
    },
    HR: {
      name: 'HR',
      icon: Users,
      color: 'bg-purple-500',
      divisions: [
        {
          id: 'administration',
          name: 'Administration',
          description: 'Human resources administration',
          icon: BarChart3,
          color: 'bg-purple-500',
          route: '/analytics/administration',
          stats: {
            contracts: 156,
            budget: '$1.9M',
            staff: 89,
            compliance: '85%',
          },
        },
      ],
    },
    Legal: {
      name: 'Legal',
      icon: Scale,
      color: 'bg-indigo-500',
      divisions: [],
    },
    Operations: {
      name: 'Operations',
      icon: Building2,
      color: 'bg-orange',
      divisions: [
        {
          id: 'child-welfare',
          name: 'Child Welfare',
          description: 'Child welfare services and program metrics',
          icon: BarChart3,
          color: 'bg-orange',
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
          icon: BarChart3,
          color: 'bg-orange',
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
          icon: BarChart3,
          color: 'bg-orange',
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
          icon: BarChart3,
          color: 'bg-orange',
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
          color: 'bg-orange',
          route: '/analytics/clinic',
          stats: {
            contracts: 198,
            budget: '$2.5M',
            staff: 145,
            compliance: '94%',
          },
        },
      ],
    },
    Sales: {
      name: 'Sales',
      icon: TrendingUp,
      color: 'bg-red',
      divisions: [],
    },
    Marketing: {
      name: 'Marketing',
      icon: Megaphone,
      color: 'bg-pink',
      divisions: [],
    },
    Executive: {
      name: 'Executive',
      icon: Crown,
      color: 'bg-yellow-500',
      divisions: [],
    },
    Engineering: {
      name: 'Engineering',
      icon: Wrench,
      color: 'bg-teal-500',
      divisions: [],
    },
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setSelectedDepartment(value);
  };

  return (
    <div className="space-y-6" key={`analytics-${cacheBuster}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="h1 sidebar-gradient-text mb-2">Reports & Analytics</h1>
        <p className="body-1 text-slate-700">
          Comprehensive analytics and reporting for all departments
        </p>
        {/* Development timestamp for cache busting */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
            <span>
              Last updated: {new Date(cacheBuster).toLocaleTimeString()}
            </span>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-blue-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Refreshing...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Department Navigation Tabs */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h2 sidebar-gradient-text">
            Department Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedDepartment}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="flex w-full bg-white/20 backdrop-blur border border-white/40">
              {Object.entries(departmentConfig).map(([key, department]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="tabs-underline flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-dark-200"
                >
                  {department.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab Content for each department */}
            {Object.entries(departmentConfig).map(([key, department]) => (
              <TabsContent key={key} value={key} className="mt-6">
                <div className="space-y-6">
                  {/* Department Header */}
                  <div className="flex items-center space-x-3 mb-6">
                    <div
                      className={`p-3 rounded-xl ${department.color} shadow-lg`}
                    >
                      <department.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="h2 text-dark-200">{department.name}</h2>
                      <p className="body-1 text-slate-700">
                        {department.divisions.length} division
                        {department.divisions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Division Cards Grid */}
                  {department.divisions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                      {department.divisions.map((division) => {
                        const IconComponent = division.icon;
                        return (
                          <Card
                            key={division.id}
                            className="bg-white/95 backdrop-blur border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-xl overflow-hidden"
                          >
                            <CardHeader className="pb-4 px-6 pt-6">
                              <div className="flex items-start space-x-4">
                                <div
                                  className={`p-3 rounded-lg ${division.color} shadow-md flex-shrink-0`}
                                >
                                  <IconComponent className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-xl font-bold text-gray-800 mb-1 truncate">
                                    {division.name}
                                  </CardTitle>
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {division.description}
                                  </p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 px-6 pb-6">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center">
                                  <div className="text-xl font-bold text-gray-800 mb-1">
                                    {division.stats.contracts}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Contracts
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center">
                                  <div className="text-xl font-bold text-gray-800 mb-1">
                                    {division.stats.budget}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Budget
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center">
                                  <div className="text-xl font-bold text-gray-800 mb-1">
                                    {division.stats.staff}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Staff
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center">
                                  <div className="text-xl font-bold text-gray-800 mb-1">
                                    {division.stats.compliance}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Compliance
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    /* No divisions message */
                    <div className="text-center py-12">
                      <div className="mb-4">
                        <department.icon className="h-16 w-16 text-slate-400 mx-auto" />
                      </div>
                      <h3 className="h3 text-dark-200 mb-2">
                        No Divisions Available
                      </h3>
                      <p className="body-1 text-slate-700 mb-4">
                        There are currently no divisions or metrics available
                        for the {department.name} department.
                      </p>
                      <p className="body-2 text-slate-600">
                        Please check back later or contact your administrator
                        for more information.
                      </p>
                    </div>
                  )}

                  {/* Enhanced Analytics Dashboard for this department */}
                  {department.divisions.length > 0 && (
                    <div className="border-t border-white/20 pt-6">
                      <h3 className="h3 sidebar-gradient-text mb-6">
                        {department.name} Analytics
                      </h3>
                      <div className="bg-white/30 backdrop-blur border border-white/40 rounded-xl shadow-lg p-6">
                        <EnhancedAnalyticsDashboard
                          userRole={role}
                          key={cacheBuster}
                        />
                      </div>
                    </div>
                  )}

                  {/* Reports Section for this department */}
                  {department.divisions.length > 0 && (
                    <div className="border-t border-white/20 pt-6">
                      <h3 className="h3 sidebar-gradient-text mb-6">
                        {department.name} Reports
                      </h3>
                      <div className="bg-white/30 backdrop-blur border border-white/40 rounded-xl shadow-lg">
                        <ReportsPage key={cacheBuster} />
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
