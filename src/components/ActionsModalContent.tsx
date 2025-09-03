//
import React from 'react';
import FormattedDateTime from './FormattedDateTime';
import Thumbnail from './Thumbnail';
import { convertFileSize } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import Image from 'next/image';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button as ShadButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { databases } from '@/lib/appwrite/client';
import { appwriteConfig } from '@/lib/appwrite/config';

import type { UIFileDoc } from '@/types/files';

const ImageThumbnail = ({ file }: { file: UIFileDoc }) => (
  <div className="file-details-thumbnail">
    <Thumbnail type={file.type} extension={file.extension} url={file.url} />
    <div className="flex flex-col">
      <p className="subtitle-2 mb-1">{file.name}</p>
      <FormattedDateTime date={file.$createdAt} className="caption" />
    </div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex">
    <p className="file-details-label text-left">{label}</p>
    <p className="file-details-value text-left">{value}</p>
  </div>
);

export const FileDetails = ({ file }: { file: UIFileDoc }) => {
  const [editing, setEditing] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  );

  const ownerName =
    typeof file.owner === 'string' ? file.owner : file.owner.fullName;
  const isContract =
    file.type === 'contract' ||
    /contract/i.test(file.name) ||
    file.contractId ||
    file.contractName ||
    file.contractType ||
    file.amount ||
    file.vendor ||
    file.department;

  // Get contract metadata from file document
  const contractName = file.contractName || file.name;
  const contractType = file.contractType;
  const contractNumber = file.contractNumber;
  const amount = file.amount;
  const vendor = file.vendor;
  const department = file.department;
  const priority = file.priority;
  const compliance = file.compliance;
  const assignedManagers = file.assignedManagers || [];
  const description = file.description;
  const currentExpiry: string | undefined = file.contractExpiryDate;
  const status = file.status;

  // Debug logging to see what data is available
  console.log('🔍 FileDetails Debug:', {
    fileId: file.$id,
    fileName: file.name,
    isContract,
    contractId: file.contractId,
    contractName,
    contractType,
    contractNumber,
    amount,
    vendor,
    department,
    priority,
    compliance,
    assignedManagers,
    description,
    currentExpiry,
    status,
    fullFile: file,
  });

  // Initialize selectedDate with current expiry date when editing starts
  React.useEffect(() => {
    if (editing && currentExpiry) {
      setSelectedDate(new Date(currentExpiry));
    }
  }, [editing, currentExpiry]);

  // Helper function to format priority and compliance values
  const formatValue = (
    value: string | undefined,
    type: 'priority' | 'compliance' | 'contractType'
  ) => {
    if (!value) return '';

    if (type === 'priority') {
      const priorityMapping: Record<string, string> = {
        Low: 'Low',
        Medium: 'Medium',
        High: 'High',
        Urgent: 'Urgent',
      };
      return priorityMapping[value] || value;
    }

    if (type === 'compliance') {
      const complianceMapping: Record<string, string> = {
        'up-to-date': 'Low Risk',
        'action-required': 'Medium Risk',
        'non-compliant': 'High Risk',
      };
      return complianceMapping[value] || value;
    }

    if (type === 'contractType') {
      const contractTypeMapping: Record<string, string> = {
        Service_Agreement: 'Service Agreement',
        Purchase_Order: 'Purchase Order',
        License_Agreement: 'License Agreement',
        NDA_: 'NDA',
        Employment_Contract: 'Employment Contract',
        Vendor_Contract: 'Vendor Contract',
        Lease_Agreement: 'Lease Agreement',
        Consulting_Agreement: 'Consulting Agreement',
        Other: 'Other',
      };
      return contractTypeMapping[value] || value;
    }

    return value;
  };

  const saveExpiry = async () => {
    if (!selectedDate) return;
    const now = new Date();
    if (selectedDate <= now) return;
    try {
      // Update both file document and contract document
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        file.$id,
        { contractExpiryDate: selectedDate.toISOString() }
      );

      // Also update the contract document if linked
      if (file.contractId) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.contractsCollectionId,
          file.contractId,
          { contractExpiryDate: selectedDate.toISOString() }
        );
      }
    } catch (error) {
      console.error('Failed to update expiry date:', error);
    }
    setEditing(false);
  };

  return (
    <>
      <ImageThumbnail file={file} />
      <div className="space-y-4 px-2 pt-2">
        {/* Basic file information */}
        <DetailRow label="Format:" value={file.extension} />
        <DetailRow label="Size:" value={convertFileSize(file.size)} />
        <DetailRow label="Owner:" value={ownerName} />

        {/* Contract information - only show if it's a contract */}
        {isContract && (
          <>
            {/* Contract Name */}
            <DetailRow label="Contract Name:" value={contractName} />

            {/* Contract Type */}
            {contractType && (
              <DetailRow
                label="Contract Type:"
                value={formatValue(contractType, 'contractType')}
              />
            )}

            {/* Contract Number */}
            {contractNumber && (
              <DetailRow label="Contract Number:" value={contractNumber} />
            )}

            {/* Amount */}
            {amount && (
              <DetailRow
                label="Contract Amount:"
                value={`$${amount.toLocaleString()}`}
              />
            )}

            {/* Vendor */}
            {vendor && <DetailRow label="Vendor/Supplier:" value={vendor} />}

            {/* Department */}
            {department && <DetailRow label="Department:" value={department} />}

            {/* Priority */}
            {priority && (
              <DetailRow
                label="Priority:"
                value={formatValue(priority, 'priority')}
              />
            )}

            {/* Compliance */}
            {compliance && (
              <DetailRow
                label="Compliance Level:"
                value={formatValue(compliance, 'compliance')}
              />
            )}

            {/* Assigned Managers */}
            {assignedManagers && assignedManagers.length > 0 && (
              <DetailRow
                label="Assigned To:"
                value={assignedManagers.join(', ')}
              />
            )}

            {/* Description */}
            {description && (
              <DetailRow label="Description:" value={description} />
            )}

            {/* Status */}
            {status && <DetailRow label="Status:" value={status} />}

            {/* Expiry Date - Editable */}
            <div className="flex items-start justify-between gap-2">
              <p className="file-details-label text-left">Expiry Date:</p>
              <div
                className="file-details-value text-left"
                style={{ pointerEvents: 'auto' }}
              >
                {!editing ? (
                  <div
                    className="flex items-center gap-2"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <span>
                      {currentExpiry
                        ? new Date(currentExpiry).toLocaleDateString()
                        : '—'}
                    </span>
                    <ShadButton
                      size="sm"
                      onClick={() => setEditing(true)}
                      className="primary-btn"
                    >
                      Edit
                    </ShadButton>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <ShadButton
                          variant="outline"
                          className={cn(
                            'w-[200px] justify-start text-left font-normal'
                          )}
                        >
                          {selectedDate
                            ? selectedDate.toLocaleDateString()
                            : 'Pick a date'}
                        </ShadButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today; // disable past dates
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <ShadButton
                      size="sm"
                      onClick={saveExpiry}
                      disabled={!selectedDate}
                      className="primary-btn"
                    >
                      Submit
                    </ShadButton>
                    <ShadButton
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedDate(undefined);
                        setEditing(false);
                      }}
                      className="primary-btn"
                    >
                      Cancel
                    </ShadButton>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <DetailRow label="Last edit:" value={formatDateTime(file.$updatedAt)} />
      </div>
    </>
  );
};

interface Props {
  file: UIFileDoc;
  onInputChange: React.Dispatch<React.SetStateAction<string[]>>;
  onRemove: (email: string) => void;
}

export const ShareInput = ({ file, onInputChange, onRemove }: Props) => {
  const ownerName =
    typeof file.owner === 'string' ? file.owner : file.owner.fullName;
  return (
    <>
      <ImageThumbnail file={file} />

      <div className="share-wrapper" style={{ pointerEvents: 'none' }}>
        <p
          className="subtitle-2 pl-1 text-light-100"
          style={{ pointerEvents: 'none' }}
        >
          Share file with other users
        </p>
        <Input
          type="email"
          placeholder="Enter email addresses"
          onChange={(e) => onInputChange(e.target.value.trim().split(','))}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="share-input-field"
        />
        <div className="pt-4">
          <div className="flex justify-between">
            <p className="subtitle-2 text-light-100">Shared with</p>
            <p className="subtitle-2 text-light-100">
              {file.users.length} users
            </p>
          </div>
          <ul className="pt-2">
            {file.users.map((email: string) => (
              <li
                key={email}
                className="flex items-center justify-between gap-2"
              >
                <p className="subtitle-2">{email}</p>
                <Button
                  onClick={() => onRemove(email)}
                  className="share-remove-user"
                >
                  <Image
                    src="/assets/icons/remove.svg"
                    alt="Remove"
                    width={24}
                    height={24}
                    className="remove-icon"
                  />
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <DetailRow label="Format" value={file.extension} />
        <DetailRow label="Size" value={convertFileSize(file.size)} />
        <DetailRow label="Owner" value={ownerName} />
        <DetailRow label="Format" value={formatDateTime(file.$updatedAt)} />
      </div>
    </>
  );
};
