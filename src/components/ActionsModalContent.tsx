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

import { databases } from '@/lib/appwrite/client';
import { appwriteConfig } from '@/lib/appwrite/config';

import type { UIFileDoc } from '@/types/files';

const ImageThumbnail = ({ file }: { file: UIFileDoc }) => (
  <div className="file-details-thumbnail">
    <Thumbnail type={file.type} extension={file.extension} url={file.url} />
    <div className="flex flex-col">
      <p className="subtitle-2 mb-1">{file.name}</p>
      <FormattedDateTime date={file.$createdAt} className="caption" />
      <p className="text-sm text-slate-600">{convertFileSize(file.size)}</p>
    </div>
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
      if (
        file.contractId &&
        typeof file.contractId === 'string' &&
        file.contractId.length <= 36
      ) {
        try {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.contractsCollectionId,
            file.contractId,
            { contractExpiryDate: selectedDate.toISOString() }
          );
          console.log('✅ Contract document updated successfully');
        } catch (contractError) {
          console.error(
            '⚠️ Failed to update contract document:',
            contractError
          );
          // Continue execution even if contract update fails
        }
      } else {
        console.log(
          'ℹ️ No valid contractId found, skipping contract document update'
        );
      }
    } catch (error) {
      console.error('Failed to update expiry date:', error);
    }
    setEditing(false);
  };

  return (
    <>
      {status && (
        <div
          className={`px-2 py-1 max-w-[50px] border-light-200/40 bg-light-400/50 ml-auto rounded-full text-xs font-medium ${
            status === 'active'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : status === 'expired'
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      )}
      {/* Enhanced Header Section */}
      <ImageThumbnail file={file} />

      <div className="bg-white  rounded-xl p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div></div>
          </div>
        </div>

        {/* File Info Row */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500 font-medium">Owner</p>
            <p className="text-slate-800 font-semibold">{ownerName}</p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Created</p>
            <p className="text-slate-800 font-semibold">
              {new Date(file.$createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-medium">Last Modified</p>
            <p className="text-slate-800 font-semibold">
              {formatDateTime(file.$updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Contract Details Section */}
      {isContract && (
        <div className="p-4 space-y-4">
          {/* Grid Layout: Contract Information (Left) + Additional Details (Right) */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column: Contract Information */}
            <div>
              <h3 className="text-lg font-semibold sidebar-gradient-text mb-3">
                Contract Information
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {contractType && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Contract Type
                    </p>
                    <p className="text-slate-800 font-semibold">
                      {formatValue(contractType, 'contractType')}
                    </p>
                  </div>
                )}
                {contractNumber && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Contract Number
                    </p>
                    <p className="text-slate-800 font-semibold">
                      {contractNumber}
                    </p>
                  </div>
                )}
                {amount && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Contract Amount
                    </p>
                    <p className="text-slate-800 font-semibold text-lg">
                      ${amount.toLocaleString()}
                    </p>
                  </div>
                )}
                {vendor && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Vendor/Supplier
                    </p>
                    <p className="text-slate-800 font-semibold">{vendor}</p>
                  </div>
                )}
                {department && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Department
                    </p>
                    <p className="text-slate-800 font-semibold">{department}</p>
                  </div>
                )}
                {priority && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Priority
                    </p>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          priority === 'Urgent'
                            ? 'bg-red-500'
                            : priority === 'High'
                            ? 'bg-orange-500'
                            : priority === 'Medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      ></span>
                      <span className="text-slate-800 font-semibold">
                        {formatValue(priority, 'priority')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Additional Details */}
            <div>
              <h3 className="text-lg font-semibold sidebar-gradient-text mb-3">
                Additional Details
              </h3>
              <div className="space-y-3">
                {compliance && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Compliance Level
                    </p>
                    <p className="text-slate-800 font-semibold">
                      {formatValue(compliance, 'compliance')}
                    </p>
                  </div>
                )}
                {assignedManagers && assignedManagers.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Assigned To
                    </p>
                    <p className="text-slate-800 font-semibold">
                      {assignedManagers.join(', ')}
                    </p>
                  </div>
                )}
                {description && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 font-medium mb-1">
                      Description
                    </p>
                    <p className="text-slate-800 font-semibold">
                      {description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expiry Date Section */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium mb-1">
                  Expiry Date
                </p>
                <p className="text-blue-900 font-semibold">
                  {currentExpiry
                    ? new Date(currentExpiry).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Not set'}
                </p>
              </div>
              {!editing ? (
                <ShadButton
                  onClick={() => setEditing(true)}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Edit Date
                </ShadButton>
              ) : (
                <div className="flex items-center space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <ShadButton
                        variant="outline"
                        size="sm"
                        className="w-[180px] justify-start text-left font-normal border-blue-300"
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
                          return date < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <ShadButton
                    size="sm"
                    onClick={saveExpiry}
                    disabled={!selectedDate}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Save
                  </ShadButton>
                  <ShadButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedDate(undefined);
                      setEditing(false);
                    }}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </ShadButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
        <div className="flex items-center justify-between py-2 border-t border-slate-200">
          <span className="text-sm text-slate-600 font-medium">Format</span>
          <span className="text-sm text-slate-800 font-semibold">
            {file.extension}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-slate-200">
          <span className="text-sm text-slate-600 font-medium">Size</span>
          <span className="text-sm text-slate-800 font-semibold">
            {convertFileSize(file.size)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-slate-200">
          <span className="text-sm text-slate-600 font-medium">Owner</span>
          <span className="text-sm text-slate-800 font-semibold">
            {ownerName}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-slate-200">
          <span className="text-sm text-slate-600 font-medium">
            Last Modified
          </span>
          <span className="text-sm text-slate-800 font-semibold">
            {formatDateTime(file.$updatedAt)}
          </span>
        </div>
      </div>
    </>
  );
};
