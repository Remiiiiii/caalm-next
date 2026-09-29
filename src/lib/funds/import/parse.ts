import { isNetAssetClass, type NetAssetClass } from "@/lib/funds/constants";
import type { FundImportFieldKey } from "./fields";

export type MappedFundImportRow = {
	rowNumber: number;
	code: string;
	name: string;
	netAssetClass: NetAssetClass;
};

export type FundImportRowError = {
	rowNumber: number;
	message: string;
	raw?: Record<string, string>;
};

/** Turn finance-friendly labels into catalog net asset class values. */
export function parseNetAssetClassFromImport(raw: string): NetAssetClass | null {
	const value = raw.trim().toLowerCase();
	if (!value) return null;
	if (isNetAssetClass(value)) return value;

	const compact = value.replace(/[\s-]+/g, "_");
	if (isNetAssetClass(compact)) return compact;

	if (compact.includes("permanent") || compact.includes("endowment")) {
		return "permanently_restricted";
	}
	if (compact.includes("temp")) {
		return "temporarily_restricted";
	}
	if (compact.includes("unrestrict") || compact === "general" || compact === "operating") {
		return "unrestricted";
	}

	return null;
}

export function applyFundColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, FundImportFieldKey | "">,
): { valid: MappedFundImportRow[]; errors: FundImportRowError[] } {
	const valid: MappedFundImportRow[] = [];
	const errors: FundImportRowError[] = [];

	rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const pick = (field: FundImportFieldKey) => {
			for (const [header, target] of Object.entries(mapping)) {
				if (target === field) return (row[header] ?? "").trim();
			}
			return "";
		};

		const code = pick("code");
		const name = pick("name");
		const netRaw = pick("netAssetClass");
		const netAssetClass = parseNetAssetClassFromImport(netRaw);

		if (!code || !name || !netAssetClass) {
			const missing: string[] = [];
			if (!code) missing.push("fund code");
			if (!name) missing.push("fund name");
			if (!netAssetClass) missing.push("net asset class");
			errors.push({
				rowNumber,
				message: `Missing or invalid ${missing.join(", ")}.`,
				raw: row,
			});
			return;
		}

		valid.push({
			rowNumber,
			code,
			name,
			netAssetClass,
		});
	});

	return { valid, errors };
}
