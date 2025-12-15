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
import { Trash2, FileText, Clock, SquarePen, Save } from 'lucide-react';

import { updateContractExpiryDate } from '@/lib/actions/file.actions';

import type { UIFileDoc } from '@/types/files';
import type { AppUser } from '@/lib/actions/user.actions';
import { fetchUserNamesByIds } from '@/lib/actions/user.actions';
import ManagerAvatars from './ManagerAvatars';
import { useToast } from '@/hooks/use-toast';

const ImageThumbnail = ({
  file,
  status,
}: {
  file: UIFileDoc;
  status?: string;
}) => (
  <div className="file-details-thumbnail flex items-start gap-3">
    <Thumbnail type={file.type} extension={file.extension} url={file.url} />
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between gap-2">
        <p className="subtitle-2 mb-1">{file.name}</p>
        {status && (
          <div
            className={`inline-block px-2 py-1 ${getStatusBadgeClasses(
              status
            )}`}
          >
            {getStatusLabel(status)}
          </div>
        )}
      </div>
      <FormattedDateTime date={file.$createdAt} className="caption" />
      <p className="text-sm text-slate-600">
        {convertFileSize({ sizeInBytes: file.size })}
      </p>
    </div>
  </div>
);

// Map contract status to badge color and label (same as Card component)
const getStatusBadgeClasses = (status: string) => {
  switch (status) {
    case 'pending-review':
      return 'border border-slate-200 bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium';
    case 'action-required':
      return 'border border-slate-200 bg-destructive/10 text-destructive text-xs rounded-xl font-medium';
    case 'active':
      return 'border border-slate-200 bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium';
    case 'inactive':
      return 'border border-slate-200 bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium';
    default:
      return 'border border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-xl font-medium';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending-review':
      return 'Pending Review';
    case 'action-required':
      return 'Action Required';
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export const FileDetails = ({ file }: { file: UIFileDoc }) => {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  );
  const [displayExpiry, setDisplayExpiry] = React.useState<string | undefined>(
    file.contractExpiryDate
  );
  const [assignedManagerUsers, setAssignedManagerUsers] = React.useState<
    AppUser[]
  >([]);
  const [loadingManagers, setLoadingManagers] = React.useState(false);
  const [managerProfileImages, setManagerProfileImages] = React.useState<
    Record<string, string>
  >({});
  const [failedProfileImages, setFailedProfileImages] = React.useState<
    Set<string>
  >(new Set());
  const [ownerFullName, setOwnerFullName] = React.useState<string | null>(null);

  // Fetch owner's full name if owner is a string (user ID)
  React.useEffect(() => {
    const fetchOwnerName = async () => {
      if (typeof file.owner === 'string') {
        try {
          const users = await fetchUserNamesByIds([file.owner]);
          if (users.length > 0 && users[0].fullName) {
            setOwnerFullName(users[0].fullName);
          } else {
            // Fallback to ID if name not found
            setOwnerFullName(file.owner);
          }
        } catch (error) {
          console.error('Failed to fetch owner name:', error);
          // Fallback to ID on error
          setOwnerFullName(file.owner);
        }
      } else if (file.owner?.fullName) {
        setOwnerFullName(file.owner.fullName);
      }
    };

    fetchOwnerName();
  }, [file.owner]);

  const ownerName =
    ownerFullName ||
    (typeof file.owner === 'string' ? file.owner : file.owner?.fullName || '');
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

  // Sync displayExpiry with file prop changes
  React.useEffect(() => {
    setDisplayExpiry(file.contractExpiryDate);
  }, [file.contractExpiryDate]);

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
    if (editing && displayExpiry) {
      setSelectedDate(new Date(displayExpiry));
    }
  }, [editing, displayExpiry]);

  // Fetch assigned manager users
  React.useEffect(() => {
    const fetchAssignedManagers = async () => {
      if (!assignedManagers || assignedManagers.length === 0) {
        setAssignedManagerUsers([]);
        return;
      }

      setLoadingManagers(true);
      try {
        const managerIds = Array.isArray(assignedManagers)
          ? assignedManagers
          : [assignedManagers];

        const fileManagers = await fetchUserNamesByIds(managerIds);

        // Fetch profile images for managers
        const newProfileImages: Record<string, string> = {};
        for (const user of fileManagers) {
          if (user.accountId) {
            try {
              const profileResponse = await fetch(
                `/api/users/${user.accountId}/profile-picture`
              );
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData.url) {
                  newProfileImages[user.$id] = profileData.url;
                  if (user.accountId) {
                    newProfileImages[user.accountId] = profileData.url;
                  }
                }
              }
            } catch (error) {
              console.error(
                `Failed to fetch profile image for ${user.$id}:`,
                error
              );
            }
          }
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
  }, [assignedManagers]);

  // Memoized handler for image load errors
  const handleImageError = React.useCallback(
    (userId: string, accountId?: string) => {
      setFailedProfileImages((prev) => {
        const newSet = new Set(prev);
        if (userId) newSet.add(userId);
        if (accountId) newSet.add(accountId);
        return newSet;
      });
    },
    []
  );

  const renderAssignedManagers = () => {
    if (assignedManagerUsers.length === 0) {
      if (loadingManagers) {
        return <span className="text-slate-400">Loading...</span>;
      }
      if (Array.isArray(assignedManagers) && assignedManagers.length > 0) {
        return (
          <span className="text-slate-800 font-semibold">
            {assignedManagers.join(', ')}
          </span>
        );
      }
      if (typeof assignedManagers === 'string') {
        return (
          <span className="text-slate-800 font-semibold">
            {assignedManagers}
          </span>
        );
      }
      return <span className="text-slate-400">-</span>;
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
    if (selectedDate <= now) {
      toast({
        title: 'Invalid Date',
        description: 'Expiry date must be in the future.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file ID exists
    if (!file.$id || typeof file.$id !== 'string' || file.$id.trim() === '') {
      toast({
        title: 'Error',
        description: 'File document ID is missing or invalid.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const expiryDateISO = selectedDate.toISOString();

      // Use server action to update expiry date (handles authentication properly)
      await updateContractExpiryDate(file.$id, expiryDateISO);

      // Update local state to reflect the change immediately
      setDisplayExpiry(expiryDateISO);
      setEditing(false);

      toast({
        title: 'Success',
        description: 'Expiry date updated successfully.',
      });
    } catch (error: any) {
      console.error('Failed to update expiry date:', error);
      toast({
        title: 'Update Failed',
        description:
          error?.message ||
          'An unexpected error occurred while updating the expiry date.',
        variant: 'destructive',
      });
      // Don't close editing mode on error
    }
  };

  return (
    <>
      <ImageThumbnail file={file} status={status} />
      {/* File Attachment Section */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
          <FileText className="w-4 h-4 text-blue-600" />
          File Information
        </div>

        {/* File Info Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-sm text-slate-500 font-medium mb-1">Owner</p>
            <p className="text-slate-800 font-semibold">{ownerName}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-sm text-slate-500 font-medium mb-1">Created</p>
            <p className="text-slate-800 font-semibold">
              {new Date(file.$createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-sm text-slate-500 font-medium mb-1">
              Last Modified
            </p>
            <p className="text-slate-800 font-semibold">
              {formatDateTime(file.$updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Contract Details Section */}
      {isContract && (
        <div className="space-y-6">
          {/* Grid Layout: Contract Information (Left) + Additional Details (Right) */}

          {/* Left Column: Contract Information */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <FileText className="w-4 h-4 text-blue-600" />
              Contract Information
            </div>
            <div className="grid grid-cols-3 gap-3">
              {/* Priority - Most important (top left) */}
              {priority && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
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
              {/* Contract Amount - Second most important (top middle) */}
              {amount && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    Contract Amount
                  </p>
                  <p className="text-slate-800 font-semibold text-lg">
                    ${amount.toLocaleString()}
                  </p>
                </div>
              )}
              {/* Contract Type - Third most important (top right) */}
              {contractType && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    Contract Type
                  </p>
                  <p className="text-slate-800 font-semibold">
                    {formatValue(contractType, 'contractType')}
                  </p>
                </div>
              )}
              {/* Vendor/Supplier - Fourth (bottom left) */}
              {vendor && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    Vendor/Supplier
                  </p>
                  <p className="text-slate-800 font-semibold">{vendor}</p>
                </div>
              )}
              {/* Department - Fifth (bottom middle) */}
              {department && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    Department
                  </p>
                  <p className="text-slate-800 font-semibold">{department}</p>
                </div>
              )}
              {/* Contract Number - Least important (bottom right) */}
              {contractNumber && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    Contract Number
                  </p>
                  <p className="text-slate-800 font-semibold">
                    {contractNumber}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Additional Details */}

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <FileText className="w-4 h-4 text-blue-600" />
              Additional Details
            </div>
            <div className="space-y-3">
              {compliance && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    Compliance Level
                  </p>
                  <p className="text-slate-800 font-semibold">
                    {formatValue(compliance, 'compliance')}
                  </p>
                </div>
              )}
              {assignedManagers && assignedManagers.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-2">
                    Assigned To
                  </p>
                  {renderAssignedManagers()}
                </div>
              )}
              {description && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    Description
                  </p>
                  <p className="text-slate-800 font-semibold text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Expiry Date Section */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
              <Clock className="w-4 h-4 text-blue-600" />
              Expiry Date
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    Expiry Date
                  </p>
                  <p className="text-slate-800 font-semibold">
                    {displayExpiry
                      ? new Date(displayExpiry).toLocaleDateString('en-US', {
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
                    className="primary-btn px-3 sm:px-4"
                  >
                    <SquarePen className="w-4 h-4" />
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
                          className="text-slate-700"
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
                      className="primary-btn px-3 sm:px-4"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </ShadButton>
                    <ShadButton
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedDate(undefined);
                        setEditing(false);
                      }}
                      className="primary-btn px-3 sm:px-4 text-slate-600 hover:text-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                      Cancel
                    </ShadButton>
                  </div>
                )}
              </div>
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
  const [ownerFullName, setOwnerFullName] = React.useState<string | null>(null);

  // Fetch owner's full name if owner is a string (user ID)
  React.useEffect(() => {
    const fetchOwnerName = async () => {
      if (typeof file.owner === 'string') {
        try {
          const users = await fetchUserNamesByIds([file.owner]);
          if (users.length > 0 && users[0].fullName) {
            setOwnerFullName(users[0].fullName);
          } else {
            // Fallback to ID if name not found
            setOwnerFullName(file.owner);
          }
        } catch (error) {
          console.error('Failed to fetch owner name:', error);
          // Fallback to ID on error
          setOwnerFullName(file.owner);
        }
      } else if (file.owner?.fullName) {
        setOwnerFullName(file.owner.fullName);
      }
    };
    fetchOwnerName();
  }, [file.owner]);

  const ownerName =
    ownerFullName ||
    (typeof file.owner === 'string' ? file.owner : file.owner?.fullName || '');

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
            {convertFileSize({ sizeInBytes: file.size })}
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
