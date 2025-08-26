import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  FileCheck,
  Bell,
  Upload,
  UserPlus,
} from 'lucide-react';
import RecentActivity from '@/components/RecentActivity';

const HRDashboard = () => {
  const trainingStats = [
    {
      title: 'Active Employees',
      value: '187',
      icon: Users,
      color: 'text-blue',
    },
    {
      title: 'Training Completed',
      value: '94%',
      icon: GraduationCap,
      color: 'text-green',
    },
    {
      title: 'Certifications Due',
      value: '23',
      icon: FileCheck,
      color: 'text-orange',
    },
    {
      title: 'Compliance Alerts',
      value: '5',
      icon: Bell,
      color: 'text-coral',
    },
  ];

  const employeeTraining = [
    {
      id: 1,
      employee: 'John Smith',
      department: 'IT',
      certification: 'Security Clearance',
      status: 'expired',
      dueDate: '2024-06-15',
      contractRequirement: 'Federal IT Services Contract',
    },
    {
      id: 2,
      employee: 'Mary Johnson',
      department: 'Operations',
      certification: 'Safety Training',
      status: 'due-soon',
      dueDate: '2024-08-10',
      contractRequirement: 'Municipal Services Contract',
    },
    {
      id: 3,
      employee: 'Robert Davis',
      department: 'Finance',
      certification: 'Financial Compliance',
      status: 'current',
      dueDate: '2025-01-15',
      contractRequirement: 'State Audit Requirements',
    },
    {
      id: 4,
      employee: 'John Doe',
      department: 'HR',
      certification: 'HR Compliance',
      status: 'current',
      dueDate: '2025-09-15',
      contractRequirement: 'Staff Training Audit Requirements',
    },
    {
      id: 5,
      employee: 'Jane Doe',
      department: 'Legal',
      certification: 'Legal Compliance',
      status: 'current',
      dueDate: '2025-12-15',
      contractRequirement: 'State Legal Requirements',
    },
    {
      id: 6,
      employee: 'Rhiannon Smith',
      department: 'Sales',
      certification: 'Sales Training',
      status: 'due-soon',
      dueDate: '2025-09-05',
      contractRequirement: 'Sales Training Requirements',
    },
    {
      id: 7,
      employee: 'Gabriel Torres',
      department: 'Marketing',
      certification: 'Marketing Training',
      status: 'current',
      dueDate: '2026-09-15',
      contractRequirement: 'Marketing Training Requirements',
    },
    {
      id: 8,
      employee: 'Hannah Cumberbatch',
      department: 'Engineering',
      certification: 'Engineering Training',
      status: 'current',
      dueDate: '2026-01-17',
      contractRequirement: 'Engineering Training Requirements',
    },
  ];

  const pendingDocuments = [
    {
      id: 1,
      type: 'Training Certificate',
      employee: 'Alice Wilson',
      uploaded: '2 hours ago',
    },
    {
      id: 2,
      type: 'Background Check',
      employee: 'David Brown',
      uploaded: '1 day ago',
    },
    {
      id: 3,
      type: 'License Renewal',
      employee: 'Sarah Miller',
      uploaded: '3 days ago',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'text-green bg-accent-green';
      case 'due-soon':
        return 'text-orange bg-accent-orange';
      case 'expired':
        return 'text-coral bg-coral/10';
      default:
        return 'text-slate-dark bg-background';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-navy">Admin Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="default">
            <UserPlus className="mr-2 h-4 w-4 text-coral" />
            Add Employee
          </Button>
          <Button>
            <Upload className="mr-2 h-4 w-4 text-coral" />
            Upload Training Record
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {trainingStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-dark">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-navy">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Employee Training Status */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Training & Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeeTraining.map((record) => (
                <div
                  key={record.id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-navy">
                        {record.employee}
                      </h4>
                      <p className="text-sm text-slate-dark">
                        {record.department}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {record.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-slate-dark space-y-1">
                    <p>
                      <strong>Certification:</strong> {record.certification}
                    </p>
                    <p>
                      <strong>Due Date:</strong> {record.dueDate}
                    </p>
                    <p>
                      <strong>Required for:</strong>{' '}
                      {record.contractRequirement}
                    </p>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button variant="default">Update Status</Button>
                    <Button variant="default">Send Reminder</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Document Uploads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Document Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-navy">{doc.type}</h4>
                    <span className="text-xs text-slate-light">
                      {doc.uploaded}
                    </span>
                  </div>
                  <p className="text-sm text-slate-dark">
                    Employee: {doc.employee}
                  </p>
                  <div className="mt-3 flex space-x-2">
                    <Button variant="default">Review</Button>
                    <Button variant="default">Approve</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-accent-blue rounded-lg">
              <h4 className="font-medium text-blue mb-2">
                Training Requirements Alert
              </h4>
              <p className="text-sm text-blue">
                5 employees have upcoming certification deadlines within the
                next 30 days. Please coordinate with managers to schedule
                required training sessions.
              </p>
              <Button className="mt-2" variant="default">
                View All Deadlines
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </div>
  );
};

export default HRDashboard;
