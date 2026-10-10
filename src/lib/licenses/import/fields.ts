import { guessMappedField } from "@/lib/import/mapping";

export const LICENSE_IMPORT_FIELD_KEYS = [
	"licenseName",
	"licenseNumber",
	"licenseType",
	"licenseExpiryDate",
	"issueDate",
	"issuingAuthority",
	"department",
	"division",
	"vendor",
	"product",
	"status",
	"cost",
] as const;

export type LicenseImportFieldKey = (typeof LICENSE_IMPORT_FIELD_KEYS)[number];

export const LICENSE_IMPORT_FIELD_LABELS: Record<LicenseImportFieldKey, string> =
	{
		licenseName: "License name",
		licenseNumber: "License number",
		licenseType: "License type",
		licenseExpiryDate: "Expiry date",
		issueDate: "Issue date",
		issuingAuthority: "Issuing authority",
		department: "Department",
		division: "Division",
		vendor: "Vendor",
		product: "Product",
		status: "Status",
		cost: "Cost",
	};

const ALIASES: Record<string, LicenseImportFieldKey> = {
	name: "licenseName",
	license_name: "licenseName",
	number: "licenseNumber",
	license_number: "licenseNumber",
	type: "licenseType",
	expiry: "licenseExpiryDate",
	expiration: "licenseExpiryDate",
	expiration_date: "licenseExpiryDate",
	issue_date: "issueDate",
	authority: "issuingAuthority",
	issuing_authority: "issuingAuthority",
	department: "department",
	division: "division",
	vendor: "vendor",
	product: "product",
	status: "status",
	cost: "cost",
};

export function guessLicenseImportField(
	header: string,
): LicenseImportFieldKey | "" {
	return guessMappedField(header, LICENSE_IMPORT_FIELD_KEYS, ALIASES);
}

export const LICENSE_IMPORT_SAMPLE_CSV = `license_name,license_number,license_type,expiry,issue_date,issuing_authority,department,division,vendor,status
Microsoft 365,LIC-1001,saas,2027-06-30,2026-07-01,Microsoft,IT,Operations,Microsoft,active
`;
