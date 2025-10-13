'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  FileText,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Server,
  Database,
  Wifi,
  FileStack,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import RecentActivity from '@/components/RecentActivity';
import ContractExpiryAlertsWidget from '@/components/ContractExpiryAlertsWidget';
import WeatherWidget from '@/components/WeatherWidget';
import CompanyNewsFeed from '@/components/CompanyNewsFeed';
import ContractStatusPieChart from '@/components/ContractStatusPieChart';
import DepartmentPerformanceWidget from '@/components/DepartmentPerformanceWidget';
import QuickNotesWidget from '@/components/QuickNotesWidget';
import CalendarView from '@/components/CalendarView';
import Thumbnail from '@/components/Thumbnail';
import FormattedDateTime from '@/components/FormattedDateTime';
import Avatar from '@/components/ui/avatar';
import {
  SelectScrollable,
  SelectItem,
} from '@/components/ui/select-scrollable';
import { useToast } from '@/hooks/use-toast';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useUnifiedDashboardData } from '@/hooks/useUnifiedDashboardData';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  StatCardSkeleton,
  FileItemSkeleton,
  TableRowSkeleton,
} from '@/components/ui/skeletons';
import { Models } from 'node-appwrite';

const ClientDate = dynamic(() => import('@/components/ClientDate'), {
  ssr: false,
});

interface Invitation {
  $id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  status: string;
  revoked: boolean;
  $createdAt: string;
}

interface UninvitedUser {
  $id: string;
  email: string;
  fullName: string;
  $createdAt: string;
}

interface FileDocument {
  $id: string;
  $createdAt: string;
  type: string;
  name: string;
  url: string;
  extension: string;
  size?: number;
  owner?: string;
  accountId?: string;
  users?: string[];
  bucketFileId?: string;
}

interface AdminDashboardProps {
  user?:
    | (Models.User<Models.Preferences> & {
        $id: string;
        accountId?: string;
        fullName?: string;
        role?: string;
        division?: string;
      })
    | null;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  // Use the real-time admin stats hook
  const { stats, isLoading, error, refresh } = useAdminStats({
    enableRealTime: true,
    pollingInterval: 30000, // 30 seconds
  });

  const { orgId } = useOrganization();
  const {
    stats: unifiedStats,
    files,
    invitations,
    uninvitedUsers,
    isLoading: unifiedLoading,
    refresh: refreshUnified,
  } = useUnifiedDashboardData(orgId || 'default_organization');

  const { toast } = useToast();

  // Widget pagination state
  const widgetScrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const widgetsPerPage = 3;
  const widgetWidth = 240;
  const widgetGap = 16;
  const pageWidth =
    widgetsPerPage * widgetWidth + (widgetsPerPage - 1) * widgetGap;

  const scrollToPage = (pageNumber: number) => {
    if (widgetScrollRef.current) {
      const scrollAmount = pageNumber * pageWidth;
      widgetScrollRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth',
      });
      setCurrentPage(pageNumber);
    }
  };

  const scrollWidgets = (direction: 'left' | 'right') => {
    const newPage = direction === 'left' ? currentPage - 1 : currentPage + 1;
    if (newPage >= 0 && newPage <= 1) scrollToPage(newPage);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (widgetScrollRef.current) {
        const scrollLeft = widgetScrollRef.current.scrollLeft;
        const newPage = Math.round(scrollLeft / pageWidth);
        if (newPage !== currentPage && newPage >= 0 && newPage <= 1) {
          setCurrentPage(newPage);
        }
      }
    };
    const scrollContainer = widgetScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [currentPage, pageWidth]);

  // Invitation management
  const [inviteForm, setInviteForm] = useState({
    selectedUserId: '',
    role: '',
    department: '',
    division: '',
  });
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [resendingToken, setResendingToken] = useState<string | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeToken, setRevokeToken] = useState<string | null>(null);
  const [revokeEmail, setRevokeEmail] = useState<string | null>(null);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteToken, setDeleteToken] = useState<string | null>(null);
  const [deleteEmail, setDeleteEmail] = useState<string | null>(null);
  const [deletingToken, setDeletingToken] = useState<string | null>(null);
  const [removingInvitations, setRemovingInvitations] = useState<Set<string>>(
    new Set()
  );
  const [addingInvitations, setAddingInvitations] = useState<Set<string>>(
    new Set()
  );

  const createInvitation = async (invitationData: Record<string, unknown>) => {
    const response = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invitationData),
    });
    if (!response.ok) throw new Error('Failed to create invitation');
    const responseData = await response.json();
    await refreshUnified();
    return responseData.data;
  };

  const revokeInvitation = async (token: string) => {
    const response = await fetch(`/api/invitations/${token}/revoke`, {
      method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to revoke invitation');
    await refreshUnified();
  };

  const deleteInvitation = async (token: string) => {
    const response = await fetch(`/api/invitations/${token}/delete`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete invitation');
  };

  const handleRefreshUsers = async () => {
    setRefreshLoading(true);
    try {
      await refreshUnified();
      toast({
        title: 'Success',
        description: 'User list refreshed successfully',
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Failed to refresh user list',
        variant: 'destructive',
      });
    } finally {
      setRefreshLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user to invite',
        variant: 'destructive',
      });
      return;
    }

    setLoadingInvite(true);
    const selectedUser = (uninvitedUsers as UninvitedUser[]).find(
      (u) => u.$id === inviteForm.selectedUserId
    );
    if (!selectedUser) {
      toast({
        title: 'Error',
        description: 'Selected user not found',
        variant: 'destructive',
      });
      setLoadingInvite(false);
      return;
    }

    try {
      const tempToken = `temp_token_${Date.now()}`;
      setAddingInvitations((prev) => new Set(prev).add(tempToken));
      await createInvitation({
        email: selectedUser.email,
        name: selectedUser.fullName,
        role: inviteForm.role,
        department: inviteForm.department,
        division: inviteForm.division,
        orgId,
        invitedBy: 'Admin',
      });
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${selectedUser.fullName} (${selectedUser.email})`,
      });
      setInviteForm({
        selectedUserId: '',
        role: '',
        department: '',
        division: '',
      });
      setTimeout(() => {
        setAddingInvitations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(tempToken);
          return newSet;
        });
      }, 300);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleRevoke = async (token: string, email: string) => {
    setRevokeToken(token);
    setRevokeEmail(email);
    setShowRevokeDialog(true);
  };

  const cancelRevoke = () => {
    setShowRevokeDialog(false);
    setRevokeToken(null);
    setRevokeEmail(null);
  };

  const confirmRevoke = async () => {
    if (!revokeToken) return;
    try {
      setRevokingToken(revokeToken);
      setRemovingInvitations((prev) => new Set(prev).add(revokeToken));
      await revokeInvitation(revokeToken);
      toast({
        title: 'Invitation Revoked',
        description: 'The invitation has been successfully revoked.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to revoke invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setShowRevokeDialog(false);
      const token = revokeToken;
      setRevokeToken(null);
      setRevokeEmail(null);
      setRevokingToken(null);
      setTimeout(() => {
        setRemovingInvitations((prev) => {
          const newSet = new Set(prev);
          if (token) newSet.delete(token);
          return newSet;
        });
      }, 300);
    }
  };

  const handleDelete = async (token: string, email: string) => {
    setDeleteToken(token);
    setDeleteEmail(email);
    setShowDeleteDialog(true);
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteToken(null);
    setDeleteEmail(null);
  };

  const confirmDelete = async () => {
    if (!deleteToken) return;
    try {
      setDeletingToken(deleteToken);
      setRemovingInvitations((prev) => new Set(prev).add(deleteToken));
      const currentData = await refreshUnified();
      if (currentData?.data?.invitations) {
        const updatedInvitations = (
          currentData.data.invitations as Invitation[]
        ).filter((inv) => inv.token !== deleteToken);
        await refreshUnified(
          {
            ...currentData,
            data: { ...currentData.data, invitations: updatedInvitations },
          },
          { revalidate: false }
        );
      }
      toast({
        title: 'Invitation Deleted',
        description: 'The invitation has been permanently deleted.',
      });
      await deleteInvitation(deleteToken);
      await refreshUnified();
    } catch {
      await refreshUnified();
      toast({
        title: 'Error',
        description: 'Failed to delete invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      const token = deleteToken;
      setShowDeleteDialog(false);
      setDeleteToken(null);
      setDeleteEmail(null);
      setDeletingToken(null);
      setTimeout(() => {
        setRemovingInvitations((prev) => {
          const newSet = new Set(prev);
          if (token) newSet.delete(token);
          return newSet;
        });
      }, 300);
    }
  };

  const handleResend = async (token: string) => {
    setResendingToken(token);
    try {
      const response = await fetch(`/api/invitations/${token}/resend`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend invitation');
      }
      const result = await response.json();
      toast({ title: 'Success', description: result.message });
    } catch (err) {
      toast({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'Failed to resend invitation',
        variant: 'destructive',
      });
    } finally {
      setResendingToken(null);
    }
  };

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
      {/* Widget Carousel */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardContent className="p-3">
          <Button
            variant="outline"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm border-white/40 shadow-lg hover:bg-white/90"
            onClick={() => scrollWidgets('left')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm border-white/40 shadow-lg hover:bg-white/90"
            onClick={() => scrollWidgets('right')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div
            ref={widgetScrollRef}
            className="flex gap-4 overflow-x-hidden scrollbar-hide ml-10 px-1 py-2 rounded-lg"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              width: `${pageWidth}px`,
              maxWidth: `${pageWidth}px`,
            }}
          >
            <div className="flex gap-2 min-w-full">
              <WeatherWidget />
              <CompanyNewsFeed />
              <ContractStatusPieChart />
            </div>
            <div className="flex gap-2 min-w-full -ml-2">
              <DepartmentPerformanceWidget />
              <QuickNotesWidget user={user as any} />
              <ContractExpiryAlertsWidget
                maxVisible={2}
                showSettings={false}
                compact={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading || unifiedLoading ? (
          [1, 2, 3, 4].map((index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            {/* Total Contracts */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#5B93FF]">
                    Total Contracts
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-[#5B93FF]">
                      {unifiedStats.totalContracts}
                    </p>
                    <FileStack className="h-8 w-8 text-[#5B93FF]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expiring Soon */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#FF7474]">
                    Expiring Soon
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-[#FF7474]">
                      {unifiedStats.expiringContracts}
                    </p>
                    <AlertTriangle className="h-8 w-8 text-[#FF7474]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#5B93FF]">
                    Active Users
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-[#5B93FF]">
                      {unifiedStats.activeUsers}
                    </p>
                    <Users className="h-8 w-8 text-[#5B93FF]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Rate */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#3DD9B3]">
                    Compliance Rate
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-[#3DD9B3]">
                      {unifiedStats.complianceRate}
                    </p>
                    <CheckCircle className="h-8 w-8 text-[#3DD9B3]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid - Enhanced Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* System Overview - Takes 8 columns */}
        <div className="lg:col-span-8 space-y-6">
          {/* System Health & Performance */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-center sidebar-gradient-text">
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-4 py-4">
                  <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
                  <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* System Health Status */}
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getSystemHealthIcon(stats.systemHealth)}
                      <div>
                        <h3 className="font-semibold text-navy">
                          System Status
                        </h3>
                        <p className="text-sm text-slate-dark">
                          Overall system performance
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getSystemHealthColor(
                        stats.systemHealth
                      )}`}
                    >
                      {stats.systemHealth.toUpperCase()}
                    </span>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 font-medium">
                            UPTIME
                          </p>
                          <p className="text-lg font-bold text-blue-800">
                            99.9%
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 font-medium">
                            RESPONSE
                          </p>
                          <p className="text-lg font-bold text-green-800">
                            120ms
                          </p>
                        </div>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <RecentActivity />

          {/* Calendar */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardContent className="p-4">
              <CalendarView
                user={user as any}
                onEventCreate={() =>
                  toast({
                    title: 'Success',
                    description: 'Event created successfully!',
                  })
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Sidebar - Takes 4 columns */}
        <div className="lg:col-span-4 space-y-6">
          {/* Activity Overview */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
                <Activity className="h-5 w-5 mr-2" />
                Activity Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
                  <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Total Activities
                        </p>
                        <p className="text-xs text-blue-600">
                          All time activities
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-navy">
                      {stats.totalActivities}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Recent Activities
                        </p>
                        <p className="text-xs text-green-600">Last 24 hours</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-navy">
                      {stats.recentActivities}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Monitoring */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
                <Server className="h-5 w-5 mr-2" />
                System Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Database
                      </p>
                      <p className="text-xs text-blue-600">
                        Connection healthy
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Wifi className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        API Status
                      </p>
                      <p className="text-xs text-green-600">
                        All endpoints active
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Server className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Server Load
                      </p>
                      <p className="text-xs text-gray-600">Normal (45% CPU)</p>
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
                <Settings className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40 h-12"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </Button>
                <Button
                  variant="outline"
                  className="justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40 h-12"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </Button>
                <Button
                  variant="outline"
                  className="justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40 h-12"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Logs
                </Button>
                <Button
                  variant="outline"
                  className="justify-start bg-white/30 backdrop-blur border border-white/40 text-slate-700 hover:bg-white/40 h-12"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Reports
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
                  <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        {stats.pendingUsers} user(s) pending approval
                      </p>
                      <p className="text-xs text-yellow-600">
                        Review and approve new registrations
                      </p>
                    </div>
                  </div>
                )}

                {stats.systemHealth === 'critical' && (
                  <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
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
                  <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
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

          {/* Recent Files Uploaded */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg font-bold text-center sidebar-gradient-text">
                <FileText className="h-5 w-5 mr-2" />
                Recent Files Uploaded
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {unifiedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <FileItemSkeleton key={i} />
                  ))}
                </div>
              ) : files && (files as any[]).length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                  {(files as any[]).slice(0, 5).map((file: any) => {
                    const fileDoc = file as unknown as FileDocument;
                    return (
                      <div
                        key={fileDoc.$id}
                        className="flex items-center gap-2 p-3 border border-border rounded-lg"
                      >
                        <Thumbnail
                          type={fileDoc.type}
                          extension={fileDoc.extension}
                          url={fileDoc.url}
                        />
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <h4 className="font-medium text-navy truncate text-sm">
                            {fileDoc.name}
                          </h4>
                          <p className="text-xs text-slate-dark">
                            <FormattedDateTime
                              date={fileDoc.$createdAt as unknown as string}
                              className="text-xs text-slate-light"
                            />
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {(files as any[]).length > 5 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-slate-light">
                        +{(files as any[]).length - 5} more files
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-light text-sm py-4">
                  No files uploaded
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite New User to Caalm */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
            Invite New User to Caalm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleInviteSubmit}>
            <div className="flex flex-row gap-2 items-center justify-between">
              <SelectScrollable
                value={inviteForm.selectedUserId}
                onValueChange={(value) =>
                  setInviteForm({ ...inviteForm, selectedUserId: value })
                }
                placeholder="Select a user"
                className=" bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
              >
                {(uninvitedUsers as UninvitedUser[]).map((u) => (
                  <SelectItem key={u.$id} value={u.$id}>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.fullName} userId={u.$id} size="sm" />
                      <span>
                        {u.fullName} ({u.email})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectScrollable>
              <Button
                type="button"
                onClick={handleRefreshUsers}
                disabled={refreshLoading}
                className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    refreshLoading ? 'animate-spin' : ''
                  }`}
                />
                {refreshLoading ? 'Refreshing...' : 'Refresh User List'}
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              <SelectScrollable
                value={inviteForm.role}
                onValueChange={(value) =>
                  setInviteForm({ ...inviteForm, role: value })
                }
                placeholder="Select role"
                className="min-w-[80px] bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
              >
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectScrollable>

              <SelectScrollable
                value={inviteForm.department}
                onValueChange={(value) =>
                  setInviteForm({ ...inviteForm, department: value })
                }
                placeholder="Select department"
                className="min-w-[180px] bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
              >
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Administration">Administration</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Executive">Executive</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
              </SelectScrollable>

              <SelectScrollable
                value={inviteForm.division}
                onValueChange={(value) =>
                  setInviteForm({ ...inviteForm, division: value })
                }
                placeholder="Select division"
                className="min-w-[150px] bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
              >
                <SelectItem value="behavioral-health">
                  Behavioral Health
                </SelectItem>
                <SelectItem value="child-welfare">Child Welfare</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="c-suite">C-Suite</SelectItem>
                <SelectItem value="cfs">CFS</SelectItem>
                <SelectItem value="hr">Human Resources</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="help-desk">Help Desk</SelectItem>
                <SelectItem value="accounting">Accounting</SelectItem>
              </SelectScrollable>
            </div>

            <Button
              type="submit"
              disabled={
                loadingInvite ||
                (uninvitedUsers as UninvitedUser[]).length === 0
              }
              className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
            >
              {loadingInvite ? 'Inviting...' : 'Send Invite'}
            </Button>
            {(uninvitedUsers as UninvitedUser[]).length === 0 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                No users found in Auth database
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 text-center">
                <tr>
                  <th className="text-slate-700 text-center px-4 py-2">Name</th>
                  <th className="text-slate-700 text-center px-4 py-2">
                    Email
                  </th>
                  <th className="text-slate-700 text-center px-4 py-2">Role</th>
                  <th className="text-slate-700 text-center px-4 py-2">
                    Invited
                  </th>
                  <th className="text-slate-700 text-center px-4 py-2">
                    Expires
                  </th>
                  <th className="text-slate-700 text-center px-4 py-2">
                    Status
                  </th>
                  <th className="text-slate-700 text-center px-4 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {unifiedLoading ? (
                  [1, 2, 3].map((i) => <TableRowSkeleton key={i} columns={7} />)
                ) : (invitations as Invitation[]).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">
                      No pending invitations
                    </td>
                  </tr>
                ) : (
                  (invitations as Invitation[]).map((inv) => (
                    <tr
                      key={inv.$id}
                      className={`border-b text-center hover:bg-gray-50 transition-all duration-300 ${
                        removingInvitations.has(inv.token)
                          ? 'invitation-removing'
                          : addingInvitations.has(inv.token)
                          ? 'invitation-adding'
                          : ''
                      }`}
                    >
                      <td className="pl-2 ">{inv.name}</td>
                      <td>{inv.email}</td>
                      <td>
                        {(inv.role || '').charAt(0).toUpperCase() +
                          (inv.role || '').slice(1)}
                      </td>
                      <td>
                        <ClientDate dateString={inv.$createdAt} />
                      </td>
                      <td>
                        <ClientDate dateString={inv.expiresAt} />
                      </td>
                      <td>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            (inv.status || '').toLowerCase() === 'pending'
                              ? 'bg-[#fef6f0] text-[#ebc620]'
                              : (inv.status || '').toLowerCase() === 'revoked'
                              ? 'bg-[#fff1f1] text-[#fe8787]'
                              : (inv.status || '').toLowerCase() === 'accepted'
                              ? 'bg-[#ccf3e9] text-[#3dd9b3]'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevoke(inv.token, inv.email)}
                          disabled={revokingToken === inv.token}
                          className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
                        >
                          {revokingToken === inv.token
                            ? 'Revoking...'
                            : 'Revoke'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResend(inv.token)}
                          disabled={resendingToken === inv.token}
                          className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
                        >
                          {resendingToken === inv.token
                            ? 'Resending...'
                            : 'Resend'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDelete(inv.token, inv.email)}
                          disabled={deletingToken === inv.token}
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#f87774',
                          }}
                        >
                          {deletingToken === inv.token ? (
                            'Deleting...'
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
