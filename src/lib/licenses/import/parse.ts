import { licenseCreateSchema } from "@/lib/api/licenses/schemas/license.schema";
import { pickMappedValue } from "@/lib/import/mapping";
import type { LicenseImportFieldKey } from "./fields";

export type MappedLicenseImportRow = {
	rowNumber: number;
	payload: Record<string, unknown>;
	licenseNumber: string;
};

export type LicenseImportRowError = {
	rowNumber: number;
	message: string;
};

export function applyLicenseColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, LicenseImportFieldKey | "">,
): { valid: MappedLicenseImportRow[]; errors: LicenseImportRowError[] } {
	const valid: MappedLicenseImportRow[] = [];
	const errors: LicenseImportRowError[] = [];

	rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const pick = (field: LicenseImportFieldKey) =>
			pickMappedValue(row, mapping, field);
		const payload: Record<string, unknown> = {
			licenseName: pick("licenseName"),
			licenseNumber: pick("licenseNumber") || undefined,
			licenseType: pick("licenseType") || undefined,
			licenseExpiryDate: pick("licenseExpiryDate") || undefined,
			issueDate: pick("issueDate") || undefined,
			issuingAuthority: pick("issuingAuthority") || undefined,
			department: pick("department"),
			division: pick("division"),
			vendor: pick("vendor") || undefined,
			product: pick("product") || undefined,
			status: pick("status") || undefined,
			cost: pick("cost") || undefined,
		};
		const parsed = licenseCreateSchema.safeParse(payload);
		if (!parsed.success) {
			errors.push({
				rowNumber,
				message: parsed.error.issues.map((issue) => issue.message).join("; "),
			});
			return;
		}
		valid.push({
			rowNumber,
			payload: parsed.data,
			licenseNumber: String(parsed.data.licenseNumber || "").trim(),
		});
	});

	return { valid, errors };
}
