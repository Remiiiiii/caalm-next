import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { getUserById } from '@/lib/actions/user.actions';
import type { License, RenewalRecord } from '@/types/licenses';

/**
 * License Service
 * Handles license creation and management operations
 */
export class LicenseService {
  /**
   * Map legacy field names to database field names
   */
  private static mapFieldsToDatabase(data: any): any {
    const mapped: any = { ...data };

    // Map legacy aliases to database field names
    if (mapped.expirationDate && !mapped.licenseExpiryDate) {
      mapped.licenseExpiryDate = mapped.expirationDate;
      delete mapped.expirationDate;
    }
    if (mapped.purchaseDate && !mapped.issueDate) {
      mapped.issueDate = mapped.purchaseDate;
      delete mapped.purchaseDate;
    }
    if (mapped.assignedTo && !mapped.assignedManagers) {
      mapped.assignedManagers = mapped.assignedTo;
      delete mapped.assignedTo;
    }
    if (mapped.certificateFileId && !mapped.fileId) {
      mapped.fileId = mapped.certificateFileId;
      delete mapped.certificateFileId;
    }
    if (mapped.department && !mapped.division) {
      mapped.division = mapped.department;
      // Keep department for backward compatibility
    }

    return mapped;
  }

  /**
   * Map database field names to code field names (for reading)
   */
  private static mapFieldsFromDatabase(data: any): any {
    const mapped: any = { ...data };

    // Add aliases for backward compatibility
    if (mapped.licenseExpiryDate) {
      mapped.expirationDate = mapped.licenseExpiryDate;
    }
    if (mapped.issueDate) {
      mapped.purchaseDate = mapped.issueDate;
    }
    if (mapped.assignedManagers) {
      mapped.assignedTo = mapped.assignedManagers;
    }
    if (mapped.fileId) {
      mapped.certificateFileId = mapped.fileId;
    }
    if (mapped.division) {
      mapped.department = mapped.division;
    }

    // Map database status values to code status values (for display)
    if (mapped.status) {
      const statusMap: Record<string, string> = {
        'pending-review': 'pending-review', // Map to code value for display
        'action-required': 'action-required',
        inactive: 'inactive',
        expired: 'expired',
        suspended: 'suspended',
        active: 'active',
      };
      // Keep both values for compatibility
      mapped.statusDisplay = statusMap[mapped.status] || mapped.status;
    }

    return mapped;
  }

  /**
   * Sanitize payload by removing empty values
   */
  private static sanitizePayload<T extends Record<string, unknown>>(
    payload: T
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== undefined && value !== null && value !== '';
      })
    ) as Partial<T>;
  }

  /**
   * Calculate days until expiry
   */
  private static calculateDaysUntilExpiry(
    expiryDate: string
  ): number | undefined {
    if (!expiryDate) return undefined;
    try {
      const expiryStr = expiryDate.split('T')[0];
      const [year, month, day] = expiryStr.split('-').map(Number);
      const expiry = new Date(year, month - 1, day);
      expiry.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const timeDiff = expiry.getTime() - today.getTime();
      return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Determine license status based on expiration date
   * Maps code status values to database status values
   */
  private static determineStatus(
    expirationDate?: string,
    currentStatus?: string
  ): string {
    // If status is provided and is valid, use it (map to database values)
    if (currentStatus) {
      // Map code status values to database status values
      const statusMap: Record<string, string> = {
        expired: 'expired',
        'pending-review': 'pending-review', // Map to database value
        suspended: 'suspended',
        inactive: 'inactive',
        'action-required': 'action-required',
        active: 'active',
      };
      return statusMap[currentStatus] || currentStatus;
    }

    if (!expirationDate) {
      return 'active';
    }

    const daysUntilExpiry = this.calculateDaysUntilExpiry(expirationDate);
    if (daysUntilExpiry === undefined) {
      return 'active';
    }

    if (daysUntilExpiry < 0) {
      return 'expired';
    } else if (daysUntilExpiry <= 30) {
      return 'pending-review'; // Use database value
    } else {
      return 'active';
    }
  }

  /**
   * Create license
   */
  static async createLicense(ownerId: string, formData: any): Promise<any> {
    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.licensesCollectionId) {
      throw new Error('Database configuration missing');
    }

    const defaultOrg = await getUserDefaultOrganization(ownerId);
    if (!defaultOrg) {
      throw new Error('Could not determine user organization');
    }

    // Map legacy field names to database field names
    const mappedData = this.mapFieldsToDatabase(formData);

    // Use database field names (licenseExpiryDate, issueDate, etc.)
    const licenseExpiryDate = mappedData.licenseExpiryDate
      ? new Date(mappedData.licenseExpiryDate).toISOString().split('T')[0]
      : undefined;

    const issueDate = mappedData.issueDate
      ? new Date(mappedData.issueDate).toISOString()
      : undefined;

    const renewalDate = mappedData.renewalDate
      ? new Date(mappedData.renewalDate).toISOString()
      : undefined;

    const status =
      this.determineStatus(licenseExpiryDate, mappedData.status) || 'active';
    const daysUntilExpiry = licenseExpiryDate
      ? this.calculateDaysUntilExpiry(licenseExpiryDate)
      : undefined;

    const quantity = mappedData.quantity
      ? parseFloat(String(mappedData.quantity))
      : undefined;
    const availableQuantity =
      mappedData.availableQuantity !== undefined
        ? parseFloat(String(mappedData.availableQuantity))
        : quantity;

    const licenseDocument = this.sanitizePayload({
      // Required fields (ensure all are provided)
      licenseName: mappedData.licenseName,
      licenseNumber: mappedData.licenseNumber || '',
      licenseType: mappedData.licenseType || '',
      licenseExpiryDate: licenseExpiryDate || '',
      issuingAuthority: mappedData.issuingAuthority || '',
      issueDate: issueDate || '',
      status: status || 'active',

      // Optional - Core
      description: mappedData.description,
      renewalDate,
      daysUntilExpiry,
      compliance: mappedData.compliance,
      division: mappedData.division || mappedData.department,
      assignedManagers: mappedData.assignedManagers || [],
      licenseUrl: mappedData.licenseUrl,
      fileId: mappedData.fileId,
      fileSize: mappedData.fileSize
        ? parseInt(String(mappedData.fileSize), 10)
        : undefined,

      // Optional - Software licenses
      vendor: mappedData.vendor,
      product: mappedData.product,
      category: mappedData.category,
      quantity,
      availableQuantity,
      cost: mappedData.cost ? parseFloat(String(mappedData.cost)) : undefined,
      currencyCode: mappedData.currencyCode || 'USD',
      autoRenew: mappedData.autoRenew || false,
      renewalNoticeDays: mappedData.renewalNoticeDays
        ? parseInt(String(mappedData.renewalNoticeDays))
        : undefined,

      // Optional - Organization
      assignedDepartments: mappedData.assignedDepartments || [],
      licenseOwnerId: mappedData.licenseOwnerId || ownerId,
      subDepartment: mappedData.subDepartment,
      businessUnit: mappedData.businessUnit,

      // Optional - Metadata
      tags: mappedData.tags || [],
      notes: mappedData.notes,
      relatedContractId: mappedData.relatedContractId,
      attachmentReferences: mappedData.attachmentReferences || [],

      // Optional - License permissions
      allowsReproduction: mappedData.allowsReproduction,
      allowsDistribution: mappedData.allowsDistribution,
      allowsCommercialUse: mappedData.allowsCommercialUse,
      requiresAttribution: mappedData.requiresAttribution,

      // Audit
      orgId: defaultOrg.orgId,
      createdBy: ownerId,
    });

    const license = await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.licensesCollectionId,
      rowId: ID.unique(),
      data: licenseDocument,
    });

    return license;
  }

  /**
   * Get license by ID
   */
  static async getLicenseById(licenseId: string): Promise<any> {
    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.licensesCollectionId) {
      throw new Error('Database configuration missing');
    }

    const license = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.licensesCollectionId,
      rowId: licenseId,
    });

    // Map database field names to code field names (with aliases)
    return this.mapFieldsFromDatabase(license);
  }

  /**
   * Update license
   */
  static async updateLicense(licenseId: string, formData: any): Promise<any> {
    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.licensesCollectionId) {
      throw new Error('Database configuration missing');
    }

    // Map legacy field names to database field names
    const mappedData = this.mapFieldsToDatabase(formData);

    const licenseExpiryDate = mappedData.licenseExpiryDate
      ? new Date(mappedData.licenseExpiryDate).toISOString().split('T')[0]
      : undefined;

    const issueDate = mappedData.issueDate
      ? new Date(mappedData.issueDate).toISOString()
      : undefined;

    const renewalDate = mappedData.renewalDate
      ? new Date(mappedData.renewalDate).toISOString()
      : undefined;

    const status = mappedData.status
      ? this.determineStatus(licenseExpiryDate, mappedData.status)
      : this.determineStatus(licenseExpiryDate);
    const daysUntilExpiry = licenseExpiryDate
      ? this.calculateDaysUntilExpiry(licenseExpiryDate)
      : undefined;

    const quantity = mappedData.quantity
      ? parseFloat(String(mappedData.quantity))
      : undefined;
    const availableQuantity =
      mappedData.availableQuantity !== undefined
        ? parseFloat(String(mappedData.availableQuantity))
        : quantity;

    const updateData = this.sanitizePayload({
      // Required fields (if provided)
      licenseName: mappedData.licenseName,
      licenseNumber: mappedData.licenseNumber,
      licenseType: mappedData.licenseType,
      licenseExpiryDate,
      issuingAuthority: mappedData.issuingAuthority,
      issueDate,
      status,

      // Optional - Core
      description: mappedData.description,
      renewalDate,
      daysUntilExpiry,
      compliance: mappedData.compliance,
      division: mappedData.division || mappedData.department,
      assignedManagers: mappedData.assignedManagers,
      licenseUrl: mappedData.licenseUrl,
      fileId: mappedData.fileId,

      // Optional - Software licenses
      vendor: mappedData.vendor,
      product: mappedData.product,
      category: mappedData.category,
      quantity,
      availableQuantity,
      cost: mappedData.cost ? parseFloat(String(mappedData.cost)) : undefined,
      currencyCode: mappedData.currencyCode,
      autoRenew: mappedData.autoRenew,
      renewalNoticeDays: mappedData.renewalNoticeDays
        ? parseInt(String(mappedData.renewalNoticeDays))
        : undefined,

      // Optional - Organization
      assignedDepartments: mappedData.assignedDepartments,
      licenseOwnerId: mappedData.licenseOwnerId,
      subDepartment: mappedData.subDepartment,
      businessUnit: mappedData.businessUnit,

      // Optional - Metadata
      tags: mappedData.tags,
      notes: mappedData.notes,
      relatedContractId: mappedData.relatedContractId,
      attachmentReferences: mappedData.attachmentReferences,

      // Optional - License permissions
      allowsReproduction: mappedData.allowsReproduction,
      allowsDistribution: mappedData.allowsDistribution,
      allowsCommercialUse: mappedData.allowsCommercialUse,
      requiresAttribution: mappedData.requiresAttribution,
    });

    const license = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.licensesCollectionId,
      rowId: licenseId,
      data: updateData,
    });

    // Map database field names back to code field names (with aliases)
    return this.mapFieldsFromDatabase(license);
  }

  /**
   * Delete license
   */
  static async deleteLicense(licenseId: string): Promise<void> {
    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.licensesCollectionId) {
      throw new Error('Database configuration missing');
    }

    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.licensesCollectionId,
      rowId: licenseId,
    });
  }

  /**
   * List licenses with filters
   */
  static async listLicenses(
    orgId: string,
    filters?: {
      search?: string;
      vendor?: string;
      licenseType?: string;
      status?: string;
      department?: string;
      expiringSoon?: boolean;
    },
    pagination?: { limit: number; offset: number }
  ): Promise<{ licenses: any[]; total: number }> {
    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.licensesCollectionId) {
      throw new Error('Database configuration missing');
    }

    const queries: string[] = [Query.equal('orgId', orgId)];

    if (filters?.search) {
      queries.push(
        Query.or([
          Query.search('licenseName', filters.search),
          Query.search('vendor', filters.search),
          Query.search('product', filters.search),
          Query.search('licenseNumber', filters.search),
        ])
      );
    }

    if (filters?.vendor) {
      queries.push(Query.equal('vendor', filters.vendor));
    }

    if (filters?.licenseType) {
      queries.push(Query.equal('licenseType', filters.licenseType));
    }

    if (filters?.status) {
      queries.push(Query.equal('status', filters.status));
    }

    if (filters?.department) {
      queries.push(Query.equal('department', filters.department));
    }

    if (filters?.expiringSoon) {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      queries.push(
        Query.between(
          'licenseExpiryDate',
          today.toISOString().split('T')[0],
          thirtyDaysFromNow.toISOString().split('T')[0]
        )
      );
    }

    const limit = pagination?.limit || 1000;
    const offset = pagination?.offset || 0;

    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));
    queries.push(Query.orderDesc('$createdAt'));

    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.licensesCollectionId,
      queries,
    });

    // Map database field names to code field names (with aliases) for all licenses
    const mappedLicenses = result.rows.map((license: any) =>
      this.mapFieldsFromDatabase(license)
    );

    return {
      licenses: mappedLicenses,
      total: result.total,
    };
  }

  /**
   * Allocate license to users or departments
   */
  static async allocateLicense(
    licenseId: string,
    allocationData: {
      userIds?: string[];
      departments?: string[];
      quantity?: number;
    }
  ): Promise<any> {
    const license = await this.getLicenseById(licenseId);

    // Use database field names (assignedManagers) but support aliases
    const currentAssignedManagers = (license.assignedManagers ||
      license.assignedTo ||
      []) as string[];
    const currentAssignedDepartments =
      (license.assignedDepartments as string[]) || [];
    const currentAvailableQuantity =
      license.availableQuantity || license.quantity || 0;

    const newAssignedManagers = allocationData.userIds
      ? [...new Set([...currentAssignedManagers, ...allocationData.userIds])]
      : currentAssignedManagers;

    const newAssignedDepartments = allocationData.departments
      ? [
          ...new Set([
            ...currentAssignedDepartments,
            ...allocationData.departments,
          ]),
        ]
      : currentAssignedDepartments;

    const allocationQuantity = allocationData.quantity || 1;
    const newAvailableQuantity = Math.max(
      0,
      currentAvailableQuantity - allocationQuantity
    );

    return await this.updateLicense(licenseId, {
      ...license,
      assignedManagers: newAssignedManagers,
      assignedDepartments: newAssignedDepartments,
      availableQuantity: newAvailableQuantity,
    });
  }

  /**
   * Renew license
   */
  static async renewLicense(
    licenseId: string,
    renewalData: {
      renewalDate: string;
      cost?: number;
      currencyCode?: string;
      notes?: string;
      extendExpiration?: boolean;
      renewedBy?: string;
    }
  ): Promise<any> {
    const license = await this.getLicenseById(licenseId);

    const renewalRecord: RenewalRecord = {
      renewalDate: renewalData.renewalDate,
      cost: renewalData.cost || license.cost || 0,
      currencyCode: renewalData.currencyCode || license.currencyCode || 'USD',
      notes: renewalData.notes,
      renewedBy: renewalData.renewedBy,
    };

    const renewalHistory = (license.renewalHistory as RenewalRecord[]) || [];
    renewalHistory.push(renewalRecord);

    const updateData: any = {
      renewalHistory,
      renewalDate: renewalData.renewalDate,
    };

    // Use database field name (licenseExpiryDate) but support alias
    const currentExpiration =
      license.licenseExpiryDate || license.expirationDate;
    if (renewalData.extendExpiration && currentExpiration) {
      const currentExpirationDate = new Date(currentExpiration);
      const renewalDate = new Date(renewalData.renewalDate);
      const daysDiff = Math.floor(
        (renewalDate.getTime() - currentExpirationDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 0) {
        const newExpiration = new Date(currentExpirationDate);
        newExpiration.setDate(newExpiration.getDate() + daysDiff);
        updateData.licenseExpiryDate = newExpiration
          .toISOString()
          .split('T')[0];
        updateData.status = 'active';
      }
    }

    if (renewalData.cost) {
      updateData.cost = renewalData.cost;
    }

    return await this.updateLicense(licenseId, {
      ...license,
      ...updateData,
    });
  }

  /**
   * Get expiring licenses
   */
  static async getExpiringLicenses(
    orgId: string,
    days: number = 30
  ): Promise<any[]> {
    const { tablesDB } = await createAdminClient();

    if (!appwriteConfig.databaseId || !appwriteConfig.licensesCollectionId) {
      throw new Error('Database configuration missing');
    }

    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + days);

    const result = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.licensesCollectionId,
      queries: [
        Query.equal('orgId', orgId),
        Query.between(
          'licenseExpiryDate',
          today.toISOString().split('T')[0],
          targetDate.toISOString().split('T')[0]
        ),
        Query.notEqual('status', 'expired'),
        Query.orderAsc('licenseExpiryDate'),
      ],
    });

    // Map database field names to code field names (with aliases)
    return result.rows.map((license: any) =>
      this.mapFieldsFromDatabase(license)
    );
  }
}
