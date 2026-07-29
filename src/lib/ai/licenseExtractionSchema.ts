import { z } from "zod";
import {
	normalizeAmountString,
	normalizeDateString,
	parseLocalDateString,
} from "./contractExtractionSchema";
import { extractJsonObjectFromModelText } from "./contractTypeSuggestionSchema";

export const LICENSE_EXTRACTION_METHOD = {
	gemini: "gemini-structured",
	/** Labeled fieldName: value blocks when Gemini is unavailable */
	kvParse: "kv-parse",
	test: "test-extraction",
} as const;

export type LicenseExtractionMethod =
	(typeof LICENSE_EXTRACTION_METHOD)[keyof typeof LICENSE_EXTRACTION_METHOD];

/** Fields the license upload form can auto-fill from structured extraction. */
export const EXTRACTABLE_LICENSE_FIELDS = [
	"licenseName",
	"licenseNumber",
	"licenseType",
	"category",
	"status",
	"issuingAuthority",
	"issueDate",
	"licenseExpiryDate",
	"renewalDate",
	"vendor",
	"product",
	"description",
	"quantity",
	"cost",
	"currencyCode",
	"division",
	"compliance",
	"autoRenew",
	"renewalNoticeDays",
	"notes",
	"subDepartment",
	"businessUnit",
] as const;

export type ExtractableLicenseField =
	(typeof EXTRACTABLE_LICENSE_FIELDS)[number];

const optionalString = z
	.union([z.string(), z.number(), z.null()])
	.optional()
	.transform((v) => {
		if (v === undefined || v === null) return undefined;
		const s = String(v).trim();
		return s.length ? s : undefined;
	});

const optionalBool = z
	.union([z.boolean(), z.string(), z.null()])
	.optional()
	.transform((v) => {
		if (v === undefined || v === null) return undefined;
		if (typeof v === "boolean") return v;
		const s = v.trim().toLowerCase();
		if (["true", "yes", "y", "1"].includes(s)) return true;
		if (["false", "no", "n", "0"].includes(s)) return false;
		return undefined;
	});

const optionalConfidence = z.coerce.number().min(0).max(1).optional();

const rawExtractionSchema = z
	.object({
		licenseName: optionalString,
		licenseNumber: optionalString,
		licenseType: optionalString,
		category: optionalString,
		status: optionalString,
		issuingAuthority: optionalString,
		issueDate: optionalString,
		licenseExpiryDate: optionalString,
		renewalDate: optionalString,
		vendor: optionalString,
		product: optionalString,
		description: optionalString,
		quantity: optionalString,
		cost: optionalString,
		currencyCode: optionalString,
		division: optionalString,
		compliance: optionalString,
		autoRenew: optionalBool,
		renewalNoticeDays: optionalString,
		notes: optionalString,
		subDepartment: optionalString,
		businessUnit: optionalString,
		overallConfidence: optionalConfidence,
		fieldConfidence: z.record(z.string(), z.coerce.number()).optional(),
	})
	.passthrough();

export type ParsedLicenseExtraction = {
	fields: Partial<Record<ExtractableLicenseField, string | boolean>>;
	overallConfidence: number;
	fieldConfidence: Partial<Record<ExtractableLicenseField, number>>;
	filledFieldNames: ExtractableLicenseField[];
	lowConfidenceFields: ExtractableLicenseField[];
};

const LOW_CONFIDENCE_THRESHOLD = 0.7;

const STATUS_MAP: Record<string, string> = {
	active: "active",
	inactive: "inactive",
	expired: "expired",
	"pending review": "pending-review",
	"pending-review": "pending-review",
	pending: "pending-review",
	suspended: "suspended",
	"action required": "action-required",
	"action-required": "action-required",
};

const COMPLIANCE_MAP: Record<string, string> = {
	compliant: "compliant",
	"non-compliant": "non-compliant",
	noncompliant: "non-compliant",
	"non compliant": "non-compliant",
	"at-risk": "at-risk",
	atrisk: "at-risk",
	"at risk": "at-risk",
	"action-required": "action-required",
	"action required": "action-required",
};

const CATEGORY_MAP: Record<string, string> = {
	saas: "saas",
	"on premise": "on_premise",
	"on-premise": "on_premise",
	on_premise: "on_premise",
	cloud: "cloud",
	certificate: "certificate",
	insurance: "insurance",
	other: "other",
};

const DIVISION_MAP: Record<string, string> = {
	administration: "administration",
	"c-suite": "c-suite",
	csuite: "c-suite",
	management: "management",
	childwelfare: "childwelfare",
	"child welfare": "childwelfare",
	behavioralhealth: "behavioralhealth",
	"behavioral health": "behavioralhealth",
	clinic: "clinic",
	residential: "residential",
	"cins-fins-snap": "cins-fins-snap",
	cinsfinssnap: "cins-fins-snap",
};

const LICENSE_TYPE_MAP: Record<string, string> = {
	perpetual: "perpetual",
	subscription: "subscription",
	concurrent: "concurrent",
	"named user": "named_user",
	named_user: "named_user",
	certificate: "certificate",
	coi: "coi",
	"purchase order": "purchase_order",
	purchase_order: "purchase_order",
	"facility operating": "facility_operating",
	"facility operating license": "facility_operating",
	facility_operating: "facility_operating",
	professional: "professional",
	regulatory: "regulatory",
	"operating permit": "operating_permit",
	operating_permit: "operating_permit",
};

function compactKey(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mapEnum(
	raw: string | undefined,
	map: Record<string, string>,
): string | undefined {
	if (!raw) return undefined;
	const direct = map[raw.trim().toLowerCase()];
	if (direct) return direct;
	const compact = compactKey(raw);
	for (const [k, v] of Object.entries(map)) {
		if (compactKey(k) === compact) return v;
	}
	const entries = Object.entries(map).sort(
		(a, b) => compactKey(b[0]).length - compactKey(a[0]).length,
	);
	for (const [k, v] of entries) {
		const ck = compactKey(k);
		if (ck.length >= 4 && compact.includes(ck)) {
			return v;
		}
	}
	return undefined;
}

/** Treat N/A / none placeholders as empty. */
export function scrubNaValue(raw: string | undefined): string | undefined {
	if (!raw) return undefined;
	const t = raw.trim();
	if (!t) return undefined;
	const lower = t.toLowerCase();
	if (
		lower === "n/a" ||
		lower === "na" ||
		lower === "none" ||
		lower.startsWith("n/a (") ||
		lower === "not applicable"
	) {
		return undefined;
	}
	return t;
}

/**
 * Deterministic key:value pre-parse for schema-labeled license PDFs.
 * Looks for lines like `cost:` followed by a value on the same or next line.
 */
export function parseLicenseKeyValueText(
	documentText: string,
): Partial<Record<ExtractableLicenseField, string | boolean>> {
	const fields: Partial<Record<ExtractableLicenseField, string | boolean>> =
		{};
	const lines = documentText.split(/\r?\n/).map((l) => l.trim());
	const keySet = new Set<string>(EXTRACTABLE_LICENSE_FIELDS);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const sameLine = /^([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(.+)$/.exec(line);
		if (sameLine) {
			const key = sameLine[1];
			let value = sameLine[2].trim();
			if (keySet.has(key) && value) {
				// Strip trailing narrative after em-dash explanations for bool-ish lines
				if (key === "autoRenew" || key.startsWith("allows")) {
					const boolMatch = /^(true|false)/i.exec(value);
					if (boolMatch) value = boolMatch[1];
				}
				if (key === "autoRenew") {
					fields.autoRenew = value.toLowerCase() === "true";
				} else {
					fields[key as ExtractableLicenseField] = value;
				}
			}
			continue;
		}

		const keyOnly = /^([a-zA-Z][a-zA-Z0-9_]*)\s*:$/.exec(line);
		if (keyOnly && keySet.has(keyOnly[1])) {
			const key = keyOnly[1] as ExtractableLicenseField;
			const next = lines[i + 1]?.trim();
			if (next && !/^[a-zA-Z][a-zA-Z0-9_]*\s*:/.test(next)) {
				if (key === "autoRenew") {
					const boolMatch = /^(true|false)/i.exec(next);
					fields.autoRenew = boolMatch
						? boolMatch[1].toLowerCase() === "true"
						: undefined;
				} else if (key === "licenseName" || key === "issuingAuthority") {
					// Multi-line name/authority: join next line(s) until blank or new key
					const parts = [next];
					for (let j = i + 2; j < Math.min(i + 4, lines.length); j++) {
						const more = lines[j];
						if (!more || /^[a-zA-Z][a-zA-Z0-9_]*\s*:/.test(more)) break;
						if (more.length < 80) parts.push(more);
						else break;
					}
					fields[key] = parts.join(" ").replace(/\s+/g, " ").trim();
				} else {
					fields[key] = next;
				}
			}
		}
	}

	return fields;
}

function emptyParsed(): ParsedLicenseExtraction {
	return {
		fields: {},
		overallConfidence: 0,
		fieldConfidence: {},
		filledFieldNames: [],
		lowConfidenceFields: [],
	};
}

/**
 * Parse Gemini (or fixture / key-value) JSON into normalized extractable fields.
 */
export function parseLicenseExtractionJson(
	rawJson: string,
): ParsedLicenseExtraction {
	let parsed: unknown;
	try {
		parsed = JSON.parse(extractJsonObjectFromModelText(rawJson));
	} catch {
		return emptyParsed();
	}

	const zod = rawExtractionSchema.safeParse(parsed);
	if (!zod.success) {
		return emptyParsed();
	}

	const data = zod.data;
	const fields: ParsedLicenseExtraction["fields"] = {};

	if (data.licenseName) fields.licenseName = data.licenseName;
	if (data.licenseNumber) fields.licenseNumber = data.licenseNumber;

	const licenseType =
		mapEnum(data.licenseType, LICENSE_TYPE_MAP) ||
		(data.licenseType
			? data.licenseType.toLowerCase().replace(/\s+/g, "_")
			: undefined);
	if (licenseType) fields.licenseType = licenseType;

	const category = mapEnum(data.category, CATEGORY_MAP);
	if (category) fields.category = category;

	const status = mapEnum(data.status, STATUS_MAP);
	if (status) fields.status = status;

	if (data.issuingAuthority) {
		fields.issuingAuthority = data.issuingAuthority.replace(/\s+/g, " ").trim();
	}

	const issueDate = normalizeDateString(data.issueDate);
	if (issueDate) fields.issueDate = issueDate;
	const expiry = normalizeDateString(data.licenseExpiryDate);
	if (expiry) fields.licenseExpiryDate = expiry;
	const renewal = normalizeDateString(data.renewalDate);
	if (renewal) fields.renewalDate = renewal;

	const vendor = scrubNaValue(data.vendor);
	if (vendor) fields.vendor = vendor;
	const product = scrubNaValue(data.product);
	if (product) fields.product = product;

	if (data.description) fields.description = data.description;

	if (data.quantity) {
		const q = data.quantity.replace(/[^\d.]/g, "");
		if (q) fields.quantity = q;
	}

	const cost = normalizeAmountString(data.cost);
	if (cost) fields.cost = cost;

	if (data.currencyCode) {
		fields.currencyCode = data.currencyCode.toUpperCase().slice(0, 3);
	}

	const division = mapEnum(data.division, DIVISION_MAP);
	if (division) fields.division = division;

	const compliance = mapEnum(data.compliance, COMPLIANCE_MAP);
	if (compliance) fields.compliance = compliance;

	if (data.autoRenew !== undefined) fields.autoRenew = data.autoRenew;
	if (data.renewalNoticeDays) {
		fields.renewalNoticeDays = data.renewalNoticeDays.replace(/[^\d]/g, "");
	}

	if (data.notes) fields.notes = data.notes;
	if (data.subDepartment) fields.subDepartment = data.subDepartment;
	if (data.businessUnit) fields.businessUnit = data.businessUnit;

	const fieldConfidence: ParsedLicenseExtraction["fieldConfidence"] = {};
	const rawConf = data.fieldConfidence || {};
	for (const key of EXTRACTABLE_LICENSE_FIELDS) {
		const c = rawConf[key];
		if (typeof c === "number" && !Number.isNaN(c)) {
			fieldConfidence[key] = Math.min(1, Math.max(0, c));
		}
	}

	const filledFieldNames = EXTRACTABLE_LICENSE_FIELDS.filter(
		(k) => fields[k] !== undefined && fields[k] !== "",
	);

	for (const key of filledFieldNames) {
		if (fieldConfidence[key] === undefined) {
			fieldConfidence[key] = data.overallConfidence ?? 0.75;
		}
	}

	const overallConfidence =
		typeof data.overallConfidence === "number"
			? data.overallConfidence
			: filledFieldNames.length
				? filledFieldNames.reduce(
						(sum, k) => sum + (fieldConfidence[k] ?? 0.75),
						0,
					) / filledFieldNames.length
				: 0;

	const lowConfidenceFields = filledFieldNames.filter(
		(k) => (fieldConfidence[k] ?? 0) < LOW_CONFIDENCE_THRESHOLD,
	);

	return {
		fields,
		overallConfidence,
		fieldConfidence,
		filledFieldNames,
		lowConfidenceFields,
	};
}

/**
 * Merge key-value pre-parse with Gemini parse. Key-value wins for cost/dates/ids
 * when present (deterministic labels in schema-shaped PDFs).
 */
export function mergeLicenseExtractions(
	kv: Partial<Record<ExtractableLicenseField, string | boolean>>,
	gemini: ParsedLicenseExtraction,
): ParsedLicenseExtraction {
	const mergedKvJson = JSON.stringify({
		...Object.fromEntries(
			Object.entries(kv).map(([k, v]) => [
				k,
				typeof v === "boolean" ? v : String(v),
			]),
		),
		overallConfidence: 0.95,
		fieldConfidence: Object.fromEntries(
			Object.keys(kv).map((k) => [k, 0.98]),
		),
	});
	const kvParsed = parseLicenseExtractionJson(mergedKvJson);

	const fields: ParsedLicenseExtraction["fields"] = {
		...gemini.fields,
		...kvParsed.fields,
	};

	const fieldConfidence: ParsedLicenseExtraction["fieldConfidence"] = {
		...gemini.fieldConfidence,
		...kvParsed.fieldConfidence,
	};

	const filledFieldNames = EXTRACTABLE_LICENSE_FIELDS.filter(
		(k) => fields[k] !== undefined && fields[k] !== "",
	);

	for (const key of filledFieldNames) {
		if (fieldConfidence[key] === undefined) {
			fieldConfidence[key] = 0.75;
		}
	}

	const overallConfidence =
		filledFieldNames.length > 0
			? filledFieldNames.reduce(
					(sum, k) => sum + (fieldConfidence[k] ?? 0.75),
					0,
				) / filledFieldNames.length
			: 0;

	return {
		fields,
		overallConfidence,
		fieldConfidence,
		filledFieldNames,
		lowConfidenceFields: filledFieldNames.filter(
			(k) => (fieldConfidence[k] ?? 0) < LOW_CONFIDENCE_THRESHOLD,
		),
	};
}

export type LicenseFormExtractionPatch = Record<string, unknown>;

/**
 * Build a react-hook-form patch from parsed extraction (dates as Date objects).
 */
export function buildFormPatchFromLicenseExtraction(
	parsed: ParsedLicenseExtraction,
	fallbackFileName?: string,
): LicenseFormExtractionPatch {
	const { fields } = parsed;
	const patch: LicenseFormExtractionPatch = {};

	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined || value === "") continue;
		// Uploads always start as pending-review; ignore document status labels
		if (key === "status") continue;
		if (
			key === "issueDate" ||
			key === "licenseExpiryDate" ||
			key === "renewalDate"
		) {
			const d = parseLocalDateString(String(value));
			if (d) patch[key] = d;
			continue;
		}
		patch[key] = value;
	}

	if (!patch.licenseName && fallbackFileName) {
		patch.licenseName = fallbackFileName.replace(/\.[^/.]+$/, "");
	}

	return patch;
}

export function isRealLicenseExtractionMethod(
	method: string | undefined | null,
): boolean {
	return (
		method === LICENSE_EXTRACTION_METHOD.gemini ||
		method === LICENSE_EXTRACTION_METHOD.kvParse
	);
}

export const LOW_LICENSE_EXTRACTION_CONFIDENCE = LOW_CONFIDENCE_THRESHOLD;
