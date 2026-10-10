import { pickMappedValue } from "@/lib/import/mapping";
import type { ContractImportFieldKey } from "./fields";

export type MappedContractImportRow = {
	rowNumber: number;
	contractNumber: string;
	contractName: string;
	vendor?: string;
	department?: string;
	contractExpiryDate?: string;
	amount?: number;
	status?: string;
	contractType?: string;
	assignedManagerEmails: string[];
};

export type ContractImportRowError = {
	rowNumber: number;
	message: string;
};

function splitEmails(raw: string): string[] {
	return raw
		.split(/[,;]/)
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
}

export function applyContractColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, ContractImportFieldKey | "">,
): { valid: MappedContractImportRow[]; errors: ContractImportRowError[] } {
	const valid: MappedContractImportRow[] = [];
	const errors: ContractImportRowError[] = [];
	rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const pick = (field: ContractImportFieldKey) =>
			pickMappedValue(row, mapping, field);
		const contractNumber = pick("contractNumber");
		const contractName = pick("contractName");
		if (!contractNumber && !contractName) {
			errors.push({
				rowNumber,
				message: "Each row needs a contract number or contract name to match.",
			});
			return;
		}
		const amountRaw = pick("amount");
		const amount = amountRaw
			? Number(amountRaw.replace(/[$,]/g, ""))
			: undefined;
		if (amountRaw && (!Number.isFinite(amount) || (amount ?? 0) < 0)) {
			errors.push({ rowNumber, message: "Amount must be a number." });
			return;
		}
		valid.push({
			rowNumber,
			contractNumber,
			contractName,
			vendor: pick("vendor") || undefined,
			department: pick("department") || undefined,
			contractExpiryDate: pick("contractExpiryDate") || undefined,
			amount,
			status: pick("status") || undefined,
			contractType: pick("contractType") || undefined,
			assignedManagerEmails: splitEmails(pick("assignedManagerEmails")),
		});
	});
	return { valid, errors };
}
