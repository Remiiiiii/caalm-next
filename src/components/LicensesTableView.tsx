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
import LicenseActionDropdown from './licenses/LicenseActionDropdown';
import FormattedDateTime from './FormattedDateTime';
import { FormattedDate } from './FormattedDateTime';
import { convertFileSize } from '@/lib/utils';
import { fetchUserNamesByIds } from '@/lib/actions/user.actions';
import type { License } from '@/types/licenses';
import type { AppUser } from '@/lib/actions/user.actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ManagerAvatars from './ManagerAvatars';
import Thumbnail from './Thumbnail';

// Map license status to badge color and label
const statusBadge = (status: string) => {
  let color = '';
  let label = status;
  switch (status) {
    case 'pending-review':
      color =
        'border-2 border-amber-400 bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium';
      label = 'Pending Review';
      break;
    case 'action-required':
      color =
        'border-2 border-red-400 bg-destructive/10 text-destructive text-xs rounded-xl font-medium';
      label = 'Action Required';
      break;
    case 'active':
      color =
        'border-2 border-cyan-400 bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium';
      label = 'Active';
      break;
    case 'inactive':
      color =
        'border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium';
      label = 'Inactive';
      break;
    case 'expired':
      color =
        'border-2 border-purple-600 bg-purple-50 text-purple-900 text-xs rounded-xl font-medium';
      label = 'Expired';
      break;
    case 'suspended':
      color =
        'border-2 border-slate-400 bg-slate-300 text-slate-700 text-xs rounded-xl font-medium';
      label = 'Suspended';
      break;
    default:
      color =
        'border-2 border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-xl font-medium';
      label = status;
  }
  return <span className={`inline-block px-2 py-1 ${color}`}>{label}</span>;
};

interface LicensesTableViewProps {
  licenses: License[];
  user: {
    role?: string;
  } | null;
  onRefresh?: () => void;
}

export default function LicensesTableView({
  licenses,
  user,
  onRefresh,
}: LicensesTableViewProps) {
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

  // Fetch owner names (createdBy) for all licenses
  useEffect(() => {
    const fetchAllOwnerNames = async () => {
      const ownerIds = new Set<string>();
      const ownerIdToLicenseId = new Map<string, string[]>();

      licenses.forEach((license) => {
        const userId = license.createdBy?.trim();
        if (userId && userId.length > 0 && !ownerNames[license.$id]) {
          ownerIds.add(userId);
          if (!ownerIdToLicenseId.has(userId)) {
            ownerIdToLicenseId.set(userId, []);
          }
          ownerIdToLicenseId.get(userId)!.push(license.$id);
        }
      });

      if (ownerIds.size === 0) return;

      const userIdsArray = Array.from(ownerIds);
      setLoadingOwners((prev) => {
        const newLoading = { ...prev };
        userIdsArray.forEach((id) => {
          ownerIdToLicenseId.get(id)?.forEach((licenseId) => {
            newLoading[licenseId] = true;
          });
        });
        return newLoading;
      });

      try {
        const users = await fetchUserNamesByIds(userIdsArray);
        const namesMap: Record<string, string> = {};
        users.forEach((user) => {
          if (user.$id) namesMap[user.$id] = user.fullName || 'Unknown';
          if (user.accountId)
            namesMap[user.accountId] = user.fullName || 'Unknown';
        });

        const newOwnerNames: Record<string, string> = {};
        userIdsArray.forEach((userId) => {
          const name = namesMap[userId] || 'Unknown';
          ownerIdToLicenseId.get(userId)?.forEach((licenseId) => {
            newOwnerNames[licenseId] = name;
          });
        });

        setOwnerNames((prev) => ({ ...prev, ...newOwnerNames }));
      } catch (error) {
        console.error('Failed to fetch owner names:', error);
        toast({
          title: 'Error',
          description: 'Failed to load license owner information.',
          variant: 'destructive',
        });
        userIdsArray.forEach((userId) => {
          ownerIdToLicenseId.get(userId)?.forEach((licenseId) => {
            setOwnerNames((prev) => ({ ...prev, [licenseId]: 'Unknown' }));
          });
        });
      } finally {
        setLoadingOwners((prev) => {
          const newLoading = { ...prev };
          userIdsArray.forEach((id) => {
            ownerIdToLicenseId.get(id)?.forEach((licenseId) => {
              newLoading[licenseId] = false;
            });
          });
          return newLoading;
        });
      }
    };

    fetchAllOwnerNames();
  }, [licenses, toast]);

  // Fetch assigned manager user data
  useEffect(() => {
    const fetchAssignedManagers = async () => {
      const managerIds = new Set<string>();
      const managerIdToLicenseId = new Map<string, string[]>();

      licenses.forEach((license) => {
        let managers: string[] = [];

        if (
          Array.isArray(license.assignedManagers) &&
          license.assignedManagers.length > 0
        ) {
          managers = license.assignedManagers;
        } else if (typeof license.assignedManagers === 'string') {
          managers = [license.assignedManagers];
        }

        managers.forEach((manager) => {
          if (manager && manager.trim()) {
            managerIds.add(manager.trim());
            if (!managerIdToLicenseId.has(manager.trim())) {
              managerIdToLicenseId.set(manager.trim(), []);
            }
            managerIdToLicenseId.get(manager.trim())!.push(license.$id);
          }
        });
      });

      if (managerIds.size === 0) return;

      const managerIdsArray = Array.from(managerIds);

      setLoadingManagers((prev) => {
        const newLoading = { ...prev };
        managerIdsArray.forEach((id) => {
          managerIdToLicenseId.get(id)?.forEach((licenseId) => {
            newLoading[licenseId] = true;
          });
        });
        return newLoading;
      });

      try {
        const users = await fetchUserNamesByIds(managerIdsArray);
        const newManagerUsers: Record<string, AppUser[]> = {};

        const userMap = new Map<string, AppUser>();
        users.forEach((user) => {
          if (user.$id) userMap.set(user.$id, user);
          if (user.accountId) userMap.set(user.accountId, user);
          if (user.fullName) userMap.set(user.fullName, user);
        });

        licenses.forEach((license) => {
          const licenseManagers: AppUser[] = [];
          let managers: string[] = [];

          if (
            Array.isArray(license.assignedManagers) &&
            license.assignedManagers.length > 0
          ) {
            managers = license.assignedManagers;
          } else if (typeof license.assignedManagers === 'string') {
            managers = [license.assignedManagers];
          }

          managers.forEach((manager) => {
            const user = userMap.get(manager.trim());
            if (user) {
              licenseManagers.push(user);
            } else {
              licenseManagers.push({
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

          if (licenseManagers.length > 0) {
            newManagerUsers[license.$id] = licenseManagers;
          }
        });

        const bucketId =
          process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET;
        const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
        const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

        const newProfileImages: Record<string, string> = {};

        if (bucketId && endpoint && projectId) {
          const baseUrl = `${endpoint}/storage/buckets/${bucketId}/files`;
          users.forEach((user) => {
            if (user.profileImageId) {
              const imageUrl = `${baseUrl}/${user.profileImageId}/view?project=${projectId}`;
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
            managerIdToLicenseId.get(id)?.forEach((licenseId) => {
              newLoading[licenseId] = false;
            });
          });
          return newLoading;
        });
      }
    };

    fetchAssignedManagers();
  }, [licenses, toast]);

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getOwnerName = (license: License): string => {
    if (ownerNames[license.$id]) return ownerNames[license.$id];
    if (loadingOwners[license.$id]) return 'Loading...';
    return 'Unknown';
  };

  const truncateLicenseName = (name: string): string => {
    if (!name) return 'Untitled License';
    if (name.length <= 20) return name;
    return name.substring(0, 20) + '...';
  };

  const handleImageError = useCallback((userId: string, accountId?: string) => {
    setFailedProfileImages((prev) => {
      const newSet = new Set(prev);
      if (userId) newSet.add(userId);
      if (accountId) newSet.add(accountId);
      return newSet;
    });
  }, []);

  const renderAssignedManagers = (license: License) => {
    const managers = assignedManagerUsers[license.$id] || [];
    const isLoading = loadingManagers[license.$id];

    if (isLoading) {
      return <span className="body-2 text-slate-400">Loading...</span>;
    }

    if (managers.length === 0) {
      if (
        Array.isArray(license.assignedManagers) &&
        license.assignedManagers.length > 0
      ) {
        return (
          <span
            className="body-2 truncate block"
            title={license.assignedManagers.join(', ')}
          >
            {license.assignedManagers.join(', ')}
          </span>
        );
      }
      if (typeof license.assignedManagers === 'string') {
        return <span className="body-2">{license.assignedManagers}</span>;
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

  if (licenses.length === 0) {
    return (
      <div className="text-center py-12">
        <Image
          src="/assets/icons/no-data.svg"
          alt="No licenses found"
          width={250}
          height={250}
          className="mx-auto mb-4"
        />
        <p className="body-1 text-slate-700">No licenses found</p>
      </div>
    );
  }

  return (
    <Card className="bg-white/30 backdrop-blur border mt-6 border-white/40 shadow-lg w-[99.5%]">
      <div className="glass-card-cap" />
      <CardContent className="p-6">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50">
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  License
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
                  Uploaded By
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((license: License) => (
                <TableRow
                  key={license.$id}
                  className="border-slate-200 hover:bg-white/60 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Thumbnail
                        type="application/pdf"
                        extension="pdf"
                        url=""
                        className="size-10! shrink-0"
                        imageClassName="!size-8"
                      />
                      <div className="min-w-0">
                        <p
                          className="subtitle-2 text-slate-700 whitespace-nowrap truncate"
                          title={license.licenseName}
                        >
                          {truncateLicenseName(license.licenseName)}
                        </p>
                        {license.licenseNumber && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            #{license.licenseNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 whitespace-nowrap">
                    {license.status && statusBadge(license.status)}
                  </TableCell>
                  <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                    {convertFileSize({
                      sizeInBytes: license.fileSize ?? 0,
                    })}
                  </TableCell>
                  <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                    <FormattedDateTime
                      date={license.$createdAt}
                      className="body-2"
                    />
                  </TableCell>
                  <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                    {license.licenseExpiryDate ? (
                      <FormattedDate
                        date={license.licenseExpiryDate}
                        className="body-2"
                      />
                    ) : (
                      <span className="body-2 text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                    {license.division || license.department || (
                      <span className="body-2 text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                    {renderAssignedManagers(license)}
                  </TableCell>
                  <TableCell className="py-4 text-slate-700 whitespace-nowrap">
                    <span
                      className="body-2 truncate block"
                      title={getOwnerName(license)}
                    >
                      {getOwnerName(license)}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <LicenseActionDropdown
                      license={license}
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
