import { pickMappedValue } from "@/lib/import/mapping";
import type { CampaignImportFieldKey } from "./fields";

export type MappedCampaignImportRow = {
	rowNumber: number;
	name: string;
	goalAmount?: number;
	currency: string;
	startDate?: string;
	endDate?: string;
};

export type CampaignImportRowError = {
	rowNumber: number;
	message: string;
};

export function applyCampaignColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, CampaignImportFieldKey | "">,
): { valid: MappedCampaignImportRow[]; errors: CampaignImportRowError[] } {
	const valid: MappedCampaignImportRow[] = [];
	const errors: CampaignImportRowError[] = [];
	rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const pick = (field: CampaignImportFieldKey) =>
			pickMappedValue(row, mapping, field);
		const name = pick("name");
		if (!name) {
			errors.push({ rowNumber, message: "Campaign name is required." });
			return;
		}
		const goalRaw = pick("goalAmount");
		const goalAmount = goalRaw ? Number(goalRaw.replace(/[$,]/g, "")) : undefined;
		if (goalRaw && (!Number.isFinite(goalAmount) || (goalAmount ?? 0) < 0)) {
			errors.push({ rowNumber, message: "Goal amount must be a number." });
			return;
		}
		valid.push({
			rowNumber,
			name,
			goalAmount,
			currency: pick("currency") || "USD",
			startDate: pick("startDate") || undefined,
			endDate: pick("endDate") || undefined,
		});
	});
	return { valid, errors };
}
