'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  AlertCircle,
  Clock,
  Upload,
  MessageSquare,
} from 'lucide-react';
import { getContracts } from '@/lib/actions/user.actions';
import ActionDropdown from '@/components/ActionDropdown';
import { Models } from 'node-appwrite';

type Contract = {
  $id: string;
  contractName: string;
  name?: string;
  contractExpiryDate?: string;
  status?: string;
  amount?: number;
  daysUntilExpiry?: number;
  compliance?: string;
  assignedManagers?: string[];
  fileId?: string;
  fileRef?: unknown;
};

const ManagerDashboard = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);

  const refreshContracts = async () => {
    try {
      const contractsData = await getContracts();
      // Ensure all contracts have the required properties
      const validatedContracts = (contractsData as Contract[]).map(
        (contract) => ({
          ...contract,
          contractName:
            contract.contractName || contract.name || 'Unnamed Contract',
          name: contract.name || contract.contractName || 'Unnamed Contract',
          status: contract.status || 'pending',
        })
      );
      setContracts(validatedContracts);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      setContracts([]);
    }
  };

  useEffect(() => {
    refreshContracts();
  }, []);

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
              {contracts.map((contract) => {
                // Convert contract to a plain object to avoid serialization errors
                const plainContract = JSON.parse(JSON.stringify(contract));

                return (
                  <div
                    key={contract.$id}
                    className="border border-border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-navy">
                        {contract.contractName}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium`}
                      >
                        {contract.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-dark space-y-1">
                      <p>
                        Amount:{' '}
                        {contract.amount ? `$${contract.amount}` : 'N/A'}
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
                      <ActionDropdown
                        file={plainContract as unknown as Models.Document}
                        onStatusChange={refreshContracts}
                      />
                    </div>
                  </div>
                );
              })}
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
