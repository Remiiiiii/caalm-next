import { parseBoolCell } from "@/lib/import/http";
import { pickMappedValue } from "@/lib/import/mapping";
import { isGiftMethod, type GiftMethod } from "@/lib/gifts/types";
import type { GiftImportFieldKey } from "./fields";

export type MappedGiftImportRow = {
	rowNumber: number;
	constituentEmail: string;
	constituentId: string;
	amount: number;
	giftDate: string;
	method: GiftMethod;
	campaignName: string;
	fundCode: string;
	contractNumber: string;
	anonymous: boolean;
	postAfterImport: boolean;
};

export type GiftImportRowError = {
	rowNumber: number;
	message: string;
};

function parseMethod(raw: string): GiftMethod | null {
	const value = raw.trim().toLowerCase();
	if (isGiftMethod(value)) return value;
	if (value === "credit card" || value === "credit_card") return "card";
	if (value === "eft") return "ach";
	return null;
}

export function applyGiftColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, GiftImportFieldKey | "">,
): { valid: MappedGiftImportRow[]; errors: GiftImportRowError[] } {
	const valid: MappedGiftImportRow[] = [];
	const errors: GiftImportRowError[] = [];

	rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const pick = (field: GiftImportFieldKey) =>
			pickMappedValue(row, mapping, field);
		const constituentEmail = pick("constituentEmail").toLowerCase();
		const constituentId = pick("constituentId");
		const amount = Number(pick("amount").replace(/[$,]/g, ""));
		const giftDate = pick("giftDate");
		const method = parseMethod(pick("method"));
		if ((!constituentEmail && !constituentId) || !giftDate || !method) {
			errors.push({
				rowNumber,
				message:
					"Each row needs a constituent email or ID, a gift date, and a payment method (check, card, cash, wire, ach, other).",
			});
			return;
		}
		if (!Number.isFinite(amount) || amount <= 0) {
			errors.push({
				rowNumber,
				message: "Amount must be a positive number.",
			});
			return;
		}
		valid.push({
			rowNumber,
			constituentEmail,
			constituentId,
			amount,
			giftDate,
			method,
			campaignName: pick("campaignName"),
			fundCode: pick("fundCode"),
			contractNumber: pick("contractNumber"),
			anonymous: parseBoolCell(pick("anonymous")),
			postAfterImport: parseBoolCell(pick("postAfterImport")),
		});
	});

	return { valid, errors };
}
