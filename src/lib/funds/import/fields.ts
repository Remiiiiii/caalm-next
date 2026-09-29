export const FUND_IMPORT_FIELD_KEYS = [
	"code",
	"name",
	"netAssetClass",
] as const;

export type FundImportFieldKey = (typeof FUND_IMPORT_FIELD_KEYS)[number];

export const FUND_IMPORT_FIELD_LABELS: Record<FundImportFieldKey, string> = {
	code: "Fund code",
	name: "Fund name",
	netAssetClass: "Net asset class",
};

/** Common finance export header aliases (case-insensitive match). */
const HEADER_ALIASES: Record<string, FundImportFieldKey> = {
	code: "code",
	fund_code: "code",
	"fund code": "code",
	gl_code: "code",
	account: "code",
	name: "name",
	fund_name: "name",
	"fund name": "name",
	description: "name",
	netassetclass: "netAssetClass",
	net_asset_class: "netAssetClass",
	"net asset class": "netAssetClass",
	restriction: "netAssetClass",
	restriction_type: "netAssetClass",
	class: "netAssetClass",
};

export function guessFundImportField(header: string): FundImportFieldKey | "" {
	const normalized = header.trim().toLowerCase().replace(/\s+/g, " ");
	if (HEADER_ALIASES[normalized]) return HEADER_ALIASES[normalized];
	const key = normalized.replace(/ /g, "_");
	if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
	const direct = FUND_IMPORT_FIELD_KEYS.find(
		(k) => k.toLowerCase() === normalized.replace(/ /g, ""),
	);
	return direct ?? "";
}

export function listUnmappedFundHeaders(
	headers: string[],
	mapping: Record<string, FundImportFieldKey | "">,
): string[] {
	return headers.filter((header) => !mapping[header]);
}
