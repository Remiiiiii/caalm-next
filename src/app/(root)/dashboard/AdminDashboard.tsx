'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  Shield,
} from 'lucide-react';
import RecentActivity from '@/components/RecentActivity';
import { useAdminStats } from '@/hooks/useAdminStats';
import { StatCardSkeleton } from '@/components/ui/skeletons';

const AdminDashboard = () => {
  // Use the real-time admin stats hook
  const { stats, isLoading, error, refresh } = useAdminStats({
    enableRealTime: true,
    pollingInterval: 30000, // 30 seconds
  });

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSystemHealthIcon = (health: string) => {
    switch (health) {
      case 'good':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-8 w-8 text-red-600" />;
      default:
        return <Settings className="h-8 w-8 text-gray-600" />;
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Failed to load admin statistics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Total Users
                    </p>
                    <p className="text-2xl font-bold text-navy">
                      {stats.totalUsers}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-[#524E4E]" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Active Users
                    </p>
                    <p className="text-2xl font-bold text-navy">
                      {stats.activeUsers}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Pending Users
                    </p>
                    <p className="text-2xl font-bold text-navy">
                      {stats.pendingUsers}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-[#FF7474]" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      System Health
                    </p>
                    <p className="text-2xl font-bold text-navy">
                      {stats.systemHealth.toUpperCase()}
                    </p>
                  </div>
                  {getSystemHealthIcon(stats.systemHealth)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Overview */}
        <div className="lg:col-span-2">
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-center sidebar-gradient-text">
                  System Overview
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mb-2"></div>
                        <div className="animate-pulse bg-gray-200 h-3 w-24 rounded"></div>
                      </div>
                      <div className="animate-pulse bg-gray-200 h-6 w-16 rounded ml-4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* System Health Status */}
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getSystemHealthIcon(stats.systemHealth)}
                      <div>
                        <h3 className="font-semibold text-navy">
                          System Health
                        </h3>
                        <p className="text-sm text-slate-dark">
                          Overall system status and performance
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getSystemHealthColor(
                        stats.systemHealth
                      )}`}
                    >
                      {stats.systemHealth}
                    </span>
                  </div>

                  {/* Activity Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <h4 className="font-medium text-navy">
                          Total Activities
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-navy">
                        {stats.totalActivities}
                      </p>
                      <p className="text-sm text-slate-dark">
                        All time activities
                      </p>
                    </div>

                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-3 mb-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-navy">
                          Recent Activities
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-navy">
                        {stats.recentActivities}
                      </p>
                      <p className="text-sm text-slate-dark">Last 24 hours</p>
                    </div>
                  </div>

                  {/* User Distribution */}
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-medium text-navy mb-3">
                      User Distribution
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-dark">
                          Active Users
                        </span>
                        <span className="font-medium text-navy">
                          {stats.activeUsers} (
                          {stats.totalUsers > 0
                            ? Math.round(
                                (stats.activeUsers / stats.totalUsers) * 100
                              )
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-dark">
                          Pending Users
                        </span>
                        <span className="font-medium text-navy">
                          {stats.pendingUsers} (
                          {stats.totalUsers > 0
                            ? Math.round(
                                (stats.pendingUsers / stats.totalUsers) * 100
                              )
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${
                              stats.totalUsers > 0
                                ? (stats.activeUsers / stats.totalUsers) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <RecentActivity />

          {/* Quick Actions */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
                <Settings className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Logs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  System Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
                <AlertTriangle className="h-5 w-5 mr-2" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {stats.pendingUsers > 0 && (
                  <div className="flex items-start space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        {stats.pendingUsers} user(s) pending approval
                      </p>
                      <p className="text-xs text-yellow-600">
                        Review and approve new user registrations
                      </p>
                    </div>
                  </div>
                )}

                {stats.systemHealth === 'critical' && (
                  <div className="flex items-start space-x-2 p-2 bg-red-50 border border-red-200 rounded">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        System health critical
                      </p>
                      <p className="text-xs text-red-600">
                        Immediate attention required
                      </p>
                    </div>
                  </div>
                )}

                {stats.systemHealth === 'good' && stats.pendingUsers === 0 && (
                  <div className="flex items-start space-x-2 p-2 bg-green-50 border border-green-200 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        All systems operational
                      </p>
                      <p className="text-xs text-green-600">
                        No issues detected
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
