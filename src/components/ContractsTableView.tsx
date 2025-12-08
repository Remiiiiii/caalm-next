'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import Thumbnail from './Thumbnail';
import ActionDropdown from './ActionDropdown';
import { convertFileSize } from '@/lib/utils';
import FormattedDateTime from './FormattedDateTime';
import { FormattedDate } from './FormattedDateTime';
import { fetchUserNamesByIds } from '@/lib/actions/user.actions';
import type { UIFileDoc } from '@/types/files';

// Map contract status to badge color and label (same as Card component)
const statusBadge = (status: string) => {
  let color = '';
  let label = status;
  switch (status) {
    case 'pending-review':
      color =
        'bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium';
      label = 'Pending Review';
      break;
    case 'action-required':
      color =
        'bg-destructive/10 text-destructive text-xs rounded-xl font-medium';
      label = 'Action Required';
      break;
    case 'active':
      color = 'bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium';
      label = 'Active';
      break;
    case 'inactive':
      color =
        'bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium';
      label = 'Inactive';
      break;
    default:
      color = 'bg-slate-100 text-slate-800 text-xs rounded-xl font-medium';
      label = status;
  }
  return <span className={`inline-block px-2 py-1 ${color}`}>{label}</span>;
};

interface ContractsTableViewProps {
  files: UIFileDoc[];
  user: {
    role?: string;
  } | null;
  onRefresh?: () => void;
}

export default function ContractsTableView({
  files,
  user,
  onRefresh,
}: ContractsTableViewProps) {
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [loadingOwners, setLoadingOwners] = useState<Record<string, boolean>>(
    {}
  );

  // Fetch owner names for all contracts
  useEffect(() => {
    const fetchAllOwnerNames = async () => {
      const ownerIds = new Set<string>();
      const ownerIdToFileId = new Map<string, string[]>();

      files.forEach((file) => {
        let userId: string | null = null;

        // Try to get owner ID from various sources
        // Check for contractOwnerId first (contracts collection field)
        if (file.contractOwnerId && typeof file.contractOwnerId === 'string' && file.contractOwnerId.trim()) {
          userId = file.contractOwnerId.trim();
        } else if (typeof file.owner === 'string' && file.owner && file.owner.trim()) {
          userId = file.owner.trim();
        } else if (typeof file.owner === 'object' && file.owner?.fullName) {
          // Already have the name, skip
          setOwnerNames((prev) => ({
            ...prev,
            [file.$id]: file.owner.fullName,
          }));
          return;
        }

        if (userId && userId.length > 0 && !ownerNames[file.$id]) {
          ownerIds.add(userId);
          if (!ownerIdToFileId.has(userId)) {
            ownerIdToFileId.set(userId, []);
          }
          ownerIdToFileId.get(userId)!.push(file.$id);
        }
      });

      if (ownerIds.size === 0) return;

      const userIdsArray = Array.from(ownerIds);
      setLoadingOwners((prev) => {
        const newLoading = { ...prev };
        userIdsArray.forEach((id) => {
          ownerIdToFileId.get(id)?.forEach((fileId) => {
            newLoading[fileId] = true;
          });
        });
        return newLoading;
      });

      try {
        console.log('[ContractsTableView] Fetching owner names for userIds:', userIdsArray);
        const users = await fetchUserNamesByIds(userIdsArray);
        console.log('[ContractsTableView] Received users:', users);
        
        const namesMap: Record<string, string> = {};
        
        // Convert users array to a map by $id and accountId
        users.forEach((user) => {
          if (user.$id) {
            namesMap[user.$id] = user.fullName || 'Unknown';
            console.log(`[ContractsTableView] Mapped ${user.$id} -> ${user.fullName}`);
          }
          if (user.accountId) {
            namesMap[user.accountId] = user.fullName || 'Unknown';
            console.log(`[ContractsTableView] Mapped ${user.accountId} -> ${user.fullName}`);
          }
        });

        const newOwnerNames: Record<string, string> = {};
        userIdsArray.forEach((userId) => {
          const name = namesMap[userId] || 'Unknown';
          console.log(`[ContractsTableView] Looking up name for userId ${userId}: ${name}`);
          ownerIdToFileId.get(userId)?.forEach((fileId) => {
            newOwnerNames[fileId] = name;
            console.log(`[ContractsTableView] Setting owner name for file ${fileId}: ${name}`);
          });
        });

        setOwnerNames((prev) => ({ ...prev, ...newOwnerNames }));
      } catch (error) {
        console.error('Failed to fetch owner names:', error);
        userIdsArray.forEach((userId) => {
          ownerIdToFileId.get(userId)?.forEach((fileId) => {
            setOwnerNames((prev) => ({ ...prev, [fileId]: 'Unknown' }));
          });
        });
      } finally {
        setLoadingOwners((prev) => {
          const newLoading = { ...prev };
          userIdsArray.forEach((id) => {
            ownerIdToFileId.get(id)?.forEach((fileId) => {
              newLoading[fileId] = false;
            });
          });
          return newLoading;
        });
      }
    };

    fetchAllOwnerNames();
  }, [files]);

  const getOwnerName = (file: UIFileDoc): string => {
    if (ownerNames[file.$id]) {
      return ownerNames[file.$id];
    }
    if (typeof file.owner === 'object' && file.owner?.fullName) {
      return file.owner.fullName;
    }
    if (loadingOwners[file.$id]) {
      return 'Loading...';
    }
    // Debug logging
    console.log(`[ContractsTableView] getOwnerName - file ${file.$id}:`, {
      ownerNames: ownerNames[file.$id],
      owner: file.owner,
      contractOwnerId: file.contractOwnerId,
      loading: loadingOwners[file.$id],
    });
    return 'Unknown';
  };

  const truncateContractName = (name: string): string => {
    if (!name) return 'Untitled Contract';
    if (name.length <= 15) return name;
    return name.substring(0, 15) + '...';
  };

  const getAssignedTo = (file: UIFileDoc): string => {
    if (Array.isArray(file.assignedManagers) && file.assignedManagers.length > 0) {
      return file.assignedManagers.join(', ');
    }
    if (typeof file.assignedManagers === 'string') {
      return file.assignedManagers;
    }
    return '-';
  };

  if (files.length === 0) {
    return (
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="empty-list">No contracts found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
      <CardContent className="p-6">
        <div className="w-full overflow-x-auto">
          <Table>
        <TableHeader>
          <TableRow className="border-slate-200 bg-slate-50">
            <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
              Contract
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
              Status
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
              Size
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
              Uploaded On
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
              Expires On
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
              Department
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
              Assigned To
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
              By
            </TableHead>
            <TableHead className="font-semibold text-slate-700 py-4 text-right whitespace-nowrap">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file: UIFileDoc) => (
            <TableRow
              key={file.$id}
              className="border-slate-200 hover:bg-white/60 hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <TableCell className="py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Thumbnail
                    type={file.type}
                    extension={file.extension}
                    url={file.url}
                    className="!size-10 flex-shrink-0"
                    imageClassName="!size-8"
                  />
                  <p className="subtitle-2 text-slate-700 whitespace-nowrap truncate" title={file.name || file.contractName || 'Untitled Contract'}>
                    {truncateContractName(file.name || file.contractName || 'Untitled Contract')}
                  </p>
                </div>
              </TableCell>
              <TableCell className="py-4 whitespace-nowrap">
                {file.status && statusBadge(file.status)}
              </TableCell>
              <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                {convertFileSize({ sizeInBytes: file.size || 0 })}
              </TableCell>
              <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                <FormattedDateTime
                  date={file.$createdAt}
                  className="body-2"
                />
              </TableCell>
              <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                {file.contractExpiryDate ? (
                  <FormattedDate
                    date={file.contractExpiryDate}
                    className="body-2"
                  />
                ) : (
                  <span className="body-2 text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                {file.department || (
                  <span className="body-2 text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                {getAssignedTo(file) !== '-' ? (
                  <span className="body-2 truncate block" title={getAssignedTo(file)}>
                    {getAssignedTo(file)}
                  </span>
                ) : (
                  <span className="body-2 text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                <span className="body-2 truncate block" title={getOwnerName(file)}>
                  {getOwnerName(file)}
                </span>
              </TableCell>
              <TableCell className="py-4 text-right">
                <ActionDropdown
                  file={file}
                  onStatusChange={onRefresh}
                  onRefresh={onRefresh}
                  userRole={user?.role as 'executive' | 'admin' | 'manager'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
        </div>
      </CardContent>
    </Card>
  );
}

