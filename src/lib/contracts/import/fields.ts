import { guessMappedField } from "@/lib/import/mapping";

export const CONTRACT_IMPORT_FIELD_KEYS = [
	"contractNumber",
	"contractName",
	"vendor",
	"department",
	"contractExpiryDate",
	"amount",
	"status",
	"contractType",
	"assignedManagerEmails",
] as const;

export type ContractImportFieldKey =
	(typeof CONTRACT_IMPORT_FIELD_KEYS)[number];

export const CONTRACT_IMPORT_FIELD_LABELS: Record<
	ContractImportFieldKey,
	string
> = {
	contractNumber: "Contract number",
	contractName: "Contract name",
	vendor: "Vendor",
	department: "Department",
	contractExpiryDate: "Expiry date",
	amount: "Amount",
	status: "Status",
	contractType: "Contract type",
	assignedManagerEmails: "Assigned manager emails",
};

const ALIASES: Record<string, ContractImportFieldKey> = {
	contract_number: "contractNumber",
	number: "contractNumber",
	contract_name: "contractName",
	name: "contractName",
	vendor: "vendor",
	department: "department",
	expiry: "contractExpiryDate",
	expiry_date: "contractExpiryDate",
	contract_expiry_date: "contractExpiryDate",
	amount: "amount",
	value: "amount",
	status: "status",
	type: "contractType",
	contract_type: "contractType",
	managers: "assignedManagerEmails",
	assigned_managers: "assignedManagerEmails",
	manager_emails: "assignedManagerEmails",
};

export function guessContractImportField(
	header: string,
): ContractImportFieldKey | "" {
	return guessMappedField(header, CONTRACT_IMPORT_FIELD_KEYS, ALIASES);
}

export const CONTRACT_IMPORT_SAMPLE_CSV = `contract_number,contract_name,vendor,department,expiry,amount,status,contract_type,manager_emails
C-1001,Office lease,Northwind,Facilities,2027-12-31,48000,active,lease,alex@example.org
`;
