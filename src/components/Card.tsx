'use client';

// import Link from 'next/link'; // Removed since we no longer use Link component
import { Models } from 'node-appwrite';
import React, { useEffect, useState } from 'react';
import Thumbnail from './Thumbnail';
import { convertFileSize } from '@/lib/utils';
import FormattedDateTime from './FormattedDateTime';
import { FormattedDate } from './FormattedDateTime';
import ActionDropdown from './ActionDropdown';

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

  useEffect(() => {
    // If status is not present but contractId exists, fetch the contract status
    if (!status && !file.status && !expirationDate && file.contractId) {
      (async () => {
        // Dynamically import to avoid SSR issues
        const { getContracts } = await import('@/lib/actions/file.actions');
        const contractsRes = await getContracts();
        const contracts = Array.isArray(contractsRes.documents)
          ? contractsRes.documents
          : [];
        const contract = contracts.find(
          (c: Models.Document) => c.$id === file.contractId
        );
        if (contract && contract.status) {
          setContractStatus(contract.status);
        }

        if (contract && contract.contractExpiryDate) {
          setContractExpiryDate(contract.contractExpiryDate);
        }

        if (contract && contract.assignedTo) {
          setAssignedTo(contract.assignedTo);
        }

        if (contract && contract.assignedToDepartment) {
          setAssignedToDepartment(contract.assignedToDepartment);
        }
      })();
    }
  }, [file.contractId, status, file.status, expirationDate]);

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
            onRefresh={onRefresh}
            userRole={userRole}
          />
          <p className="body-1">{convertFileSize(file.size)}</p>
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
          {typeof file.owner === 'string' ? file.owner : file.owner.fullName}
        </p>
      </div>
    </div>
  );
};

export default Card;
