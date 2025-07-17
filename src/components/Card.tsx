'use client';

import Link from 'next/link';
import { Models } from 'node-appwrite';
import React, { useEffect, useState } from 'react';
import Thumbnail from './Thumbnail';
import { convertFileSize } from '@/lib/utils';
import FormattedDateTime from './FormattedDateTime';
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

interface CardProps {
  file: Models.Document;
  status?: string;
}

const Card = ({ file, status }: CardProps) => {
  const [contractStatus, setContractStatus] = useState<string | undefined>(
    status || file.status
  );

  useEffect(() => {
    // If status is not present but contractId exists, fetch the contract status
    if (!status && !file.status && file.contractId) {
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
      })();
    }
  }, [file.contractId, status, file.status]);

  return (
    <Link href={file.url} target="_blank" className="file-card">
      <div className="flex justify-between text-slate-700">
        <Thumbnail
          type={file.type}
          extension={file.extension}
          url={file.url}
          className="!size-20"
          imageClassName="!size-11"
        />
        <div className="flex flex-col items-end justify-between">
          <ActionDropdown file={file} />
          <p className="body-1">{convertFileSize(file.size)}</p>
        </div>
      </div>
      <div className="file-card-details">
        <p className="subtitle-2 line-clamp-1">{file.name}</p>
        {contractStatus && statusBadge(contractStatus)}
        <FormattedDateTime
          date={file.$createdAt}
          className="body-2 text-slate-700"
        />
        <p className="caption line-clamp-1 text-light-200">
          By: {file.owner.fullName}
        </p>
      </div>
    </Link>
  );
};

export default Card;
