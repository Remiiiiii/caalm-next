'use client';

// import Link from 'next/link'; // Removed since we no longer use Link component
import { Models } from 'node-appwrite';
import { useEffect, useState, useCallback } from 'react';
import Thumbnail from './Thumbnail';
import { convertFileSize } from '@/lib/utils';
import FormattedDateTime from './FormattedDateTime';
import { FormattedDate } from './FormattedDateTime';
import ActionDropdown from './ActionDropdown';
import { fetchUserNamesByIds, type AppUser } from '@/lib/actions/user.actions';
import ManagerAvatars from './ManagerAvatars';

// Map contract status to badge color and label
const statusBadge = (status: string) => {
  let color = '';
  let label = status;
  switch (status) {
    case 'pending-review':
      color =
        'border-2 border-amber-400 bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium mr-auto';
      label = 'Pending Review';
      break;
    case 'action-required':
      color =
        'border-2 border-red-400 bg-destructive/10 text-destructive text-xs rounded-xl font-medium mr-auto';
      label = 'Action Required';
      break;
    case 'active':
      color =
        'border-2 border-cyan-400 bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium';
      label = 'Active';
      break;
    case 'inactive':
      color =
        'border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium mr-auto';
      label = 'Inactive';
      break;
    default:
      color =
        'border-2 border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-xl font-medium';
      label = status;
  }
  return <span className={`inline-block px-2 py-1 ${color}`}>{label}</span>;
};

// Map risk level to badge color and label
const riskLevelBadge = (risk: string) => {
  let color = '';
  switch (risk.toLowerCase()) {
    case 'critical':
      color = 'border-2 border-slate-700 bg-black text-white';
      break;
    case 'high':
      color =
        'border-2 border-destructive/50 bg-destructive/10 text-destructive';
      break;
    case 'medium':
      color = 'border-2 border-amber-400 bg-amber-100 text-amber-700';
      break;
    case 'low':
      color = 'border-2 border-green-400 bg-green-100 text-green-700';
      break;
    default:
      color = 'border-2 border-slate-200 bg-slate-100 text-slate-800';
  }
  const label = risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase();
  return (
    <span
      className={`inline-block px-2 py-1 text-xs rounded-xl font-medium ${color}`}
    >
      {label} Risk
    </span>
  );
};

import type { UIFileDoc } from '@/types/files';

interface CardProps {
  file: UIFileDoc;
  status?: string;
  expirationDate?: string;
  assignedTo?: string;
  assignedToDepartment?: string;
  assignedManagers?: string[];
  onRefresh?: () => void;
  userRole?: 'executive' | 'admin' | 'manager';
}

const Card = ({
  file,
  status,
  expirationDate,
  assignedTo: propAssignedTo,
  assignedToDepartment: propAssignedToDepartment,
  onRefresh,
  userRole,
}: CardProps) => {
  const [contractStatus, setContractStatus] = useState<string | undefined>(
    status || file.status
  );
  const [contractExpiryDate, setContractExpiryDate] = useState<
    string | undefined
  >(expirationDate || file.contractExpiryDate);
  const [assignedTo, setAssignedTo] = useState<string | undefined>(
    propAssignedTo ||
      (Array.isArray(file.assignedManagers)
        ? file.assignedManagers.join(', ')
        : file.assignedManagers)
  );
  const [assignedToDepartment, setAssignedToDepartment] = useState<
    string | undefined
  >(propAssignedToDepartment || file.department);
  const [ownerName, setOwnerName] = useState<string | null>(
    typeof file.owner === 'object' && file.owner?.fullName
      ? file.owner.fullName
      : null
  );
  const [isLoadingOwnerName, setIsLoadingOwnerName] = useState(false);
  const [contractOwnerId, setContractOwnerId] = useState<string | null>(null);
  const [contractLoaded, setContractLoaded] = useState(false);
  const [assignedManagerUsers, setAssignedManagerUsers] = useState<AppUser[]>(
    []
  );
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [managerProfileImages, setManagerProfileImages] = useState<
    Record<string, string>
  >({});
  const [failedProfileImages, setFailedProfileImages] = useState<Set<string>>(
    new Set()
  );
  const [riskLevel, setRiskLevel] = useState<string | undefined>(
    (file as any).riskLevel || undefined
  );

  // Sync local state with file prop changes (for real-time updates)
  useEffect(() => {
    setContractStatus(status || file.status);
  }, [status, file.status]);

  useEffect(() => {
    setContractExpiryDate(expirationDate || file.contractExpiryDate);
  }, [expirationDate, file.contractExpiryDate]);

  // Fetch owner name - prioritize contractOwnerId if contract exists
  useEffect(() => {
    const fetchOwnerName = async () => {
      // Wait for contract to load if we're trying to fetch it (check for contract indicators)
      const mightHaveContract =
        file.contractId || file.contractName || file.status;
      if (mightHaveContract && !contractLoaded) {
        return;
      }

      // If we already have a valid name (not "Unknown"), don't re-fetch
      // But allow re-fetch if contractOwnerId becomes available
      if (ownerName && ownerName !== 'Unknown' && !contractOwnerId) {
        return;
      }

      setIsLoadingOwnerName(true);
      try {
        let userIdToFetch: string | null = null;

        // For contracts, prioritize contractOwnerId from the contract document
        if (contractOwnerId) {
          userIdToFetch = contractOwnerId;
        }
        // Fall back to file.owner if no contract owner found
        else if (typeof file.owner === 'string' && file.owner) {
          userIdToFetch = file.owner;
        } else if (typeof file.owner === 'object' && file.owner?.fullName) {
          // Already have the name, no need to fetch
          setOwnerName(file.owner.fullName);
          setIsLoadingOwnerName(false);
          return;
        }

        if (userIdToFetch) {
          try {
            const users = await fetchUserNamesByIds([userIdToFetch]);

            if (users && Array.isArray(users) && users.length > 0) {
              const user =
                users.find(
                  (u) =>
                    u?.$id === userIdToFetch || u?.accountId === userIdToFetch
                ) || users[0];
              if (user?.fullName) {
                setOwnerName(user.fullName);
              } else {
                console.warn(
                  `[Card] User found but no fullName for ID: ${userIdToFetch}. User object:`,
                  user
                );
                setOwnerName('Unknown');
              }
            } else {
              console.warn(
                `[Card] User not found for ID: ${userIdToFetch}. API returned:`,
                users
              );
              setOwnerName('Unknown');
            }
          } catch (fetchError) {
            console.error(
              `[Card] Error fetching user name for ID ${userIdToFetch}:`,
              fetchError
            );
            setOwnerName('Unknown');
          }
        } else {
          setOwnerName('Unknown');
        }
      } catch (error) {
        console.error('Failed to fetch owner name:', error);
        setOwnerName('Unknown');
      } finally {
        setIsLoadingOwnerName(false);
      }
    };

    fetchOwnerName();
  }, [file.owner, file.contractId, contractOwnerId, contractLoaded]);

  useEffect(() => {
    // Fetch contract data - try both contractId and fileId lookup
    if (!contractLoaded) {
      (async () => {
        try {
          // Dynamically import to avoid SSR issues
          const { getContracts } = await import('@/lib/actions/file.actions');
          const contractsRes = await getContracts();
          const contracts = Array.isArray(contractsRes.documents)
            ? contractsRes.documents
            : [];

          // Try to find contract by contractId first
          let contract = file.contractId
            ? contracts.find((c: Models.Document) => c.$id === file.contractId)
            : null;

          // If not found and file has an ID, try finding by fileId
          if (!contract && file.$id) {
            contract = contracts.find(
              (c: any) =>
                (c.fileId && c.fileId === file.$id) ||
                (c.fileRef && c.fileRef === file.$id)
            );
          }

          if (contract) {
            // Update contract status if not already set
            if (!status && !file.status && contract.status) {
              setContractStatus(contract.status);
            }

            if (contract.contractExpiryDate) {
              setContractExpiryDate(contract.contractExpiryDate);
            }

            if (contract.assignedTo) {
              setAssignedTo(contract.assignedTo);
            }

            if (contract.assignedToDepartment) {
              setAssignedToDepartment(contract.assignedToDepartment);
            }

            // Store riskLevel from contract (prefer contract data over file prop)
            if (contract.riskLevel) {
              setRiskLevel(contract.riskLevel);
            } else if ((file as any).riskLevel && !riskLevel) {
              // Fallback to file prop if contract doesn't have it
              setRiskLevel((file as any).riskLevel);
            }

            // Store contractOwnerId for owner name lookup
            if (contract.contractOwnerId) {
              console.log('Found contractOwnerId:', contract.contractOwnerId);
              setContractOwnerId(contract.contractOwnerId);
            }
          }
          setContractLoaded(true);
        } catch (error) {
          console.error('Failed to fetch contract:', error);
          setContractLoaded(true); // Mark as loaded even on error to prevent infinite retries
        }
      })();
    }
  }, [
    file.contractId,
    file.$id,
    status,
    file.status,
    expirationDate,
    contractLoaded,
  ]);

  // Fetch assigned manager user data - render immediately, fetch async
  useEffect(() => {
    const fetchAssignedManagers = async () => {
      let managers: string[] = [];

      // Get manager IDs - could be IDs or names
      if (
        Array.isArray(file.assignedManagers) &&
        file.assignedManagers.length > 0
      ) {
        managers = file.assignedManagers;
      } else if (typeof file.assignedManagers === 'string') {
        managers = [file.assignedManagers];
      } else if (assignedTo && typeof assignedTo === 'string') {
        // Fallback to assignedTo if assignedManagers is not available
        managers = assignedTo.split(',').map((m) => m.trim());
      }

      if (managers.length === 0) {
        setAssignedManagerUsers([]);
        setLoadingManagers(false);
        return;
      }

      const managerIdsArray = managers.map((m) => m.trim()).filter(Boolean);

      if (managerIdsArray.length === 0) {
        setAssignedManagerUsers([]);
        setLoadingManagers(false);
        return;
      }

      // Set loading state and show fallback immediately
      setLoadingManagers(true);

      // Create fallback users immediately so UI renders
      const fallbackUsers: AppUser[] = managerIdsArray.map((manager) => ({
        $id: manager,
        fullName: manager,
        email: '',
        avatar: '',
        accountId: manager,
        role: 'viewer' as const,
        profileImageId: null,
      }));
      setAssignedManagerUsers(fallbackUsers);

      try {
        const users = await fetchUserNamesByIds(managerIdsArray);
        const fileManagers: AppUser[] = [];

        // Map users by their IDs, accountIds, and fullNames
        const userMap = new Map<string, AppUser>();
        users.forEach((user) => {
          if (user.$id) userMap.set(user.$id, user);
          if (user.accountId) userMap.set(user.accountId, user);
          if (user.fullName) userMap.set(user.fullName, user);
        });

        managerIdsArray.forEach((manager) => {
          const user = userMap.get(manager);
          if (user) {
            fileManagers.push(user);
          } else {
            // If not found, create a mock user from the name
            fileManagers.push({
              $id: manager,
              fullName: manager,
              email: '',
              avatar: '',
              accountId: manager,
              role: 'viewer' as const,
              profileImageId: null,
            });
          }
        });

        // Generate profile image URLs for users with profileImageId
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
        setAssignedManagerUsers(fileManagers);
      } catch (error) {
        console.error('Failed to fetch assigned manager users:', error);
        setAssignedManagerUsers([]);
      } finally {
        setLoadingManagers(false);
      }
    };

    fetchAssignedManagers();
  }, [file.assignedManagers, assignedTo]);

  // Memoized handler for image load errors
  const handleImageError = useCallback((userId: string, accountId?: string) => {
    setFailedProfileImages((prev) => {
      const newSet = new Set(prev);
      if (userId) newSet.add(userId);
      if (accountId) newSet.add(accountId);
      return newSet;
    });
  }, []);

  const renderAssignedManagers = () => {
    // Show content immediately - either loaded users or fallback
    if (assignedManagerUsers.length === 0) {
      // Only show loading if we have no data at all
      if (loadingManagers) {
        return <span className="body-2 text-slate-400">Loading...</span>;
      }
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
      if (assignedTo) {
        return <span className="body-2">{assignedTo}</span>;
      }
      return null;
    }

    return (
      <ManagerAvatars
        managers={assignedManagerUsers}
        profileImages={managerProfileImages}
        failedImages={failedProfileImages}
        onImageError={handleImageError}
      />
    );
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent the default link behavior - we don't want to open files in new tabs anymore
    e.preventDefault();
    e.stopPropagation();
    // The file viewing is now handled by the DocumentViewer modal through the ActionDropdown
  };

  return (
    <div className="file-card relative" onClick={handleCardClick}>
      {/* Professional Cap */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-[18px]" />

      <div className="flex justify-between text-slate-700 mt-2">
        <Thumbnail
          type={file.type}
          extension={file.extension}
          url={file.url}
          className="!size-20"
          imageClassName="!size-11"
        />
        <div className="flex flex-col items-end justify-between">
          <ActionDropdown
            file={file}
            onStatusChange={() => {
              // Update local state to reflect the new status immediately
              if (onRefresh) {
                onRefresh();
              }
            }}
            onRefresh={onRefresh}
            userRole={userRole}
          />
          <span className="inline-block px-2 py-1 border border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-xl font-medium">
            {convertFileSize({ sizeInBytes: file.size })}
          </span>
        </div>
      </div>
      <div className="file-card-details">
        <p className="subtitle-2 line-clamp-1">{file.name}</p>
        {(contractStatus || riskLevel) && (
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            {contractStatus && <div>{statusBadge(contractStatus)}</div>}
            {riskLevel && <div>{riskLevelBadge(riskLevel)}</div>}
          </div>
        )}
        {/* Horizontal divider between status and details */}
        <hr className="border-slate-200 my-1" />
        <div className="flex flex-col gap-3">
          {/* Uploaded on section */}
          <div className="bg-slate-50 rounded-lg p-2 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
              <p className="body-2 text-slate-700 font-medium whitespace-nowrap">
                Uploaded on:
              </p>
              <div className="min-w-0 flex-1">
                <FormattedDateTime
                  date={file.$createdAt}
                  className="body-2 text-slate-700 break-words"
                />
              </div>
            </div>
          </div>

          {/* Expires on section */}
          {contractExpiryDate && (
            <div className="bg-slate-50 rounded-lg p-2 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                <p className="body-2 text-slate-700 font-medium whitespace-nowrap">
                  Expires on:
                </p>
                <div className="min-w-0 flex-1">
                  <FormattedDate
                    date={contractExpiryDate}
                    className="body-2 text-slate-700 break-words"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Assigned To section */}
          {(assignedTo || assignedManagerUsers.length > 0) && (
            <div className="bg-slate-50 rounded-lg p-2 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                <p className="body-2 text-slate-700 font-medium whitespace-nowrap">
                  Assigned To:
                </p>
                <div className="min-w-0 flex-1 flex items-center flex-wrap gap-1">
                  {renderAssignedManagers()}
                </div>
              </div>
            </div>
          )}

          {/* Department section */}
          {assignedToDepartment && (
            <div className="bg-slate-50 rounded-lg p-2 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                <p className="body-2 text-slate-700 font-medium whitespace-nowrap">
                  Department:
                </p>
                <div className="min-w-0 flex-1">
                  <p className="body-2 text-slate-700 break-words">
                    {assignedToDepartment}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Horizontal divider between details and owner */}
        <hr className="border-slate-200 my-1" />
        <p className="caption line-clamp-1 text-light-200">
          By:{' '}
          {isLoadingOwnerName
            ? 'Loading...'
            : ownerName ||
              (typeof file.owner === 'object' && file.owner?.fullName
                ? file.owner.fullName
                : typeof file.owner === 'string'
                ? 'Unknown'
                : 'Unknown')}
        </p>
      </div>
    </div>
  );
};

export default Card;
