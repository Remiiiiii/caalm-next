'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chart } from '@/components/Chart';
import {
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  createInvitation,
  listPendingInvitations,
  revokeInvitation,
} from '@/lib/actions/user.actions';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import ActionDropdown from '@/components/ActionDropdown';
import FormattedDateTime from '@/components/FormattedDateTime';
import Thumbnail from '@/components/Thumbnail';
import { Separator } from '@/components/ui/separator';
import { getFiles, getTotalSpaceUsed } from '@/lib/actions/file.actions';
import { convertFileSize, getUsageSummary } from '@/lib/utils';
import { Models } from 'node-appwrite';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UserManagement from './UserManagement';

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

const ExecutiveDashboard = () => {
  const stats = [
    {
      title: 'Total Contracts',
      value: '156',
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Expiring Soon',
      value: '12',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      title: 'Active Users',
      value: '24',
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Compliance Rate',
      value: '94%',
      icon: CheckCircle,
      color: 'text-green-600',
    },
  ];

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
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'manager',
  });
  const [loading, setLoading] = useState(false);
  const orgId = 'TODO_ORG_ID'; // Replace with actual orgId from context or props
  const adminName = 'Executive'; // Replace with actual admin name
  const [resendingToken, setResendingToken] = useState<string | null>(null);

  // File usage and recent files state
  const [files, setFiles] = useState<Models.Document[] | null>(null);
  interface FileTypeSummary {
    size: number;
    latestDate: string;
  }
  interface TotalSpace {
    document: FileTypeSummary;
    image: FileTypeSummary;
    video: FileTypeSummary;
    audio: FileTypeSummary;
    other: FileTypeSummary;
    used: number;
    all: number;
  }
  const [totalSpace, setTotalSpace] = useState<TotalSpace | null>(null);

  const refreshFiles = async () => {
    const filesRes = await getFiles({ types: [], limit: 10 });
    setFiles(filesRes.documents);
  };

  // User management state
  useEffect(() => {
    // Fetch pending invitations on mount
    const fetchInvites = async () => {
      const data = await listPendingInvitations({ orgId });
      // Map Document[] to Invitation[]
      setInvitations(data.map((inv: unknown) => inv as Invitation));
    };
    fetchInvites();

    // Fetch files and usage data in parallel
    const fetchData = async () => {
      const [filesRes, totalSpaceRes] = await Promise.all([
        getFiles({ types: [], limit: 10 }),
        getTotalSpaceUsed(),
      ]);
      setFiles(filesRes.documents); // <-- Use .documents if that's the structure
      setTotalSpace(totalSpaceRes as TotalSpace);
    };
    fetchData();
  }, [orgId]);

  const handleInviteChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setInviteForm({ ...inviteForm, [e.target.name]: e.target.value });
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createInvitation({
      ...inviteForm,
      orgId,
      invitedBy: adminName,
    });
    // Refresh invitations
    const data = await listPendingInvitations({ orgId });
    setInvitations(data.map((inv: unknown) => inv as Invitation));
    setInviteForm({ name: '', email: '', role: 'executive' });
    setLoading(false);
  };

  const handleRevoke = async (token: string) => {
    await revokeInvitation({ token });
    const data = await listPendingInvitations({ orgId });
    setInvitations(data.map((inv: unknown) => inv as Invitation));
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
      {/* Dashboard Content */}
      <div className="relative z-10">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-navy">
              Executive Dashboard
            </h1>
            <div className="flex space-x-2">
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4 text-coral" />
                Schedule Review
              </Button>
              <Button>
                <TrendingUp className="mr-2 h-4 w-4 text-coral" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-dark">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-navy">
                        {stat.value}
                      </p>
                    </div>
                    <stat.icon
                      className={`h-8 w-8 ${stat.color.replace(
                        'text-',
                        'text-'
                      )}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* File Usage Overview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Usage Overview */}
            <section className="bg-white rounded-xl shadow p-6 flex flex-col">
              <div className="flex justify-center items-center mb-6">
                <Chart used={totalSpace?.used || 0} />
              </div>
              {/* Uploaded file type summaries */}
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {totalSpace &&
                  getUsageSummary(totalSpace).map((summary) => (
                    <Link
                      href={summary.url}
                      key={summary.title}
                      className="flex flex-col bg-slate-50 rounded-lg p-4 hover:shadow transition border border-border"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <Image
                          src={summary.icon}
                          width={40}
                          height={40}
                          alt="uploaded image"
                          className="rounded-full"
                        />
                        <h4 className="text-lg font-semibold text-navy">
                          {convertFileSize(summary.size) || 0}
                        </h4>
                      </div>
                      <h5 className="text-sm font-medium text-slate-dark mb-1">
                        {summary.title}
                      </h5>
                      <Separator className="bg-light-400 my-2" />
                      <FormattedDateTime
                        date={summary.latestDate}
                        className="text-center text-xs text-slate-light"
                      />
                    </Link>
                  ))}
              </ul>
            </section>

            {/* Recent files uploaded */}
            <section className="dashboard-recent-files">
              <h2 className="h3 xl:h2 text-light-100">Recent files uploaded</h2>
              {files && files.length > 0 ? (
                <ul className="mt-5 flex flex-col gap-5">
                  {files.map((file: Models.Document) => (
                    <Link
                      href={file.url}
                      target="_blank"
                      className="flex items-center gap-3"
                      key={file.$id}
                    >
                      <Thumbnail
                        type={file.type}
                        extension={file.extension}
                        url={file.url}
                      />
                      <div className="recent-file-details">
                        <div className="flex flex-col gap-1">
                          <p className="recent-file-name">{file.name}</p>
                          <FormattedDateTime
                            date={file.$createdAt}
                            className="caption"
                          />
                        </div>
                        <ActionDropdown
                          file={file}
                          onStatusChange={refreshFiles}
                        />
                      </div>
                    </Link>
                  ))}
                </ul>
              ) : (
                <p className="empty-list">No files uploaded</p>
              )}
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
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

            {/* Pending Approvals */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
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
                          <Button size="sm" variant="outline">
                            Deny
                          </Button>
                          <Button size="sm">Approve</Button>
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
          <Card>
            <CardHeader>
              <CardTitle>Invite User</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col md:flex-row gap-4 items-center"
                onSubmit={handleInviteSubmit}
              >
                <Input
                  name="name"
                  placeholder="Full Name"
                  value={inviteForm.name}
                  onChange={handleInviteChange}
                  required
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={inviteForm.email}
                  onChange={handleInviteChange}
                  required
                />
                <select
                  name="role"
                  value={inviteForm.role}
                  onChange={handleInviteChange}
                  className="border rounded px-2 py-1"
                >
                  <option value="executive">Executive</option>
                  <option value="manager">Manager</option>
                  <option value="hr">HR</option>
                </select>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Inviting...' : 'Send Invite'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Invited</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center text-slate-light py-4"
                      >
                        No pending invitations
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr key={inv.$id}>
                        <td>{inv.name}</td>
                        <td>{inv.email}</td>
                        <td>{inv.role}</td>
                        <td>
                          <ClientDate dateString={inv.$createdAt} />
                        </td>
                        <td>
                          <ClientDate dateString={inv.expiresAt} />
                        </td>
                        <td>{inv.status}</td>
                        <td className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevoke(inv.token)}
                          >
                            Revoke
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleResend(inv.token)}
                            disabled={resendingToken === inv.token}
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
            </CardContent>
          </Card>

          {/* User Management Table (Executive only) */}
          <UserManagement />

          {/* Edit User Modal */}
          <Dialog open={false} onOpenChange={() => {}}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <form onSubmit={() => {}} className="space-y-4">
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
                    <option value="hr">HR</option>
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
