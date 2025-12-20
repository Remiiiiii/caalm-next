/**
 * Contract Type Mapper Service
 * Maps form contract types to database enum values
 */

export class ContractTypeMapper {
  private static readonly TYPE_MAP: Record<string, string> = {
    'Service Agreement': 'Service_Agreement',
    'Professional Services': 'Consulting_Agreement',
    'Purchase Agreement': 'Purchase_Order',
    'Purchase Order': 'Purchase_Order',
    'License Agreement': 'License_Agreement',
    'Confidentiality/NDA': 'NDA_',
    NDA: 'NDA_',
    'Employment Contract': 'Employment_Contract',
    'Vendor Contract': 'Vendor_Contract',
    'Lease Agreement': 'Lease_Agreement',
    'Consulting Agreement': 'Consulting_Agreement',
    'Statement of Work (SOW)': 'Consulting_Agreement',
    'Statement of Work': 'Consulting_Agreement',
    'Master Agreement': 'Service_Agreement',
    Amendment: 'Other',
    Other: 'Other',
  };

  /**
   * Map contract type from form value to database enum
   */
  static map(contractType: string | undefined): string {
    if (!contractType) return 'Other';
    return this.TYPE_MAP[contractType] || 'Other';
  }

  /**
   * Get all valid contract types
   */
  static getValidTypes(): string[] {
    return Object.keys(this.TYPE_MAP);
  }
}
