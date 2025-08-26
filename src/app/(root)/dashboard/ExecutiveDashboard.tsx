'use client';

// In your dashboard page (e.g., src/app/(root)/dashboard/page.tsx)
// import { NotificationDemoButton } from '@/components/NotificationDemoButton';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SelectScrollable,
  SelectItem,
} from '@/components/ui/select-scrollable';
import { Users, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

import dynamic from 'next/dynamic';

import FormattedDateTime from '@/components/FormattedDateTime';
import Thumbnail from '@/components/Thumbnail';
import CalendarView from '@/components/CalendarView';
import RecentActivity from '@/components/RecentActivity';

import { Models } from 'node-appwrite';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useOrganization } from '@/contexts/OrganizationContext';
import Avatar from '@/components/ui/avatar';
import ClientTimestamp from '@/components/ClientTimestamp';
import ContractExpiryNotifier from '@/components/ContractExpiryNotifier';
import { databases } from '@/lib/appwrite/client';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

type NotifierContract = { id: string; name: string; expiryDate: string };

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

// Add File type
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

interface ExecutiveDashboardProps {
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

const ExecutiveDashboard = ({ user }: ExecutiveDashboardProps) => {
  const { toast } = useToast();
  const { orgId } = useOrganization();
  const adminName = 'Executive'; // Replace with actual admin name

  // Use SWR hook for dashboard data
  const {
    stats: dashboardStats,
    files,
    invitations,
    authUsers,
    statsLoading,
    filesLoading,
    invitationsLoading,
    createInvitation,
    revokeInvitation,
  } = useDashboardData(orgId || 'default_organization');

  // Transform dashboard stats to match component format
  const stats = [
    {
      title: 'Total Contracts',
      value: dashboardStats.totalContracts?.toString() || '0',
      icon: FileText,
      color: 'text-[#524E4E]',
    },
    {
      title: 'Expiring Soon',
      value: dashboardStats.expiringContracts?.toString() || '0',
      icon: AlertTriangle,
      color: 'text-[#FF7474]',
    },
    {
      title: 'Active Users',
      value: dashboardStats.activeUsers?.toString() || '0',
      icon: Users,
      color: 'text-[#56B8FF]',
    },
    {
      title: 'Compliance Rate',
      value: dashboardStats.complianceRate || '94%',
      icon: CheckCircle,
      color: 'text-[#03AFBF]',
    },
  ];

  const pendingApprovals = [
    {
      id: 1,
      type: 'User Registration',
      requester: 'David Wilson - Admin',
      division: 'Admin',
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
  const [inviteForm, setInviteForm] = useState({
    selectedUserId: '',
    role: '',
    division: '',
  });
  const [loading, setLoading] = useState(false);
  const [resendingToken, setResendingToken] = useState<string | null>(null);

  // Revoke confirmation dialog state
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeToken, setRevokeToken] = useState<string | null>(null);
  const [revokeEmail, setRevokeEmail] = useState<string | null>(null);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [removingInvitations, setRemovingInvitations] = useState<Set<string>>(
    new Set()
  );
  const [addingInvitations, setAddingInvitations] = useState<Set<string>>(
    new Set()
  );

  // SWR handles all data fetching automatically - no manual fetch needed

  // Contracts for expiry notifier
  const [expiryContracts, setExpiryContracts] = useState<NotifierContract[]>(
    []
  );
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.contractsCollectionId,
          [
            Query.isNotNull('contractExpiryDate'),
            Query.orderAsc('contractExpiryDate'),
            Query.limit(100),
          ]
        );
        if (!cancelled) {
          const items: NotifierContract[] = (res.documents || []).map(
            (raw: Record<string, unknown>) => {
              const id =
                typeof raw.$id === 'string' ? raw.$id : String(raw.$id ?? '');
              const nm =
                typeof raw.contractName === 'string'
                  ? raw.contractName
                  : typeof raw.name === 'string'
                  ? raw.name
                  : 'Contract';
              const exp =
                typeof raw.contractExpiryDate === 'string'
                  ? raw.contractExpiryDate
                  : String(raw.contractExpiryDate ?? '');
              return { id, name: nm, expiryDate: exp };
            }
          );
          setExpiryContracts(items);
        }
      } catch {
        // silent
      }
    };
    load();
    // re-check at midnight to keep notifier accurate without reloads
    const timer = setInterval(load, 12 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

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

    setLoading(true);

    // Find the selected user
    const selectedUser = authUsers.find(
      (u: UninvitedUser) => u.$id === inviteForm.selectedUserId
    );
    if (!selectedUser) {
      toast({
        title: 'Error',
        description: 'Selected user not found',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // Mark as adding for visual feedback
      const tempToken = `temp_token_${Date.now()}`;
      setAddingInvitations((prev) => new Set(prev).add(tempToken));

      await createInvitation({
        email: selectedUser.email,
        name: selectedUser.fullName,
        role: inviteForm.role,
        division: inviteForm.division,
        orgId,
        invitedBy: adminName,
      });

      // Success feedback
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${selectedUser.fullName} (${selectedUser.email})`,
      });

      // Reset form
      setInviteForm({ selectedUserId: '', role: '', division: '' });

      // Clear the adding state after animation
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
      setLoading(false);
    }
  };

  const handleRevoke = async (token: string, email: string) => {
    setRevokeToken(token);
    setRevokeEmail(email);
    setShowRevokeDialog(true);
  };

  const confirmRevoke = async () => {
    if (!revokeToken) return;

    try {
      // Add visual feedback - mark as revoking
      setRevokingToken(revokeToken);
      setRemovingInvitations((prev) => new Set(prev).add(revokeToken));

      await revokeInvitation(revokeToken);
      // SWR will automatically refresh the data

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
      setRevokeToken(null);
      setRevokeEmail(null);
      setRevokingToken(null);
      // Clear the removing state after a short delay to allow animation
      setTimeout(() => {
        setRemovingInvitations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(revokeToken!);
          return newSet;
        });
      }, 300);
    }
  };

  const cancelRevoke = () => {
    setShowRevokeDialog(false);
    setRevokeToken(null);
    setRevokeEmail(null);
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
  // const getDepartmentDisplay = (department: string) => {
  //   switch (department) {
  //     case 'childwelfare':
  //       return 'Child Welfare';
  //     case 'management':
  //       return 'Management';
  //     case 'admin':
  //       return 'Admin';
  //     case 'behavioralhealth':
  //       return 'Behavioral Health';
  //     case 'clinic':
  //       return 'Clinic';
  //     case 'residential':
  //       return 'Residential';
  //     case 'cins-fins-snap':
  //       return 'CFS';
  //     case 'c-suite':
  //       return 'C-Suite';
  //     default:
  //       return department;
  //   }
  // };

  return (
    <div className="relative">
      <ContractExpiryNotifier contracts={expiryContracts} />
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
      {/* Dashboard Header */}
      <div className="flex justify-between items-end mb-4">
        <div className="h2 font-bold sidebar-gradient-text">
          {getRoleDisplay(user?.role || '')}
        </div>
        <div className="text-xs text-slate-500">
          Last updated: <ClientTimestamp />
        </div>
      </div>
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-slate-700">
              {user?.fullName || ''}{' '}
              <span className="text-lg text-slate-light">
                {`| ${user?.division || 'Unknown Division'}`}
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
                  <div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : (
                      <span>{stat.value}</span>
                    )}
                    <span className="inline-block ml-2 pb-1">
                      <stat.icon
                        className={`h-8 w-8 ${stat.color.replace(
                          'text-',
                          'text-'
                        )}`}
                      />
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dashboard Content */}
      <div className="relative z-10 py-8">
        <div className="space-y-6">
          <div className="grid lg:grid-cols-6 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-3">
              <RecentActivity />
            </div>

            {/* Calendar View */}
            <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg lg:col-span-3">
              <CardContent className="p-4">
                <CalendarView
                  user={user}
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
                    // Event is now automatically saved to database
                    toast({
                      title: 'Success',
                      description: `Event "${event.title}" created successfully!`,
                    });
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
                  Recent Files Uploaded
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filesLoading ? (
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
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                    {files.slice(0, 10).map((file: Models.Document) => {
                      const fileDoc = file as unknown as FileDocument;
                      return (
                        <div
                          key={file.$id}
                          className="border border-border rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Thumbnail
                                type={fileDoc.type}
                                extension={fileDoc.extension}
                                url={fileDoc.url}
                              />
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <h4 className="font-medium text-navy truncate max-w-[200px]">
                                  {fileDoc.name}
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
                              {/* <ActionDropdown
                                file={file}
                                onStatusChange={refreshFiles}
                              /> */}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {files.length > 10 && (
                      <div className="text-center py-2">
                        <p className="text-xs text-slate-light">
                          +{files.length - 10} more files
                        </p>
                      </div>
                    )}
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
                      {approval.division && (
                        <p className="text-xs text-slate-light">
                          Division: {approval.division}
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
                Invite New User to Caalm
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
                  placeholder="Select a user 
                  "
                  className="min-w-[200px] bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
                >
                  {authUsers.map((user: UninvitedUser) => (
                    <SelectItem key={user.$id} value={user.$id}>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={user.fullName}
                          userId={user.$id}
                          size="sm"
                        />
                        <span>
                          {user.fullName} ({user.email})
                        </span>
                      </div>
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

                <SelectScrollable
                  value={inviteForm.division}
                  onValueChange={(value) =>
                    setInviteForm({ ...inviteForm, division: value })
                  }
                  placeholder="Select division"
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700"
                >
                  <SelectItem value="admin">Administration</SelectItem>
                  <SelectItem value="behavioralhealth">
                    Behavioral Health
                  </SelectItem>
                  <SelectItem value="c-suite">C-Suite</SelectItem>
                  <SelectItem value="cins-fins-snap">CFS</SelectItem>
                  <SelectItem value="childwelfare">Child Welfare</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  {/* <SelectItem value="management">Management</SelectItem> */}
                  <SelectItem value="residential">Residential</SelectItem>
                </SelectScrollable>
                <Button
                  type="submit"
                  disabled={loading || authUsers.length === 0}
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
                >
                  {loading ? 'Inviting...' : 'Send Invite'}
                </Button>
              </form>
              {authUsers.length === 0 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  No users found in Auth database
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
                    {invitationsLoading ? (
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
                      invitations.map((inv: Invitation) => (
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
                  <label className="block text-sm font-medium">Division</label>
                  <select
                    name="division"
                    value=""
                    onChange={() => {}}
                    className="w-full border rounded px-2 py-1"
                    required
                  >
                    <option value="">Select division</option>
                    <option value="childwelfare">Child Welfare</option>
                    <option value="behavioralhealth">Behavioral Health</option>
                    <option value="finance">Finance</option>
                    <option value="admin">Administration</option>
                    <option value="admin">Administration</option>
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

          {/* Enhanced Revoke Confirmation Dialog */}
          <AlertDialog
            open={showRevokeDialog}
            onOpenChange={setShowRevokeDialog}
          >
            <AlertDialogContent className="bg-[#F6F7FA] backdrop-blur border border-white/50 shadow-xl rounded-xl max-w-md mx-4">
              <AlertDialogHeader className="text-center pb-4">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <AlertDialogTitle className="text-xl sidebar-gradient-text">
                  Revoke this invitation?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-600 text-sm mt-2">
                  User won&apos;t be able to accept it afterward.
                </AlertDialogDescription>
                <div className="border border-b-0 border-slate-300 "></div>
              </AlertDialogHeader>

              <div className="px-6 pb-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  {revokeEmail && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">
                        Email:
                      </span>
                      <span className="text-sm text-slate-600">
                        {revokeEmail}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      Date:
                    </span>
                    <span className="text-sm text-slate-600">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 font-medium">
                    ⚠️ This action can&apos;t be undone
                  </p>
                </div>
              </div>
              <AlertDialogFooter className="flex-col sm:flex-row gap-3 px-6 pb-6">
                <AlertDialogCancel
                  onClick={cancelRevoke}
                  className="w-full sm:w-auto bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 transition-colors rounded-lg px-4 py-2 font-medium"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmRevoke}
                  className="w-full sm:w-auto bg-red-500/80 backdrop-blur border border-red-400/50 shadow-md text-slate-700 hover:bg-red-600/80 transition-colors rounded-lg px-4 py-2 font-medium"
                >
                  Revoke
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;

// Overlay notifier at root of dashboard
// Note: Place after export if using layout; otherwise render inside JSX above.
// Here we render inside the component tree at the top-level container.
