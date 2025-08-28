'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Calendar,
  User,
  Building,
  Download,
  Eye,
  Share,
  Settings,
} from 'lucide-react';
import ActionDropdown from '../ActionDropdown';
import { UIFileDoc } from '@/types/files';
import { Contract, ContractsGridProps } from '@/types/my-contracts';
import { convertFileSize } from '@/lib/utils';

const ContractsGrid: React.FC<ContractsGridProps> = ({
  contracts,
  loading,
  error,
  userRole,
}) => {
  const [sortBy, setSortBy] = useState<string>('$createdAt-desc');

  // Calculate total file size
  const totalSizeBytes = contracts.reduce((sum) => {
    // This would need to be implemented based on your contract data structure
    // For now, we'll use a placeholder
    return sum + 0;
  }, 0);

  const totalSizeFormatted = convertFileSize(totalSizeBytes);

  // Sort contracts
  const sortedContracts = [...contracts].sort((a, b) => {
    switch (sortBy) {
      case '$createdAt-desc':
        return (
          new Date(b.$createdAt || 0).getTime() -
          new Date(a.$createdAt || 0).getTime()
        );
      case '$createdAt-asc':
        return (
          new Date(a.$createdAt || 0).getTime() -
          new Date(b.$createdAt || 0).getTime()
        );
      case 'name-asc':
        return (a.contractName || '').localeCompare(b.contractName || '');
      case 'name-desc':
        return (b.contractName || '').localeCompare(a.contractName || '');
      default:
        return 0;
    }
  });

  // Convert contract to UIFileDoc for ActionDropdown
  const convertToUIFileDoc = (contract: Contract): UIFileDoc => {
    return {
      $id: contract.$id,
      name: contract.contractName,
      contractName: contract.contractName,
      status: contract.status,
      contractExpiryDate: contract.contractExpiryDate,
      // Add other required fields
      extension: 'pdf',
      size: 0,
      type: 'document',
      url: '',
      owner: '',
      users: [],
      bucketFileId: contract.fileRef || '',
      contractId: contract.$id,
      $createdAt: '',
      $updatedAt: '',
      $permissions: [],
      $databaseId: '',
      $collectionId: '',
      $sequence: 0,
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 bg-white/20 rounded-xl backdrop-blur"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            Error Loading Contracts
          </h3>
          <p className="text-slate-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with total and sort */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <p className="body-1 text-slate-700">
            Total:{' '}
            <span className="h5 font-semibold">
              {contracts.length} contracts
            </span>
          </p>
          <p className="body-1 text-slate-700">
            Size: <span className="h5 font-semibold">{totalSizeFormatted}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p className="body-1 text-slate-700">Sort by:</p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-white/60 backdrop-blur border border-white/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="$createdAt-desc">
                Date created (newest)
              </SelectItem>
              <SelectItem value="$createdAt-asc">
                Date created (oldest)
              </SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contracts Grid */}
      {sortedContracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedContracts.map((contract) => (
            <Card
              key={contract.$id}
              className="bg-white/60 backdrop-blur border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-slate-800 truncate">
                        {contract.contractName}
                      </CardTitle>
                      <p className="text-sm text-slate-600 capitalize">
                        {contract.status?.replace('-', ' ')}
                      </p>
                    </div>
                  </div>

                  {/* Action Dropdown - Role-based restrictions */}
                  <ActionDropdown
                    file={convertToUIFileDoc(contract)}
                    onStatusChange={() => {
                      // Handle status change
                    }}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Department */}
                {contract.department && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building className="h-4 w-4" />
                    <span>{contract.department}</span>
                  </div>
                )}

                {/* Division */}
                {contract.division && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="h-4 w-4" />
                    <span className="capitalize">
                      {contract.division
                        .split('-')
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(' ')}
                    </span>
                  </div>
                )}

                {/* Expiry Date */}
                {contract.contractExpiryDate && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Expires:{' '}
                      {new Date(
                        contract.contractExpiryDate
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Assigned Managers */}
                {contract.assignedManagers &&
                  contract.assignedManagers.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="h-4 w-4" />
                      <span>
                        {contract.assignedManagers.length} manager(s) assigned
                      </span>
                    </div>
                  )}

                {/* Quick Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 bg-white/40 hover:bg-white/60"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 bg-white/40 hover:bg-white/60"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {userRole === 'executive' || userRole === 'admin' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 bg-white/40 hover:bg-white/60"
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 bg-white/40 hover:bg-white/60"
                    >
                      <Share className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">
              No contracts found
            </h3>
            <p className="text-slate-500">
              {userRole === 'manager'
                ? 'No contracts have been assigned to your department yet.'
                : 'No contracts are available for the selected filters.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContractsGrid;
