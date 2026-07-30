/**
 * Contract Type Mapper Service
 * Maps form contract types to database enum values
 */

export class ContractTypeMapper {
	private static readonly TYPE_MAP: Record<string, string> = {
		// Legacy contract types
		"Service Agreement": "Service_Agreement",
		"Professional Services": "Consulting_Agreement",
		"Purchase Agreement": "Purchase_Order",
		"Purchase Order": "Purchase_Order",
		"License Agreement": "License_Agreement",
		"Confidentiality/NDA": "NDA_",
		NDA: "NDA_",
		"Employment Contract": "Employment_Contract",
		"Vendor Contract": "Vendor_Contract",
		"Lease Agreement": "Lease_Agreement",
		"Consulting Agreement": "Consulting_Agreement",
		"Statement of Work (SOW)": "Consulting_Agreement",
		"Statement of Work": "Consulting_Agreement",
		"Master Agreement": "Service_Agreement",
		Amendment: "Other",
		Other: "Other",

		// New nonprofit contract types
		"Vendor/Service Agreement": "Vendor_Service_Agreement",
		"Grant Agreement": "Grant_Agreement",
		"Government Grant": "Government_Grant",
		"Government Contract": "Government_Contract",
		"Memorandum of Understanding": "MOU",
		"Donation/Gift Agreement": "Donation_Agreement",
		"Independent Contractor Agreement": "Independent_Contractor",
		"Fiscal Sponsorship Agreement": "Fiscal_Sponsorship",
	};

	/**
	 * Map contract type from form value to database enum
	 */
	static map(contractType: string | undefined): string {
		if (!contractType) return "Other";
		const trimmed = contractType.trim();
		if (ContractTypeMapper.DB_ENUM_VALUES.has(trimmed)) {
			return trimmed;
		}
		return ContractTypeMapper.TYPE_MAP[trimmed] || "Other";
	}

	/** Values accepted by the Contracts.contractType Appwrite enum. */
	private static readonly DB_ENUM_VALUES = new Set([
		"Service_Agreement",
		"Purchase_Order",
		"License_Agreement",
		"NDA_",
		"Employment_Contract",
		"Vendor_Contract",
		"Lease_Agreement",
		"Consulting_Agreement",
		"Government_Grant",
		"Government_Contract",
		"Grant_Agreement",
		"Vendor_Service_Agreement",
		"MOU",
		"Donation_Agreement",
		"Independent_Contractor",
		"Fiscal_Sponsorship",
		"Other",
	]);

	/**
	 * Get all valid contract types
	 */
	static getValidTypes(): string[] {
		return Object.keys(ContractTypeMapper.TYPE_MAP);
	}
}
