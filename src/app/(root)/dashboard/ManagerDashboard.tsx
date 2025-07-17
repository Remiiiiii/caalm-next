import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  Upload,
  MessageSquare,
} from 'lucide-react';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

type Contract = {
  $id: string;
  contractName: string;
  contractExpiryDate?: string;
  status?: string;
  amount?: number;
  daysUntilExpiry?: number;
  compliance?: string;
  assignedManagers?: string[];
  fileId?: string;
  fileRef?: unknown;
};

const ManagerDashboard = async () => {
  // Fetch contracts from the database
  const { databases } = await createAdminClient();
  let contracts: Contract[] = [];
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId
    );
    contracts = res.documents as unknown as Contract[];
  } catch {
    contracts = [];
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'expiring':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-navy">Operations Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4 text-coral" />
            Upload Document
          </Button>
          <Button>
            <MessageSquare className="mr-2 h-4 w-4 text-coral" />
            Submit Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-dark">
                  My Contracts
                </p>
                <p className="text-3xl font-bold text-navy">
                  {contracts.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-dark">
                  Expiring Soon
                </p>
                <p className="text-3xl font-bold text-coral">1</p>
              </div>
              <AlertCircle className="h-8 w-8 text-coral" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-dark">
                  Pending Tasks
                </p>
                <p className="text-3xl font-bold text-orange">
                  {upcomingTasks.length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* All Contracts */}
        <Card>
          <CardHeader>
            <CardTitle>All Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contracts.length === 0 && (
                <div className="text-gray-500">No contracts found.</div>
              )}
              {contracts.map((contract) => (
                <div
                  key={contract.$id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-navy">
                      {contract.contractName}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        contract.status || 'pending'
                      )}`}
                    >
                      {contract.status || 'pending'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-dark space-y-1">
                    <p>
                      Amount: {contract.amount ? `$${contract.amount}` : 'N/A'}
                    </p>
                    <p>
                      Expires:{' '}
                      {contract.contractExpiryDate
                        ? contract.contractExpiryDate.split('T')[0]
                        : 'N/A'}
                      {contract.daysUntilExpiry !== undefined &&
                        ` (${contract.daysUntilExpiry} days)`}
                    </p>
                    <p>Compliance: {contract.compliance || 'N/A'}</p>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      <Calendar className="mr-1 h-3 w-3 text-coral" />
                      Schedule Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-navy">{task.task}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-dark">
                    Due: {task.deadline}
                  </p>
                  <div className="mt-3">
                    <Button size="sm">Mark Complete</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;
