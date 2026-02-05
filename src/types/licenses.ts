export interface License {
  // Appwrite standard fields
  $id: string;
  $createdAt: string;
  $updatedAt: string;

  // Required fields
  licenseName: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiryDate: string; // DB field name (maps from expirationDate in forms)
  issuingAuthority: string; // DB field name
  issueDate: string; // DB field name (maps from purchaseDate in forms)
  status:
    | 'active'
    | 'inactive'
    | 'expired'
    | 'pending-review'
    | 'pending_renewal'
    | 'suspended'
    | 'archived'
    | 'action-required';

  // Optional - Core fields
  description?: string;
  renewalDate?: string;
  daysUntilExpiry?: number;
  compliance?: 'compliant' | 'non-compliant' | 'at-risk' | 'action-required';
  division?:
    | 'administration'
    | 'c-suite'
    | 'management'
    | 'childwelfare'
    | 'behavioralhealth'
    | 'clinic'
    | 'residential'
    | 'cins-fins-snap';
  assignedManagers?: string[]; // DB field name (maps from assignedTo in forms)
  licenseUrl?: string;
  fileId?: string; // DB field name (maps from certificateFileId in forms)
  fileRef?: string; // Relationship to files collection
  fileSize?: number; // File size in bytes (for card display)

  // Optional - Software license fields
  vendor?: string;
  product?: string;
  category?:
    | 'saas'
    | 'on_premise'
    | 'cloud'
    | 'certificate'
    | 'insurance'
    | 'other';
  quantity?: number;
  availableQuantity?: number;
  cost?: number;
  currencyCode?: string;
  autoRenew?: boolean;
  renewalNoticeDays?: number;

  // Optional - Organization/Assignment
  assignedDepartments?: string[];
  licenseOwnerId?: string;
  subDepartment?: string;
  businessUnit?: string;
  department?: string; // Alias for division (for backward compatibility)

  // Optional - Metadata
  tags?: string[];
  notes?: string;
  relatedContractId?: string;
  attachmentReferences?: string[];

  // Optional - License permissions (for software licenses)
  allowsReproduction?: boolean;
  allowsDistribution?: boolean;
  allowsCommercialUse?: boolean;
  requiresAttribution?: boolean;

  // Optional - Audit
  orgId: string;
  createdBy?: string;
  renewalHistory?: RenewalRecord[];

  // Legacy field aliases (for backward compatibility - will be mapped)
  expirationDate?: string; // Maps to licenseExpiryDate
  purchaseDate?: string; // Maps to issueDate
  assignedTo?: string[]; // Maps to assignedManagers
  certificateFileId?: string; // Maps to fileId
}

export interface RenewalRecord {
  renewalDate: string;
  cost: number;
  currencyCode: string;
  notes?: string;
  renewedBy?: string;
}

export interface LicenseMetadataPayload {
  // Required fields
  licenseName?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpiryDate?: string;
  issuingAuthority?: string;
  issueDate?: string;
  status?: string;

  // Optional - Core
  description?: string;
  renewalDate?: string;
  daysUntilExpiry?: number;
  compliance?: string;
  division?: string;
  assignedManagers?: string[];
  licenseUrl?: string;
  fileId?: string;
  fileRef?: string;

  // Optional - Software licenses
  vendor?: string;
  product?: string;
  category?: string;
  quantity?: number;
  availableQuantity?: number;
  cost?: number;
  currencyCode?: string;
  autoRenew?: boolean;
  renewalNoticeDays?: number;

  // Optional - Organization
  assignedDepartments?: string[];
  licenseOwnerId?: string;
  subDepartment?: string;
  businessUnit?: string;
  department?: string;

  // Optional - Metadata
  tags?: string[];
  notes?: string;
  relatedContractId?: string;
  attachmentReferences?: string[];

  // Optional - License permissions
  allowsReproduction?: boolean;
  allowsDistribution?: boolean;
  allowsCommercialUse?: boolean;
  requiresAttribution?: boolean;

  // Optional - Audit
  orgId?: string;
  createdBy?: string;
  renewalHistory?: RenewalRecord[];

  // Legacy aliases (will be mapped to primary fields)
  expirationDate?: string; // Maps to licenseExpiryDate
  purchaseDate?: string; // Maps to issueDate
  assignedTo?: string[]; // Maps to assignedManagers
  certificateFileId?: string; // Maps to fileId
}
