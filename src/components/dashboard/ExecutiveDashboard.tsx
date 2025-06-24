
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, AlertTriangle, CheckCircle, Calendar, TrendingUp } from 'lucide-react';

const ExecutiveDashboard = () => {
  const stats = [
    { title: 'Total Contracts', value: '156', icon: FileText, color: 'text-blue-600' },
    { title: 'Expiring Soon', value: '12', icon: AlertTriangle, color: 'text-red-600' },
    { title: 'Active Users', value: '24', icon: Users, color: 'text-green-600' },
    { title: 'Compliance Rate', value: '94%', icon: CheckCircle, color: 'text-green-600' }
  ];

  const recentActivity = [
    { id: 1, action: 'Contract renewal approved', contract: 'Federal IT Services Contract', time: '2 hours ago' },
    { id: 2, action: 'New user registration', user: 'Alice Johnson - Accounting', time: '4 hours ago' },
    { id: 3, action: 'Audit document uploaded', contract: 'State Licensing Agreement', time: '6 hours ago' },
    { id: 4, action: 'Deadline alert triggered', contract: 'Municipal Services Contract', time: '1 day ago' }
  ];

  const pendingApprovals = [
    { id: 1, type: 'User Registration', requester: 'David Wilson - Operations', department: 'Operations' },
    { id: 2, type: 'Contract Proposal', title: 'New Vendor Agreement', amount: '$125,000' },
    { id: 3, type: 'Document Access', requester: 'Emma Davis - Legal', resource: 'Confidential Audit Files' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Executive Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Review
          </Button>
          <Button>
            <TrendingUp className="mr-2 h-4 w-4" />
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
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
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
                <div key={activity.id} className="flex justify-between items-start border-b pb-3 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-600">{activity.contract || activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
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
                <div key={approval.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{approval.type}</h4>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">Deny</Button>
                      <Button size="sm">Approve</Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {approval.requester || approval.title}
                  </p>
                  {approval.department && (
                    <p className="text-xs text-gray-500">Department: {approval.department}</p>
                  )}
                  {approval.amount && (
                    <p className="text-xs text-gray-500">Amount: {approval.amount}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
