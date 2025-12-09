'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import Avatar from '@/components/ui/avatar';
import Thumbnail from './Thumbnail';
import ActionDropdown from './ActionDropdown';
import { convertFileSize } from '@/lib/utils';
import FormattedDateTime from './FormattedDateTime';
import { FormattedDate } from './FormattedDateTime';
import { fetchUserNamesByIds } from '@/lib/actions/user.actions';
import type { UIFileDoc } from '@/types/files';
import type { AppUser } from '@/lib/actions/user.actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ManagerAvatars from './ManagerAvatars';

// Map contract status to badge color and label (same as Card component)
const statusBadge = (status: string) => {
  let color = '';
  let label = status;
  switch (status) {
    case 'pending-review':
      color = 'bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium';
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
      color = 'bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium';
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
  const { toast } = useToast();
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [loadingOwners, setLoadingOwners] = useState<Record<string, boolean>>(
    {}
  );
  const [assignedManagerUsers, setAssignedManagerUsers] = useState<
    Record<string, AppUser[]>
  >({});
  const [loadingManagers, setLoadingManagers] = useState<
    Record<string, boolean>
  >({});
  const [managerProfileImages, setManagerProfileImages] = useState<
    Record<string, string>
  >({});
  const [failedProfileImages, setFailedProfileImages] = useState<Set<string>>(
    new Set()
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
        if (
          file.contractOwnerId &&
          typeof file.contractOwnerId === 'string' &&
          file.contractOwnerId.trim()
        ) {
          userId = file.contractOwnerId.trim();
        } else if (
          typeof file.owner === 'string' &&
          file.owner &&
          file.owner.trim()
        ) {
          userId = file.owner.trim();
        } else if (
          typeof file.owner === 'object' &&
          file.owner &&
          'fullName' in file.owner
        ) {
          // Already have the name, skip
          const ownerObj = file.owner as { fullName: string };
          if (ownerObj.fullName) {
            setOwnerNames((prev) => ({
              ...prev,
              [file.$id]: ownerObj.fullName,
            }));
            return;
          }
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
        const users = await fetchUserNamesByIds(userIdsArray);

        const namesMap: Record<string, string> = {};

        // Convert users array to a map by $id and accountId
        users.forEach((user) => {
          if (user.$id) {
            namesMap[user.$id] = user.fullName || 'Unknown';
          }
          if (user.accountId) {
            namesMap[user.accountId] = user.fullName || 'Unknown';
          }
        });

        const newOwnerNames: Record<string, string> = {};
        userIdsArray.forEach((userId) => {
          const name = namesMap[userId] || 'Unknown';
          ownerIdToFileId.get(userId)?.forEach((fileId) => {
            newOwnerNames[fileId] = name;
          });
        });

        setOwnerNames((prev) => ({ ...prev, ...newOwnerNames }));
      } catch (error) {
        console.error('Failed to fetch owner names:', error);
        toast({
          title: 'Error',
          description: 'Failed to load contract owner information.',
          variant: 'destructive',
        });
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

  // Fetch assigned manager user data
  useEffect(() => {
    const fetchAssignedManagers = async () => {
      const managerIds = new Set<string>();
      const managerIdToFileId = new Map<string, string[]>();

      files.forEach((file) => {
        let managers: string[] = [];

        // Get manager IDs - could be IDs or names
        if (
          Array.isArray(file.assignedManagers) &&
          file.assignedManagers.length > 0
        ) {
          managers = file.assignedManagers;
        } else if (typeof file.assignedManagers === 'string') {
          managers = [file.assignedManagers];
        }

        // Filter out names (strings that look like names) and keep IDs
        managers.forEach((manager) => {
          // If it looks like a user ID (alphanumeric, longer than typical names) or is a valid ID format
          // We'll try to fetch it - if it fails, we'll handle it gracefully
          if (manager && manager.trim()) {
            managerIds.add(manager.trim());
            if (!managerIdToFileId.has(manager.trim())) {
              managerIdToFileId.set(manager.trim(), []);
            }
            managerIdToFileId.get(manager.trim())!.push(file.$id);
          }
        });
      });

      if (managerIds.size === 0) return;

      const managerIdsArray = Array.from(managerIds);

      setLoadingManagers((prev) => {
        const newLoading = { ...prev };
        managerIdsArray.forEach((id) => {
          managerIdToFileId.get(id)?.forEach((fileId) => {
            newLoading[fileId] = true;
          });
        });
        return newLoading;
      });

      try {
        const users = await fetchUserNamesByIds(managerIdsArray);
        const newManagerUsers: Record<string, AppUser[]> = {};

        // Map users by their IDs, accountIds, and fullNames (since assignedManagers might be stored as names)
        const userMap = new Map<string, AppUser>();
        users.forEach((user) => {
          if (user.$id) userMap.set(user.$id, user);
          if (user.accountId) userMap.set(user.accountId, user);
          if (user.fullName) userMap.set(user.fullName, user);
        });

        // For each file, find matching users
        files.forEach((file) => {
          const fileManagers: AppUser[] = [];
          let managers: string[] = [];

          if (
            Array.isArray(file.assignedManagers) &&
            file.assignedManagers.length > 0
          ) {
            managers = file.assignedManagers;
          } else if (typeof file.assignedManagers === 'string') {
            managers = [file.assignedManagers];
          }

          managers.forEach((manager) => {
            const user = userMap.get(manager.trim());
            if (user) {
              fileManagers.push(user);
            } else {
              // If not found, create a mock user from the name
              fileManagers.push({
                $id: manager.trim(),
                fullName: manager.trim(),
                email: '',
                avatar: '',
                accountId: manager.trim(),
                role: 'viewer' as const,
                profileImageId: null,
              });
            }
          });

          if (fileManagers.length > 0) {
            newManagerUsers[file.$id] = fileManagers;
          }
        });

        // Generate profile image URLs for users with profileImageId
        // Memoize URL generation constants to avoid redundant lookups
        const bucketId =
          process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET;
        const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
        const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

        const newProfileImages: Record<string, string> = {};

        if (bucketId && endpoint && projectId) {
          // Pre-compute base URL for better performance
          const baseUrl = `${endpoint}/storage/buckets/${bucketId}/files`;
          users.forEach((user) => {
            if (user.profileImageId) {
              const imageUrl = `${baseUrl}/${user.profileImageId}/view?project=${projectId}`;
              // Map by both $id and accountId for lookup
              if (user.$id) {
                newProfileImages[user.$id] = imageUrl;
              }
              if (user.accountId) {
                newProfileImages[user.accountId] = imageUrl;
              }
            }
          });
        }

        setManagerProfileImages((prev) => ({ ...prev, ...newProfileImages }));
        setAssignedManagerUsers((prev) => ({ ...prev, ...newManagerUsers }));
      } catch (error) {
        console.error('Failed to fetch assigned manager users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load assigned manager information.',
          variant: 'destructive',
        });
      } finally {
        setLoadingManagers((prev) => {
          const newLoading = { ...prev };
          managerIdsArray.forEach((id) => {
            managerIdToFileId.get(id)?.forEach((fileId) => {
              newLoading[fileId] = false;
            });
          });
          return newLoading;
        });
      }
    };

    fetchAssignedManagers();
  }, [files]);

  const getOwnerName = (file: UIFileDoc): string => {
    if (ownerNames[file.$id]) {
      return ownerNames[file.$id];
    }
    if (
      typeof file.owner === 'object' &&
      file.owner &&
      'fullName' in file.owner
    ) {
      return (file.owner as { fullName: string }).fullName;
    }
    if (loadingOwners[file.$id]) {
      return 'Loading...';
    }

    return 'Unknown';
  };

  const truncateContractName = (name: string): string => {
    if (!name) return 'Untitled Contract';
    if (name.length <= 15) return name;
    return name.substring(0, 15) + '...';
  };

  // Memoized handler for image load errors
  const handleImageError = useCallback((userId: string, accountId?: string) => {
    setFailedProfileImages((prev) => {
      const newSet = new Set(prev);
      if (userId) newSet.add(userId);
      if (accountId) newSet.add(accountId);
      return newSet;
    });
  }, []);

  const renderAssignedManagers = (file: UIFileDoc) => {
    const managers = assignedManagerUsers[file.$id] || [];
    const isLoading = loadingManagers[file.$id];

    if (isLoading) {
      return <span className="body-2 text-slate-400">Loading...</span>;
    }

    if (managers.length === 0) {
      // Fallback to original display if no user data
      if (
        Array.isArray(file.assignedManagers) &&
        file.assignedManagers.length > 0
      ) {
        return (
          <span
            className="body-2 truncate block"
            title={file.assignedManagers.join(', ')}
          >
            {file.assignedManagers.join(', ')}
          </span>
        );
      }
      if (typeof file.assignedManagers === 'string') {
        return <span className="body-2">{file.assignedManagers}</span>;
      }
      return <span className="body-2 text-slate-400">-</span>;
    }

    return (
      <ManagerAvatars
        managers={managers}
        profileImages={managerProfileImages}
        failedImages={failedProfileImages}
        onImageError={handleImageError}
      />
    );
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <Image
          src="/assets/icons/no-data.svg"
          alt="No contracts found"
          width={250}
          height={250}
          className="mx-auto mb-4"
        />
        <p className="body-1 text-slate-700">No contracts found</p>
      </div>
    );
  }

  return (
    <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg w-[99.5%]">
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
                      <p
                        className="subtitle-2 text-slate-700 whitespace-nowrap truncate"
                        title={
                          file.name || file.contractName || 'Untitled Contract'
                        }
                      >
                        {truncateContractName(
                          file.name || file.contractName || 'Untitled Contract'
                        )}
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
                    {renderAssignedManagers(file)}
                  </TableCell>
                  <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                    <span
                      className="body-2 truncate block"
                      title={getOwnerName(file)}
                    >
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
