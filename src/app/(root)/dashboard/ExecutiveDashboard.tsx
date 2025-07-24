'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SelectScrollable,
  SelectItem,
} from '@/components/ui/select-scrollable';
import { Users, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  createInvitation,
  listPendingInvitations,
  revokeInvitation,
  getUninvitedUsers,
  getActiveUsersCount,
} from '@/lib/actions/user.actions';
import dynamic from 'next/dynamic';
import ActionDropdown from '@/components/ActionDropdown';
import FormattedDateTime from '@/components/FormattedDateTime';
import Thumbnail from '@/components/Thumbnail';
import CalendarView from '@/components/CalendarView';
import {
  getFiles,
  getTotalContractsCount,
  getExpiringContractsCount,
} from '@/lib/actions/file.actions';
import { Models } from 'node-appwrite';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ClientDate = dynamic(() => import('@/components/ClientDate'), {
  ssr: false,
});

// Add Invitation type
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

// Add UninvitedUser type
interface UninvitedUser {
  $id: string;
  email: string;
  fullName: string;
  $createdAt: string;
}

interface ExecutiveDashboardProps {
  user?:
    | (Models.User<Models.Preferences> & {
        $id: string;
        accountId?: string;
        fullName?: string;
        role?: string;
        department?: string;
      })
    | null;
}

const ExecutiveDashboard = ({ user }: ExecutiveDashboardProps) => {
  const [stats, setStats] = useState([
    {
      title: 'Total Contracts',
      value: '0',
      icon: FileText,
      color: 'text-[#524E4E]',
    },
    {
      title: 'Expiring Soon',
      value: '0',
      icon: AlertTriangle,
      color: 'text-[#FF7474]',
    },
    {
      title: 'Active Users',
      value: '0',
      icon: Users,
      color: 'text-[#56B8FF]',
    },
    {
      title: 'Compliance Rate',
      value: '94%',
      icon: CheckCircle,
      color: 'text-[#03AFBF]',
    },
  ]);

  const recentActivity = [
    {
      id: 1,
      action: 'Contract renewal approved',
      contract: 'Federal IT Services Contract',
      time: '2 hours ago',
    },
    {
      id: 2,
      action: 'New user registration',
      user: 'Alice Johnson - Accounting',
      time: '4 hours ago',
    },
    {
      id: 3,
      action: 'Audit document uploaded',
      contract: 'State Licensing Agreement',
      time: '6 hours ago',
    },
    {
      id: 4,
      action: 'Deadline alert triggered',
      contract: 'Municipal Services Contract',
      time: '1 day ago',
    },
  ];

  const pendingApprovals = [
    {
      id: 1,
      type: 'User Registration',
      requester: 'David Wilson - Operations',
      department: 'Operations',
    },
    {
      id: 2,
      type: 'Contract Proposal',
      title: 'New Vendor Agreement',
      amount: '$125,000',
    },
    {
      id: 3,
      type: 'Document Access',
      requester: 'Emma Davis - Legal',
      resource: 'Confidential Audit Files',
    },
  ];

  // Invitation management state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [uninvitedUsers, setUninvitedUsers] = useState<UninvitedUser[]>([]);
  const [inviteForm, setInviteForm] = useState({
    selectedUserId: '',
    role: '',
  });
  const [loading, setLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const orgId = 'TODO_ORG_ID'; // Replace with actual orgId from context or props
  const adminName = 'Executive'; // Replace with actual admin name
  const [resendingToken, setResendingToken] = useState<string | null>(null);

  // File usage and recent files state
  const [files, setFiles] = useState<Models.Document[] | null>(null);

  const refreshFiles = async () => {
    const filesRes = await getFiles({ types: [], limit: 10 });
    setFiles(filesRes.documents);
  };

  // Lightweight caching state
  const [cachedData, setCachedData] = useState<{
    stats: typeof stats;
    files: Models.Document[] | null;
    invitations: Invitation[];
    uninvitedUsers: UninvitedUser[];
    lastFetch: number;
  } | null>(null);

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const isFetchingRef = useRef(false);

  // Simple cache check
  const isCacheValid = () => {
    if (!cachedData) return false;
    return Date.now() - cachedData.lastFetch < CACHE_DURATION;
  };

  // Single optimized data fetch
  const fetchAllData = useCallback(
    async (forceRefresh = false) => {
      // Prevent multiple simultaneous calls
      if (isFetchingRef.current) return;

      // Use cached data if available and not expired
      if (!forceRefresh && isCacheValid() && cachedData) {
        setStats(cachedData.stats);
        setFiles(cachedData.files);
        setInvitations(cachedData.invitations);
        setUninvitedUsers(cachedData.uninvitedUsers);
        return;
      }

      isFetchingRef.current = true;

      // Set loading states
      setIsLoadingStats(true);
      setIsLoadingFiles(true);
      setIsLoadingInvitations(true);

      try {
        // Fetch all data in parallel
        const [
          totalContracts,
          expiringContracts,
          activeUsers,
          filesRes,
          invitationsData,
          uninvitedUsersData,
        ] = await Promise.all([
          getTotalContractsCount(),
          getExpiringContractsCount(),
          getActiveUsersCount(),
          getFiles({ types: [], limit: 10 }),
          listPendingInvitations({ orgId }),
          getUninvitedUsers(),
        ]);

        // Create new stats array without depending on current stats state
        const newStats = [
          {
            title: 'Total Contracts',
            value: totalContracts.toString(),
            icon: FileText,
            color: 'text-[#524E4E]',
          },
          {
            title: 'Expiring Soon',
            value: expiringContracts.toString(),
            icon: AlertTriangle,
            color: 'text-[#FF7474]',
          },
          {
            title: 'Active Users',
            value: activeUsers.toString(),
            icon: Users,
            color: 'text-[#56B8FF]',
          },
          {
            title: 'Compliance Rate',
            value: '95%',
            icon: CheckCircle,
            color: 'text-[#03AFBF]',
          },
        ];

        // Update all state
        setStats(newStats);
        setFiles(filesRes.documents);
        setInvitations(
          invitationsData.map((inv: unknown) => inv as Invitation)
        );
        setUninvitedUsers(uninvitedUsersData);

        // Cache the data
        setCachedData({
          stats: newStats,
          files: filesRes.documents,
          invitations: invitationsData.map((inv: unknown) => inv as Invitation),
          uninvitedUsers: uninvitedUsersData,
          lastFetch: Date.now(),
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoadingStats(false);
        setIsLoadingFiles(false);
        setIsLoadingInvitations(false);
        isFetchingRef.current = false;
      }
    },
    [orgId] // Only depend on orgId, not stats or cachedData
  );

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.selectedUserId) {
      alert('Please select a user to invite');
      return;
    }

    setLoading(true);

    // Find the selected user
    const selectedUser = uninvitedUsers.find(
      (u) => u.$id === inviteForm.selectedUserId
    );
    if (!selectedUser) {
      alert('Selected user not found');
      setLoading(false);
      return;
    }

    await createInvitation({
      email: selectedUser.email,
      name: selectedUser.fullName,
      role: inviteForm.role,
      orgId,
      invitedBy: adminName,
    });

    // Force refresh cache to get updated data
    await fetchAllData(true);
    setInviteForm({ selectedUserId: '', role: '' });
    setLoading(false);
  };

  const handleRevoke = async (token: string) => {
    await revokeInvitation({ token });
    // Force refresh cache to get updated data
    await fetchAllData(true);
  };

  const resendInvitation = async () => {
    // TODO: Implement actual email sending logic
    // For now, just simulate a delay
    return new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const handleResend = async (token: string) => {
    setResendingToken(token);
    await resendInvitation();
    setResendingToken(null);
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'executive':
        return 'Executive';
      case 'manager':
        return 'Manager';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  return (
    <div className="relative">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[-10] opacity-60 pointer-events-none"
      >
        <source src="/assets/video/wave.mp4" type="video/mp4" />
      </video>
      {/* Cache Status */}
      {cachedData && (
        <div className="flex justify-between items-end mb-4">
          <div className="h2 font-bold sidebar-gradient-text">
            {getRoleDisplay(user?.role || '')}
          </div>
          <div className="text-xs text-slate-500">
            Last updated: {new Date(cachedData.lastFetch).toLocaleTimeString()}
          </div>
        </div>
      )}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-slate-700">
              {user?.fullName || ''}{' '}
              <span className="text-lg text-slate-light">
                {`| ${user?.department || 'Unknown Department'}`}
              </span>
            </h1>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="bg-white/30 backdrop-blur border border-white/40 shadow-lg"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm  font-medium sidebar-gradient-text">
                    {stat.title}
                  </p>
                  <p className="flex items-center text-3xl font-bold text-slate-700 pt-2">
                    {isLoadingStats ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      stat.value
                    )}
                    <span className="inline-block ml-2 pb-1">
                      <stat.icon
                        className={`h-8 w-8 ${stat.color.replace(
                          'text-',
                          'text-'
                        )}`}
                      />
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dashboard Content */}
      <div className="relative z-10 py-8">
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex justify-between items-start border-b border-border pb-3 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-navy">
                          {activity.action}
                        </p>
                        <p className="text-sm text-slate-dark">
                          {activity.contract || activity.user}
                        </p>
                      </div>
                      <span className="text-xs text-slate-light">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Calendar View */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg lg:col-span-2">
              <CardContent className="p-6">
                <CalendarView
                  onEventClick={(event) => {
                    console.log('Event clicked:', event);
                    // TODO: Implement event details modal or navigation
                  }}
                  onDateSelect={(date) => {
                    console.log('Date selected:', date);
                    // TODO: Implement date-specific actions
                  }}
                  onEventCreate={(event) => {
                    console.log('New event created:', event);
                    // TODO: Implement event creation in backend
                    // For now, just show a success message
                    alert(`Event "${event.title}" created successfully!`);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Recent files uploaded and Pending Approvals */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent files uploaded */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardHeader>
                <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
                  Recent files uploaded
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingFiles ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="border border-border rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="animate-pulse bg-gray-200 h-10 w-10 rounded"></div>
                          <div className="flex-1">
                            <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mb-2"></div>
                            <div className="animate-pulse bg-gray-200 h-3 w-24 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : files && files.length > 0 ? (
                  <div className="space-y-4">
                    {files.map((file: Models.Document) => (
                      <div
                        key={file.$id}
                        className="border border-border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Thumbnail
                              type={file.type}
                              extension={file.extension}
                              url={file.url}
                            />
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <h4 className="font-medium text-navy truncate max-w-[200px]">
                                {file.name}
                              </h4>
                              <p className="text-sm text-slate-dark">
                                <FormattedDateTime
                                  date={file.$createdAt}
                                  className="text-xs text-slate-light"
                                />
                              </p>
                            </div>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            <ActionDropdown
                              file={file}
                              onStatusChange={refreshFiles}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-light">
                    No files uploaded
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Pending Approvals */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
              <CardHeader>
                <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="border border-border rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-navy">
                          {approval.type}
                        </h4>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                          >
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-dark">
                        {approval.requester || approval.title}
                      </p>
                      {approval.department && (
                        <p className="text-xs text-slate-light">
                          Department: {approval.department}
                        </p>
                      )}
                      {approval.amount && (
                        <p className="text-xs text-slate-light">
                          Amount: {approval.amount}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invitation Management Section */}
          <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
            <CardHeader>
              <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
                Invite User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col md:flex-row gap-4 items-center"
                onSubmit={handleInviteSubmit}
              >
                <SelectScrollable
                  value={inviteForm.selectedUserId}
                  onValueChange={(value) =>
                    setInviteForm({ ...inviteForm, selectedUserId: value })
                  }
                  placeholder="Select a user to invite"
                  className="min-w-[200px] bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
                >
                  {uninvitedUsers.map((user) => (
                    <SelectItem key={user.$id} value={user.$id}>
                      {user.fullName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectScrollable>
                <SelectScrollable
                  value={inviteForm.role}
                  onValueChange={(value) =>
                    setInviteForm({ ...inviteForm, role: value })
                  }
                  placeholder="Select role"
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
                >
                  <SelectItem value="executive">Executive</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectScrollable>
                <Button
                  type="submit"
                  disabled={loading || uninvitedUsers.length === 0}
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  {loading ? 'Inviting...' : 'Send Invite'}
                </Button>
              </form>
              {uninvitedUsers.length === 0 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  No users waiting for invitation
                </p>
              )}
            </CardContent>
          </Card>

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
                      <th className="text-slate-700 text-center px-4 py-2">
                        Name
                      </th>
                      <th className="text-slate-700 text-center px-4 py-2">
                        Email
                      </th>
                      <th className="text-slate-700 text-center px-4 py-2">
                        Role
                      </th>
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
                    {isLoadingInvitations ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8">
                          <div className="flex justify-center space-x-2">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className="animate-pulse bg-gray-200 h-4 w-16 rounded"
                              ></div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : invitations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-gray-400"
                        >
                          No pending invitations
                        </td>
                      </tr>
                    ) : (
                      invitations.map((inv) => (
                        <tr
                          key={inv.$id}
                          className="border-b text-center hover:bg-gray-50 transition"
                        >
                          <td className="pl-2 ">{inv.name}</td>
                          <td>{inv.email}</td>
                          <td>{inv.role}</td>
                          <td>
                            <ClientDate dateString={inv.$createdAt} />
                          </td>
                          <td>
                            <ClientDate dateString={inv.expiresAt} />
                          </td>
                          <td>
                            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-[#B3EBF2] text-[#12477D]">
                              {inv.status}
                            </span>
                          </td>
                          <td className="space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevoke(inv.token)}
                              className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
                            >
                              Revoke
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
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Edit User Modal */}
          <Dialog open={false} onOpenChange={() => {}}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Full Name</label>
                  <Input
                    name="fullName"
                    value=""
                    onChange={() => {}}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Department
                  </label>
                  <select
                    name="department"
                    value=""
                    onChange={() => {}}
                    className="w-full border rounded px-2 py-1"
                    required
                  >
                    <option value="">Select department</option>
                    <option value="childwelfare">Child Welfare</option>
                    <option value="behavioralhealth">Behavioral Health</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                    <option value="administration">Administration</option>
                    <option value="c-suite">C-Suite</option>
                    <option value="managerial">Managerial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Role</label>
                  <select
                    name="role"
                    value=""
                    onChange={() => {}}
                    className="w-full border rounded px-2 py-1"
                    required
                  >
                    <option value="executive">Executive</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {/* editError && (
                  <div className="text-red-600 text-sm">{editError}</div>
                ) */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {}}
                    disabled={false}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={false}>
                    {false ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                {false && (
                  <div className="text-center text-slate-500">
                    Saving changes...
                  </div>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
