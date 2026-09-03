export type CrmProvider = "hubspot" | "salesforce";

export type CrmIntegrationStatus =
	| "connected"
	| "disconnected"
	| "error"
	| "pending_setup";

export type CrmFieldMap = {
	dealName: string;
	amount: string;
	company: string;
	owner: string;
	closeDate: string;
};

export const CRM_FIELD_MAP_KEYS = [
	"dealName",
	"amount",
	"company",
	"owner",
	"closeDate",
] as const satisfies ReadonlyArray<keyof CrmFieldMap>;

export const CRM_FIELD_MAP_LABELS: Record<keyof CrmFieldMap, string> = {
	dealName: "Contract name",
	amount: "Amount",
	company: "Vendor / company",
	owner: "CRM owner",
	closeDate: "Close date",
};

/** Short plain-English hint: what this CAALM field gets from HubSpot (not a typed-in value). */
export const CRM_FIELD_MAP_HINTS: Record<keyof CrmFieldMap, string> = {
	dealName: "Title for the CAALM draft. Usually HubSpot’s Deal Name.",
	amount:
		"Which HubSpot property holds the deal’s dollar value — not a number you type here.",
	company: "Vendor / company name copied onto the CAALM draft.",
	owner: "HubSpot owner field used for CRM reference on the draft.",
	closeDate: "Expected close date → CAALM contract expiry date.",
};

export const DEFAULT_CRM_FIELD_MAP: CrmFieldMap = {
	dealName: "dealname",
	amount: "amount",
	company: "company",
	owner: "hubspot_owner_id",
	closeDate: "closedate",
};

/** Keep only safe HubSpot property names (letters, numbers, underscore, hyphen). */
export function sanitizeCrmFieldMap(
	input: Partial<CrmFieldMap> | null | undefined,
	fallback: CrmFieldMap = DEFAULT_CRM_FIELD_MAP,
): CrmFieldMap {
	const next: CrmFieldMap = { ...fallback };
	if (!input) return next;
	for (const key of CRM_FIELD_MAP_KEYS) {
		const value = input[key];
		if (typeof value !== "string") continue;
		const trimmed = value.trim();
		if (!trimmed || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) continue;
		next[key] = trimmed;
	}
	return next;
}

export type CrmIntegrationConfig = {
	pipelineId: string;
	triggerStageId: string;
	fieldMap: CrmFieldMap;
	enabled: boolean;
};

export function defaultCrmIntegrationConfig(): CrmIntegrationConfig {
	return {
		pipelineId: "",
		triggerStageId: "",
		fieldMap: { ...DEFAULT_CRM_FIELD_MAP },
		enabled: true,
	};
}

export type CrmDealSnapshot = {
	provider: CrmProvider;
	externalId: string;
	name: string;
	amount: number | null;
	currency: string;
	companyName: string | null;
	ownerName: string | null;
	stageId: string | null;
	pipelineId: string | null;
	closeDate: string | null;
	raw: Record<string, string | null>;
};

export type CrmPipelineStage = {
	id: string;
	label: string;
};

export type CrmPipeline = {
	id: string;
	label: string;
	stages: CrmPipelineStage[];
};

/** HubSpot deal property from the properties API (internal name + UI label). */
export type CrmDealProperty = {
	name: string;
	label: string;
	/** HubSpot data type: string, number, date, datetime, enumeration, … */
	type: string;
	/** HubSpot UI field type: text, number, date, select, … */
	fieldType: string;
};

/** HubSpot types that make sense for each CAALM mapping row. */
const CRM_FIELD_MAP_PROPERTY_TYPES: Record<keyof CrmFieldMap, ReadonlySet<string>> = {
	dealName: new Set(["string"]),
	amount: new Set(["number"]),
	company: new Set(["string"]),
	owner: new Set(["enumeration", "string"]),
	closeDate: new Set(["date", "datetime"]),
};

/** Stage-timing / pipeline analytics props — noise for field mapping. */
const CRM_FIELD_MAP_NOISE_NAME =
	/^hs_(v2_)?(cumulative_time_in_|latest_time_in_|time_in_|date_entered_|date_exited_)/i;

/** Money-like HubSpot number fields (deal value), not scores/IDs/timers. */
const AMOUNT_LIKE =
	/\b(amount|value|acv|arr|mrr|tcv|revenue|price|deal_registration_mrr)\b/i;

/**
 * Narrow HubSpot deal properties to ones that fit a CAALM map key.
 * Puts the recommended default (and current value) first so the list matches the row.
 */
export function optionsForCrmFieldMapKey(
	key: keyof CrmFieldMap,
	properties: CrmDealProperty[],
	currentValue?: string,
): CrmDealProperty[] {
	const allowedTypes = CRM_FIELD_MAP_PROPERTY_TYPES[key];
	const recommended = DEFAULT_CRM_FIELD_MAP[key];
	const current = currentValue?.trim() || "";

	const matchesKey = (property: CrmDealProperty): boolean => {
		if (CRM_FIELD_MAP_NOISE_NAME.test(property.name)) return false;
		if (!allowedTypes.has(property.type)) return false;

		const haystack = `${property.name} ${property.label}`.toLowerCase();

		// Name: deal title only (not company name, not random "name" analytics)
		if (key === "dealName") {
			if (
				haystack.includes("company") ||
				haystack.includes("vendor") ||
				haystack.includes("account") ||
				haystack.includes("owner") ||
				haystack.includes("pipeline") ||
				haystack.includes("stage")
			) {
				return false;
			}
			return (
				property.name === recommended ||
				property.name === "deal_name" ||
				haystack.includes("deal name") ||
				(haystack.includes("title") && haystack.includes("deal"))
			);
		}

		// Amount: deal money fields only — not user IDs, scores, days, probabilities
		if (key === "amount") {
			if (
				haystack.includes("user id") ||
				haystack.includes("userid") ||
				haystack.includes("_user_id") ||
				haystack.includes("probability") ||
				haystack.includes("score") ||
				haystack.includes("days") ||
				haystack.includes("duration") ||
				haystack.includes("exchange rate") ||
				haystack.includes("activity") ||
				haystack.includes("contacted") ||
				haystack.includes("record id") ||
				haystack.includes("num_") ||
				haystack.includes("number of")
			) {
				return false;
			}
			return AMOUNT_LIKE.test(haystack) || property.name === recommended;
		}

		// Owner: deal owner / sales lead — not "owner duration" metrics
		if (key === "owner") {
			if (
				haystack.includes("duration") ||
				haystack.includes("time") ||
				haystack.includes("average")
			) {
				return false;
			}
			return (
				property.name === recommended ||
				haystack.includes("deal owner") ||
				haystack.includes("hubspot_owner") ||
				haystack.includes("sales lead") ||
				(haystack.includes("owner") && !haystack.includes("company"))
			);
		}

		// Company/vendor: company/vendor/account name strings only
		if (key === "company") {
			if (
				haystack.includes("owner") ||
				haystack.includes("amount") ||
				haystack.includes("date") ||
				haystack.includes("stage") ||
				haystack.includes("pipeline")
			) {
				return false;
			}
			return (
				property.name === recommended ||
				haystack.includes("company") ||
				haystack.includes("vendor") ||
				haystack.includes("account name")
			);
		}

		// Close date: close/closedate style dates — not meeting or engagement dates
		if (key === "closeDate") {
			if (
				haystack.includes("meeting") ||
				haystack.includes("engagement") ||
				haystack.includes("create") ||
				haystack.includes("entered") ||
				haystack.includes("exited") ||
				haystack.includes("last modified") ||
				haystack.includes("updated")
			) {
				return false;
			}
			return (
				property.name === recommended ||
				haystack.includes("close date") ||
				haystack.includes("closedate") ||
				haystack.includes("close_date") ||
				(haystack.includes("close") && haystack.includes("date")) ||
				haystack.includes("contracted")
			);
		}

		return true;
	};

	const filtered = properties.filter(matchesKey);
	const byName = new Map(filtered.map((property) => [property.name, property]));

	// Always keep the default + current selection even if type filter missed them
	for (const name of [recommended, current]) {
		if (!name || byName.has(name)) continue;
		const fromAll = properties.find((property) => property.name === name);
		byName.set(
			name,
			fromAll || {
				name,
				label: name === current && name !== recommended ? `${name} (saved)` : name,
				type: "",
				fieldType: "",
			},
		);
	}

	const list = Array.from(byName.values()).sort((a, b) => {
		const rank = (name: string) => {
			if (name === recommended) return 0;
			if (name === current && name !== recommended) return 1;
			return 2;
		};
		const rankDiff = rank(a.name) - rank(b.name);
		if (rankDiff !== 0) return rankDiff;
		return a.label.localeCompare(b.label);
	});

	return list;
}

export type CrmTokens = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
};

export type CrmConnectionInfo = {
	portalId?: string;
	displayName?: string;
};

export type CrmIntegrationRecord = {
	$id: string;
	orgId: string;
	provider: CrmProvider;
	status: CrmIntegrationStatus;
	tokens_json?: string;
	token_expiry?: string;
	portal_id?: string;
	config_json?: string;
	connected_by?: string;
	connected_at?: string;
	last_sync_at?: string;
	last_error?: string;
};

export type CrmOriginLink = {
	$id: string;
	orgId: string;
	provider: CrmProvider;
	external_id: string;
	contract_id: string;
	created_at: string;
};

export function parseCrmConfig(
	raw: string | undefined | null,
): CrmIntegrationConfig {
	const fallback = defaultCrmIntegrationConfig();
	if (!raw) return fallback;
	try {
		const parsed = JSON.parse(raw) as Partial<CrmIntegrationConfig>;
		return {
			pipelineId:
				typeof parsed.pipelineId === "string"
					? parsed.pipelineId
					: fallback.pipelineId,
			triggerStageId:
				typeof parsed.triggerStageId === "string"
					? parsed.triggerStageId
					: fallback.triggerStageId,
			fieldMap: sanitizeCrmFieldMap(parsed.fieldMap, fallback.fieldMap),
			enabled: parsed.enabled !== false,
		};
	} catch {
		return fallback;
	}
}

export function crmReferenceFor(
	provider: CrmProvider,
	externalId: string,
): string {
	return `${provider}:${externalId}`;
}

export function parseCrmTokens(
	raw: string | undefined | null,
): CrmTokens | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<CrmTokens>;
		if (!parsed.access_token) return null;
		return {
			access_token: parsed.access_token,
			refresh_token: parsed.refresh_token || "",
			expires_in: Number(parsed.expires_in) || 0,
		};
	} catch {
		return null;
	}
}
