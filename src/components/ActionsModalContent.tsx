//
import React from 'react';
import FormattedDateTime from './FormattedDateTime';
import Thumbnail from './Thumbnail';
import {
  convertFileSize,
  formatDateTime,
  getProfilePictureUrl,
} from '@/lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import Image from 'next/image';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button as ShadButton } from '@/components/ui/button';
import {
  Trash2,
  FileText,
  Clock,
  SquarePen,
  Save,
  ChevronDown,
  Users,
  X,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
      return 'border-2 border-amber-400 bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium';
    case 'action-required':
      return 'border-2 border-red-400 bg-destructive/10 text-destructive text-xs rounded-xl font-medium';
    case 'active':
      return 'border-2 border-cyan-400 bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium';
    case 'inactive':
      return 'border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium';
    default:
      return 'border-2 border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-xl font-medium';
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
  const [contractOwnerFullName, setContractOwnerFullName] = React.useState<
    string | null
  >(null);

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

  // Fetch contract owner's full name if contractOwnerId exists
  React.useEffect(() => {
    const fetchContractOwnerName = async () => {
      const contractOwnerId = (file as any).contractOwnerId;
      if (contractOwnerId && typeof contractOwnerId === 'string') {
        try {
          const users = await fetchUserNamesByIds([contractOwnerId]);
          if (users.length > 0 && users[0].fullName) {
            setContractOwnerFullName(users[0].fullName);
          } else {
            // Fallback to ID if name not found
            setContractOwnerFullName(contractOwnerId);
          }
        } catch (error) {
          console.error('Failed to fetch contract owner name:', error);
          // Fallback to ID on error
          setContractOwnerFullName(contractOwnerId);
        }
      }
    };

    fetchContractOwnerName();
  }, [(file as any).contractOwnerId]);

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

        // Generate profile image URLs from profileImageId
        const newProfileImages: Record<string, string> = {};
        for (const user of fileManagers) {
          if (user.profileImageId) {
            const profileImageUrl = getProfilePictureUrl(user.profileImageId);
            if (profileImageUrl) {
              newProfileImages[user.$id] = profileImageUrl;
              if (user.accountId) {
                newProfileImages[user.accountId] = profileImageUrl;
              }
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

  // Helper function to format and display values, returning "N/A" for null/empty
  const formatDisplayValue = (
    value: any,
    type?:
      | 'priority'
      | 'compliance'
      | 'contractType'
      | 'date'
      | 'currency'
      | 'boolean'
      | 'array'
  ): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    if (type === 'boolean') {
      return value === true ? 'Yes' : value === false ? 'No' : 'N/A';
    }

    if (type === 'array') {
      if (Array.isArray(value) && value.length > 0) {
        return value.join(', ');
      }
      return 'N/A';
    }

    if (type === 'date' && value) {
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return String(value);
      }
    }

    if (type === 'currency' && typeof value === 'number') {
      return `$${value.toLocaleString()}`;
    }

    if (type === 'priority') {
      const priorityMapping: Record<string, string> = {
        Low: 'Low',
        Medium: 'Medium',
        High: 'High',
        Urgent: 'Urgent',
      };
      return priorityMapping[String(value)] || String(value);
    }

    if (type === 'compliance') {
      const complianceMapping: Record<string, string> = {
        'up-to-date': 'Low Risk',
        'action-required': 'Medium Risk',
        'non-compliant': 'High Risk',
      };
      return complianceMapping[String(value)] || String(value);
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
      return contractTypeMapping[String(value)] || String(value);
    }

    return String(value);
  };

  // Helper component to render a field
  const renderField = (
    label: string,
    value: any,
    type?:
      | 'priority'
      | 'compliance'
      | 'contractType'
      | 'date'
      | 'currency'
      | 'boolean'
      | 'array'
  ) => (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
      {type === 'priority' && value ? (
        <div className="flex items-center space-x-2">
          <span
            className={`w-3 h-3 rounded-full ${
              value === 'Urgent'
                ? 'bg-red-500'
                : value === 'High'
                ? 'bg-orange-500'
                : value === 'Medium'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
          ></span>
          <span className="text-slate-800 font-semibold">
            {formatDisplayValue(value, type)}
          </span>
        </div>
      ) : (
        <p className="text-slate-800 font-semibold">
          {formatDisplayValue(value, type)}
        </p>
      )}
    </div>
  );

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

  // Extract all contract attributes from file
  const contractAttributes = {
    // Basic Information
    contractName: file.contractName || file.name,
    contractNumber: file.contractNumber,
    contractType: file.contractType,
    contractCategory: (file as any).contractCategory,
    status: file.status,
    lifecycleStatus: (file as any).lifecycleStatus,
    priority: file.priority,
    description: file.description,

    // Financial
    amount: file.amount,
    currencyCode: (file as any).currencyCode,
    notToExceedAmount: (file as any).notToExceedAmount,
    paymentTerms: (file as any).paymentTerms,
    paymentSchedule: (file as any).paymentSchedule,
    budgetCode: (file as any).budgetCode,
    costCenter: (file as any).costCenter,

    // Dates
    startDate: (file as any).startDate,
    executionDate: (file as any).executionDate,
    contractExpiryDate: displayExpiry || file.contractExpiryDate,
    daysUntilExpiry: (file as any).daysUntilExpiry,

    // Organization
    orgId: (file as any).orgId,
    department: file.department,
    division: (file as any).division,
    subDepartment: (file as any).subDepartment,
    businessUnit: (file as any).businessUnit,
    departmentOwner: (file as any).departmentOwner,
    contractOwnerId: (file as any).contractOwnerId,

    // Counterparty
    vendor: file.vendor,
    counterpartyLegalName: (file as any).counterpartyLegalName,
    counterpartyContactEmail: (file as any).counterpartyContactEmail,
    counterpartyContactPhone: (file as any).counterpartyContactPhone,
    counterpartyAddress: (file as any).counterpartyAddress,
    counterpartyType: (file as any).counterpartyType,
    counterpartyTaxId: (file as any).counterpartyTaxId,
    counterpartyDunsNumber: (file as any).counterpartyDunsNumber,

    // Compliance & Risk
    compliance: file.compliance,
    complianceLevel: (file as any).complianceLevel,
    riskLevel: (file as any).riskLevel,
    regulatoryRequirements: (file as any).regulatoryRequirements,
    hipaaRequired: (file as any).hipaaRequired,
    dataPrivacyRequirements: (file as any).dataPrivacyRequirements,

    // Insurance & Legal
    insuranceRequired: (file as any).insuranceRequired,
    insuranceVerifiedDate: (file as any).insuranceVerifiedDate,
    insuranceExpiryDate: (file as any).insuranceExpiryDate,
    indemnificationIncluded: (file as any).indemnificationIncluded,
    backgroundCheckRequired: (file as any).backgroundCheckRequired,

    // Contract Terms
    autoRenew: (file as any).autoRenew,
    renewalNoticeDays: (file as any).renewalNoticeDays,
    terminationNoticeDays: (file as any).terminationNoticeDays,
    terminationRights: (file as any).terminationRights,
    curePeriodDays: (file as any).curePeriodDays,
    postTerminationObligations: (file as any).postTerminationObligations,

    // Approval & Workflow
    approvalWorkflowTemplate: (file as any).approvalWorkflowTemplate,
    currentApprovalStage: (file as any).currentApprovalStage,
    approvalHistoryLog: (file as any).approvalHistoryLog,
    reviewerComments: (file as any).reviewerComments,
    internalApproverIds: (file as any).internalApproverIds,

    // Related Documents
    relatedDocumentIds: (file as any).relatedDocumentIds,
    attachmentReferences: (file as any).attachmentReferences,
    parentContractId: (file as any).parentContractId,
    templateUsed: (file as any).templateUsed,
    versionNumber: (file as any).versionNumber,

    // Performance & Metrics
    serviceLevelAgreements: (file as any).serviceLevelAgreements,
    performanceMetrics: (file as any).performanceMetrics,
    reportingRequirements: (file as any).reportingRequirements,
    auditRightsGranted: (file as any).auditRightsGranted,
    keyObligations: (file as any).keyObligations,

    // File Information
    fileId: (file as any).fileId,
    extension: file.extension,
    size: file.size,
  };

  return (
    <>
      <ImageThumbnail file={file} status={status} />

      <Accordion
        type="multiple"
        className="w-full space-y-4"
        defaultValue={['file-info', 'contract-info']}
      >
        {/* File Information Accordion */}
        <AccordionItem
          value="file-info"
          className="bg-slate-50 rounded-lg border border-slate-200 px-4"
        >
          <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
            <FileText className="w-4 h-4 text-blue-600" />
            File Information
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {renderField('Owner', ownerName || 'N/A')}
              {renderField('Created', file.$createdAt, 'date')}
              {renderField('Last Modified', file.$updatedAt, 'date')}
              {renderField('File ID', contractAttributes.fileId)}
              {renderField('Extension', contractAttributes.extension)}
              {renderField(
                'Size',
                contractAttributes.size
                  ? convertFileSize({ sizeInBytes: contractAttributes.size })
                  : 'N/A'
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Contract Information Accordion */}
        {isContract && (
          <>
            <AccordionItem
              value="contract-info"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Contract Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Priority',
                    contractAttributes.priority,
                    'priority'
                  )}
                  {renderField(
                    'Contract Amount',
                    contractAttributes.amount,
                    'currency'
                  )}
                  {renderField(
                    'Contract Type',
                    contractAttributes.contractType,
                    'contractType'
                  )}
                  {renderField('Vendor/Supplier', contractAttributes.vendor)}
                  {renderField('Department', contractAttributes.department)}
                  {renderField(
                    'Contract Number',
                    contractAttributes.contractNumber
                  )}
                  {renderField(
                    'Contract Name',
                    contractAttributes.contractName
                  )}
                  {renderField('Status', contractAttributes.status)}
                  {renderField(
                    'Lifecycle Status',
                    contractAttributes.lifecycleStatus
                  )}
                  {renderField(
                    'Contract Category',
                    contractAttributes.contractCategory
                  )}
                  {renderField('Description', contractAttributes.description)}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Dates & Timeline Accordion */}
            <AccordionItem
              value="dates"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <Clock className="w-4 h-4 text-blue-600" />
                Dates & Timeline
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">
                          Expiry Date
                        </p>
                        <p className="text-slate-800 font-semibold">
                          {displayExpiry
                            ? new Date(displayExpiry).toLocaleDateString(
                                'en-US',
                                {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                }
                              )
                            : 'N/A'}
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
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
                  {renderField(
                    'Start Date',
                    contractAttributes.startDate,
                    'date'
                  )}
                  {renderField(
                    'Execution Date',
                    contractAttributes.executionDate,
                    'date'
                  )}
                  {renderField(
                    'Days Until Expiry',
                    contractAttributes.daysUntilExpiry
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Counterparty Information Accordion */}
            <AccordionItem
              value="counterparty"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Counterparty Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Counterparty Legal Name',
                    contractAttributes.counterpartyLegalName
                  )}
                  {renderField(
                    'Contact Email',
                    contractAttributes.counterpartyContactEmail
                  )}
                  {renderField(
                    'Contact Phone',
                    contractAttributes.counterpartyContactPhone
                  )}
                  {renderField(
                    'Address',
                    contractAttributes.counterpartyAddress
                  )}
                  {renderField('Type', contractAttributes.counterpartyType)}
                  {renderField('Tax ID', contractAttributes.counterpartyTaxId)}
                  {renderField(
                    'DUNS Number',
                    contractAttributes.counterpartyDunsNumber
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Financial Details Accordion */}
            <AccordionItem
              value="financial"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Financial Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Currency Code',
                    contractAttributes.currencyCode
                  )}
                  {renderField(
                    'Not To Exceed Amount',
                    contractAttributes.notToExceedAmount,
                    'currency'
                  )}
                  {renderField(
                    'Payment Terms',
                    contractAttributes.paymentTerms
                  )}
                  {renderField(
                    'Payment Schedule',
                    contractAttributes.paymentSchedule
                  )}
                  {renderField('Budget Code', contractAttributes.budgetCode)}
                  {renderField('Cost Center', contractAttributes.costCenter)}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Compliance & Risk Accordion */}
            <AccordionItem
              value="compliance"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Compliance & Risk
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Compliance Level',
                    contractAttributes.complianceLevel
                  )}
                  {renderField(
                    'Compliance Status',
                    contractAttributes.compliance,
                    'compliance'
                  )}
                  {renderField('Risk Level', contractAttributes.riskLevel)}
                  {renderField(
                    'Regulatory Requirements',
                    contractAttributes.regulatoryRequirements
                  )}
                  {renderField(
                    'HIPAA Required',
                    contractAttributes.hipaaRequired,
                    'boolean'
                  )}
                  {renderField(
                    'Data Privacy Requirements',
                    contractAttributes.dataPrivacyRequirements
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Insurance & Legal Accordion */}
            <AccordionItem
              value="insurance"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Insurance & Legal
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Insurance Required',
                    contractAttributes.insuranceRequired,
                    'boolean'
                  )}
                  {renderField(
                    'Insurance Verified Date',
                    contractAttributes.insuranceVerifiedDate,
                    'date'
                  )}
                  {renderField(
                    'Insurance Expiry Date',
                    contractAttributes.insuranceExpiryDate,
                    'date'
                  )}
                  {renderField(
                    'Indemnification Included',
                    contractAttributes.indemnificationIncluded,
                    'boolean'
                  )}
                  {renderField(
                    'Background Check Required',
                    contractAttributes.backgroundCheckRequired,
                    'boolean'
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Contract Terms Accordion */}
            <AccordionItem
              value="terms"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Contract Terms
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Auto Renew',
                    contractAttributes.autoRenew,
                    'boolean'
                  )}
                  {renderField(
                    'Renewal Notice Days',
                    contractAttributes.renewalNoticeDays
                  )}
                  {renderField(
                    'Termination Notice Days',
                    contractAttributes.terminationNoticeDays
                  )}
                  {renderField(
                    'Termination Rights',
                    contractAttributes.terminationRights
                  )}
                  {renderField(
                    'Cure Period Days',
                    contractAttributes.curePeriodDays
                  )}
                  {renderField(
                    'Post Termination Obligations',
                    contractAttributes.postTerminationObligations
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Organization & Ownership Accordion */}
            <AccordionItem
              value="organization"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Organization & Ownership
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField('Organization ID', contractAttributes.orgId)}
                  {renderField(
                    'Contract Owner',
                    contractOwnerFullName || contractAttributes.contractOwnerId
                  )}
                  {renderField(
                    'Department Owner',
                    contractAttributes.departmentOwner
                  )}
                  {renderField(
                    'Business Unit',
                    contractAttributes.businessUnit
                  )}
                  {renderField(
                    'Sub Department',
                    contractAttributes.subDepartment
                  )}
                  {renderField('Division', contractAttributes.division)}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Approval & Workflow Accordion */}
            <AccordionItem
              value="approval"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Approval & Workflow
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Approval Workflow Template',
                    contractAttributes.approvalWorkflowTemplate
                  )}
                  {renderField(
                    'Current Approval Stage',
                    contractAttributes.currentApprovalStage
                  )}
                  {renderField(
                    'Approval History Log',
                    contractAttributes.approvalHistoryLog
                  )}
                  {renderField(
                    'Reviewer Comments',
                    contractAttributes.reviewerComments
                  )}
                  {renderField(
                    'Internal Approver IDs',
                    contractAttributes.internalApproverIds,
                    'array'
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Related Documents Accordion */}
            <AccordionItem
              value="documents"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Related Documents
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Related Document IDs',
                    contractAttributes.relatedDocumentIds,
                    'array'
                  )}
                  {renderField(
                    'Attachment References',
                    contractAttributes.attachmentReferences,
                    'array'
                  )}
                  {renderField(
                    'Parent Contract ID',
                    contractAttributes.parentContractId
                  )}
                  {renderField(
                    'Template Used',
                    contractAttributes.templateUsed
                  )}
                  {renderField(
                    'Version Number',
                    contractAttributes.versionNumber
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Performance & Metrics Accordion */}
            <AccordionItem
              value="performance"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Performance & Metrics
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {renderField(
                    'Service Level Agreements',
                    contractAttributes.serviceLevelAgreements
                  )}
                  {renderField(
                    'Performance Metrics',
                    contractAttributes.performanceMetrics
                  )}
                  {renderField(
                    'Reporting Requirements',
                    contractAttributes.reportingRequirements
                  )}
                  {renderField(
                    'Audit Rights Granted',
                    contractAttributes.auditRightsGranted,
                    'boolean'
                  )}
                  {renderField(
                    'Key Obligations',
                    contractAttributes.keyObligations,
                    'array'
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Additional Details Accordion */}
            <AccordionItem
              value="additional"
              className="bg-slate-50 rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
                <FileText className="w-4 h-4 text-blue-600" />
                Additional Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {assignedManagers && assignedManagers.length > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <p className="text-sm text-slate-500 font-medium mb-2">
                        Assigned To
                      </p>
                      {renderAssignedManagers()}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        )}
      </Accordion>
    </>
  );
};

interface Props {
  file: UIFileDoc;
  onInputChange: React.Dispatch<React.SetStateAction<string[]>>;
  onRemove: (email: string) => void;
  currentUsers?: string[]; // Optional prop to override file.users for real-time updates
}

export const ShareInput = ({
  file,
  onInputChange,
  onRemove,
  currentUsers,
}: Props) => {
  // Use currentUsers if provided, otherwise fall back to file.users
  const displayUsers =
    currentUsers !== undefined ? currentUsers : file.users || [];
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

      <div className="space-y-4" style={{ pointerEvents: 'none' }}>
        {/* Share file with other users Section */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <Label
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
            htmlFor="share-email"
            style={{ pointerEvents: 'none' }}
          >
            <Users className="w-4 h-4 text-blue-600" />
            Share file with other users
          </Label>
          <Input
            id="share-email"
            type="email"
            placeholder="Enter email addresses"
            onChange={(e) => onInputChange(e.target.value.trim().split(','))}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onFocus={(e) => {
              e.stopPropagation();
            }}
            onBlur={(e) => {
              e.stopPropagation();
            }}
            style={{ pointerEvents: 'auto' }}
            className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 h-11 text-base"
          />
        </div>

        {/* Shared with Section */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Users className="w-4 h-4 text-blue-600" />
              Shared with
            </Label>
            <span className="text-sm text-slate-600 font-medium">
              {displayUsers.length}{' '}
              {displayUsers.length === 1 ? 'user' : 'users'}
            </span>
          </div>
          {displayUsers.length > 0 ? (
            <div className="space-y-2">
              {displayUsers.map((email: string) => (
                <div
                  key={email}
                  className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200"
                  style={{ pointerEvents: 'auto' }}
                >
                  <span className="text-sm text-slate-700">{email}</span>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(email);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-50 rounded-full"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No users shared yet</p>
          )}
        </div>

        {/* File Information Section */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
          <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="w-4 h-4 text-blue-600" />
            File Information
          </Label>

          {/* Format */}
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 font-medium">Format</span>
              <span className="text-sm text-slate-800 font-semibold">
                {file.extension}
              </span>
            </div>
          </div>

          {/* Size */}
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 font-medium">Size</span>
              <span className="text-sm text-slate-800 font-semibold">
                {convertFileSize({ sizeInBytes: file.size })}
              </span>
            </div>
          </div>

          {/* Owner */}
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 font-medium">Owner</span>
              <span className="text-sm text-slate-800 font-semibold">
                {ownerName}
              </span>
            </div>
          </div>

          {/* Last Modified */}
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 font-medium">
                Last Modified
              </span>
              <span className="text-sm text-slate-800 font-semibold">
                {formatDateTime(file.$updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
