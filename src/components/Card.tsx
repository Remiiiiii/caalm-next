'use client';

// import Link from 'next/link'; // Removed since we no longer use Link component
import { Models } from 'node-appwrite';
import { useEffect, useState } from 'react';
import Thumbnail from './Thumbnail';
import { convertFileSize } from '@/lib/utils';
import FormattedDateTime from './FormattedDateTime';
import { FormattedDate } from './FormattedDateTime';
import ActionDropdown from './ActionDropdown';
import { fetchUserNamesByIds } from '@/lib/actions/user.actions';

// Map contract status to badge color and label
const statusBadge = (status: string) => {
  let color = '';
  let label = status;
  switch (status) {
    case 'pending-review':
      color =
        'bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium mr-auto';
      label = 'Pending Review';
      break;
    case 'action-required':
      color =
        'bg-destructive/10 text-destructive text-xs rounded-xl font-medium mr-auto';
      label = 'Action Required';
      break;
    case 'active':
      color = 'bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium';
      label = 'Active';
      break;
    case 'inactive':
      color =
        'bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium mr-auto';
      label = 'Inactive';
      break;
    default:
      color = 'bg-slate-100 text-slate-800 text-xs rounded-xl font-medium';
      label = status;
  }
  return <span className={`inline-block px-2 py-1 ${color}`}>{label}</span>;
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
            console.log(`[Card] Fetched users for ${userIdToFetch}:`, users);

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent the default link behavior - we don't want to open files in new tabs anymore
    e.preventDefault();
    e.stopPropagation();
    // The file viewing is now handled by the DocumentViewer modal through the ActionDropdown
  };

  return (
    <div className="file-card" onClick={handleCardClick}>
      <div className="flex justify-between text-slate-700">
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
          <p className="body-1">
            {convertFileSize({ sizeInBytes: file.size })}
          </p>
        </div>
      </div>
      <div className="file-card-details">
        <p className="subtitle-2 line-clamp-1">{file.name}</p>
        {contractStatus && statusBadge(contractStatus)}
        <div className="flex flex-col gap-1">
          <div className="flex flex-row gap-2">
            <p className="body-2 text-slate-700">Uploaded on:</p>
            <FormattedDateTime
              date={file.$createdAt}
              className="body-2 text-slate-700"
            />
          </div>
          {contractExpiryDate && (
            <div className="flex flex-row gap-2">
              <p className="body-2 text-slate-700">Expires on:</p>
              <FormattedDate
                date={contractExpiryDate}
                className="body-2 text-slate-700"
              />
            </div>
          )}
          {assignedTo && (
            <div className="flex flex-row gap-2">
              <p className="body-2 text-slate-700">Assigned To:</p>
              <p className="body-2 text-slate-700">{assignedTo}</p>
            </div>
          )}
          {assignedToDepartment && (
            <div className="flex flex-row gap-2">
              <p className="body-2 text-slate-700">Department:</p>
              <p className="body-2 text-slate-700">{assignedToDepartment}</p>
            </div>
          )}
        </div>
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
