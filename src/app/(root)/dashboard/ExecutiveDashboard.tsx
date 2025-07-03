"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  createInvitation,
  listPendingInvitations,
  revokeInvitation,
} from "@/lib/actions/user.actions";

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
      title: "Total Contracts",
      value: "156",
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Expiring Soon",
      value: "12",
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "Active Users",
      value: "24",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Compliance Rate",
      value: "94%",
      icon: CheckCircle,
      color: "text-green-600",
    },
  ];

  const recentActivity = [
    {
      id: 1,
      action: "Contract renewal approved",
      contract: "Federal IT Services Contract",
      time: "2 hours ago",
    },
    {
      id: 2,
      action: "New user registration",
      user: "Alice Johnson - Accounting",
      time: "4 hours ago",
    },
    {
      id: 3,
      action: "Audit document uploaded",
      contract: "State Licensing Agreement",
      time: "6 hours ago",
    },
    {
      id: 4,
      action: "Deadline alert triggered",
      contract: "Municipal Services Contract",
      time: "1 day ago",
    },
  ];

  const pendingApprovals = [
    {
      id: 1,
      type: "User Registration",
      requester: "David Wilson - Operations",
      department: "Operations",
    },
    {
      id: 2,
      type: "Contract Proposal",
      title: "New Vendor Agreement",
      amount: "$125,000",
    },
    {
      id: 3,
      type: "Document Access",
      requester: "Emma Davis - Legal",
      resource: "Confidential Audit Files",
    },
  ];

  // Invitation management state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "Member",
  });
  const [loading, setLoading] = useState(false);
  const orgId = "TODO_ORG_ID"; // Replace with actual orgId from context or props
  const adminName = "Executive"; // Replace with actual admin name
  const [resendingToken, setResendingToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch pending invitations on mount
    const fetchInvites = async () => {
      const data = await listPendingInvitations({ orgId });
      // Map Document[] to Invitation[]
      setInvitations(data.map((inv: unknown) => inv as Invitation));
    };
    fetchInvites();
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
    setInviteForm({ name: "", email: "", role: "Member" });
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-navy">Executive Dashboard</h1>
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
                  <p className="text-3xl font-bold text-navy">{stat.value}</p>
                </div>
                <stat.icon
                  className={`h-8 w-8 ${stat.color.replace("text-", "text-")}`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
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
                    <p className="font-medium text-navy">{activity.action}</p>
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
                    <h4 className="font-medium text-navy">{approval.type}</h4>
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
              <option value="Member">Member</option>
              <option value="Manager">Manager</option>
              <option value="HR">HR</option>
            </select>
            <Button type="submit" disabled={loading}>
              {loading ? "Inviting..." : "Send Invite"}
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
                  <td colSpan={7} className="text-center text-slate-light py-4">
                    No pending invitations
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.$id}>
                    <td>{inv.name}</td>
                    <td>{inv.email}</td>
                    <td>{inv.role}</td>
                    <td>{new Date(inv.$createdAt).toLocaleDateString()}</td>
                    <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
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
                          ? "Resending..."
                          : "Resend"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveDashboard;
