'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  AlertCircle,
  Clock,
  Upload,
  MessageSquare,
} from 'lucide-react';
import RecentActivity from '@/components/RecentActivity';
import { useManagerContracts } from '@/hooks/useManagerContracts';

const ManagerDashboard = () => {
  // Use the real-time manager contracts hook
  const { contracts, isLoading, error, refresh } = useManagerContracts({
    enableRealTime: true,
    pollingInterval: 20000, // 20 seconds
  });

  const upcomingTasks = [
    {
      id: 1,
      task: 'Submit Q3 compliance report',
      deadline: '2024-07-25',
      priority: 'high',
    },
    {
      id: 2,
      task: 'Review vendor performance metrics',
      deadline: '2024-07-28',
      priority: 'medium',
    },
    {
      id: 3,
      task: 'Update training records',
      deadline: '2024-08-02',
      priority: 'low',
    },
    {
      id: 4,
      task: 'Prepare contract renewal documentation',
      deadline: '2024-08-15',
      priority: 'high',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'expired':
        return 'text-red-600 bg-red-100';
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Failed to load contracts</p>
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
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Contracts
                </p>
                <p className="text-2xl font-bold text-navy">
                  {isLoading ? '...' : contracts.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-[#524E4E]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Expiring Soon
                </p>
                <p className="text-2xl font-bold text-navy">
                  {isLoading
                    ? '...'
                    : contracts.filter((c) => c.status === 'expired').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-[#FF7474]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Pending Reviews
                </p>
                <p className="text-2xl font-bold text-navy">
                  {isLoading
                    ? '...'
                    : contracts.filter((c) => c.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-[#56B8FF]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Active Contracts
                </p>
                <p className="text-2xl font-bold text-navy">
                  {isLoading
                    ? '...'
                    : contracts.filter((c) => c.status === 'active').length}
                </p>
              </div>
              <Upload className="h-8 w-8 text-[#DB83ED]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contracts List */}
        <div className="lg:col-span-2">
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-center sidebar-gradient-text">
                  My Contracts
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3 py-4">
                  {[...Array(5)].map((_, i) => (
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
              ) : contracts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No contracts assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.$id}
                      className="flex justify-between items-center p-4 border border-border rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-navy text-sm">
                          {contract.contractName}
                        </h3>
                        <p className="text-xs text-slate-dark">
                          Expires:{' '}
                          {contract.contractExpiryDate || 'No expiry date'}
                        </p>
                        {contract.amount && (
                          <p className="text-xs text-slate-dark">
                            Amount: ${contract.amount.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            contract.status || 'pending'
                          )}`}
                        >
                          {contract.status || 'pending'}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            console.log('View contract:', contract.$id)
                          }
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <RecentActivity />

          {/* Upcoming Tasks */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
                <Clock className="h-5 w-5 mr-2" />
                Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex justify-between items-start border-b border-border pb-2 last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-navy text-sm">
                        {task.task}
                      </p>
                      <p className="text-xs text-slate-dark">
                        Due: {task.deadline}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
                <MessageSquare className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Contract
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  View Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
