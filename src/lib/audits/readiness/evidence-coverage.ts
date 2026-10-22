import type { AuditEvidenceStatus } from "@/lib/audits/types";
import type { AuditEvidenceAuditType, AuditEvidenceMapRow } from "./types";

export interface EvidenceCandidate {
	id: string;
	kind: "contract" | "license";
	title: string;
	href: string;
	status: AuditEvidenceStatus;
	haystack: string;
	category?: string;
	licenseType?: string;
	division?: string;
	contractType?: string;
	/** Confirmed evidence-map requirement ids stored on this record. */
	requirementIds?: string[];
}

export interface EvidenceMatchRule {
	/** Every record in the requirement's module matches (used for open CAP work). */
	allInModule?: boolean;
	keywords?: string[];
	categories?: string[];
	licenseTypes?: string[];
	divisions?: string[];
	contractTypes?: string[];
}

export interface EvidenceMatchedRecord {
	id: string;
	title: string;
	href: string;
	status: AuditEvidenceStatus;
}

export interface ScoredEvidenceHit {
	requirementId: string;
	label: string;
	auditType: AuditEvidenceAuditType;
	caalmModule: string;
	status: "covered" | "gap";
	matchedRecords: EvidenceMatchedRecord[];
}

const MATCHED_RECORD_LIMIT = 5;

/**
 * Name/type hints used only to recommend tags when AI is unavailable.
 * Covered vs Gap is decided by stored requirementIds on each record.
 */
export const CFCE_EVIDENCE_MATCH_RULES: Record<string, EvidenceMatchRule> = {
	"HRSA-SVC-CONTRACT": {
		keywords: [
			"service",
			"agreement",
			"vendor",
			"clinical",
			"referral",
			"arrangement",
		],
		contractTypes: [
			"Service_Agreement",
			"Vendor_Contract",
			"Vendor_Service_Agreement",
			"Purchase_Order",
			"Consulting_Agreement",
		],
	},
	"HRSA-CRED-PRIV": {
		keywords: [
			"credential",
			"privileg",
			"clinical",
			"healthcare",
			"medical",
			"nursing",
			"practitioner",
		],
		licenseTypes: ["Healthcare"],
	},
	"CW-PROVIDER-CONTRACT": {
		keywords: [
			"provider",
			"cbc",
			"lead agency",
			"lead-agency",
			"child welfare",
			"foster care",
			"monitoring",
		],
	},
	"CW-HOME-LICENSE": {
		keywords: [
			"foster",
			"group home",
			"group-home",
			"facility license",
			"residential facility",
			"occupancy",
			"child care",
			"childcare",
			"home license",
		],
	},
	"CW-STAFF-CRED": {
		keywords: [
			"staff",
			"credential",
			"privileg",
			"clinical practice",
			"counseling",
			"counselor",
			"practitioner",
			"nursing",
			"nurse",
		],
	},
	"CW-CAP": {
		allInModule: true,
	},
	"PBC-GRANT-AGREEMENTS": {
		keywords: ["grant", "award", "funder", "hrsa", "federal", "cooperative"],
		contractTypes: ["Grant", "Grant_Agreement"],
	},
	"PBC-VENDOR-CONTRACTS": {
		keywords: ["vendor", "supplier", "procurement", "purchase"],
		contractTypes: [
			"Vendor_Contract",
			"Vendor_Service_Agreement",
			"Purchase_Order",
		],
	},
	"PBC-INSURANCE": {
		categories: ["insurance"],
		keywords: [
			"insurance",
			"coverage",
			"certificate of insurance",
			"liability",
		],
	},
};

export function buildHaystack(
	...parts: Array<string | string[] | null | undefined>
): string {
	return parts
		.flat()
		.filter((part): part is string => Boolean(part && String(part).trim()))
		.join(" ")
		.toLowerCase();
}

export function contractCandidate(row: {
	$id: string;
	contractName?: string;
	name?: string;
	compliance?: string | null;
	vendor?: string;
	contractType?: string;
	department?: string;
	division?: string;
	description?: string;
}): EvidenceCandidate {
	const title = row.contractName || row.name || "Unnamed contract";
	return {
		id: row.$id,
		kind: "contract",
		title,
		href: `/contracts?highlight=${encodeURIComponent(row.$id)}`,
		status: mapContractStatus(row.compliance),
		haystack: buildHaystack(
			title,
			row.vendor,
			row.contractType,
			row.department,
			row.division,
			row.description,
		),
		contractType: row.contractType,
		division: row.division,
	};
}

export function licenseCandidate(row: {
	$id: string;
	licenseName?: string;
	compliance?: string | null;
	status?: string | null;
	licenseType?: string;
	category?: string;
	division?: string;
	vendor?: string;
	product?: string;
	issuingAuthority?: string;
	notes?: string;
	tags?: unknown;
}): EvidenceCandidate {
	const title = row.licenseName || "Unnamed license";
	return {
		id: row.$id,
		kind: "license",
		title,
		href: `/licenses?highlight=${encodeURIComponent(row.$id)}`,
		status: mapLicenseStatus(row.compliance, row.status),
		haystack: buildHaystack(
			title,
			row.licenseType,
			row.category,
			row.division,
			row.vendor,
			row.product,
			row.issuingAuthority,
			row.notes,
			asStringList(row.tags),
		),
		category: row.category,
		licenseType: row.licenseType,
		division: row.division,
	};
}

export function scoreEvidenceMap(options: {
	rows: AuditEvidenceMapRow[];
	candidates: EvidenceCandidate[];
	siteHealth?: string | null;
}): ScoredEvidenceHit[] {
	return options.rows.map((row) => {
		const { status, matchedRecords } = scoreRequirement(
			row,
			options.candidates,
			options.siteHealth,
		);
		return {
			requirementId: row.requirementId,
			label: row.label,
			auditType: row.auditType,
			caalmModule: row.caalmModule,
			status,
			matchedRecords,
		};
	});
}

export function scoreRequirement(
	row: AuditEvidenceMapRow,
	candidates: EvidenceCandidate[],
	siteHealth?: string | null,
): { status: "covered" | "gap"; matchedRecords: EvidenceMatchedRecord[] } {
	if (row.caalmModule === "site" || row.evidenceType === "site_crawl") {
		return {
			status: siteHealth === "ok" ? "covered" : "gap",
			matchedRecords: [],
		};
	}

	const matched = candidates.filter((candidate) =>
		recordMatches(candidate, row.caalmModule, row.requirementId),
	);
	const matchedRecords = matched.slice(0, MATCHED_RECORD_LIMIT).map(toMatched);

	if (row.evidenceType === "corrective_action") {
		if (matched.length === 0) {
			return { status: "gap", matchedRecords };
		}
		const openCap = matched.some(
			(candidate) =>
				candidate.status === "non_compliant" || candidate.status === "at_risk",
		);
		return { status: openCap ? "gap" : "covered", matchedRecords };
	}

	if (
		row.evidenceType === "license_credential" ||
		row.evidenceType === "license_or_document" ||
		row.caalmModule === "licenses"
	) {
		const covered = matched.some((candidate) => candidate.status === "compliant");
		return { status: covered ? "covered" : "gap", matchedRecords };
	}

	return {
		status: matched.length > 0 ? "covered" : "gap",
		matchedRecords,
	};
}

export function recordMatches(
	candidate: EvidenceCandidate,
	module: AuditEvidenceMapRow["caalmModule"],
	requirementId: string,
): boolean {
	if (!moduleKindMatches(candidate.kind, module)) return false;
	return (candidate.requirementIds ?? []).includes(requirementId);
}

/** Used only to suggest tags when Gemini is off. Does not set Covered/Gap. */
export function heuristicRecordMatches(
	candidate: EvidenceCandidate,
	module: AuditEvidenceMapRow["caalmModule"],
	rule: EvidenceMatchRule | undefined,
): boolean {
	if (!moduleKindMatches(candidate.kind, module)) return false;
	if (!rule) return false;
	if (rule.allInModule) return true;

	if (matchesAny(rule.categories, candidate.category)) return true;
	if (matchesAny(rule.licenseTypes, candidate.licenseType)) return true;
	if (matchesAny(rule.divisions, candidate.division)) return true;
	if (matchesAny(rule.contractTypes, candidate.contractType)) return true;
	if (rule.keywords?.some((keyword) => includesKeyword(candidate.haystack, keyword))) {
		return true;
	}
	return false;
}

function moduleKindMatches(
	kind: EvidenceCandidate["kind"],
	module: AuditEvidenceMapRow["caalmModule"],
): boolean {
	if (module === "contracts") return kind === "contract";
	if (module === "licenses") return kind === "license";
	return false;
}

function toMatched(candidate: EvidenceCandidate): EvidenceMatchedRecord {
	return {
		id: candidate.id,
		title: candidate.title,
		href: candidate.href,
		status: candidate.status,
	};
}

function mapContractStatus(compliance?: string | null): AuditEvidenceStatus {
	switch (compliance) {
		case "non-compliant":
			return "non_compliant";
		case "action-required":
			return "at_risk";
		case "up-to-date":
		case "compliant":
			return "compliant";
		default:
			return "pending";
	}
}

function mapLicenseStatus(
	compliance?: string | null,
	status?: string | null,
): AuditEvidenceStatus {
	if (compliance === "non-compliant" || status === "expired") {
		return "non_compliant";
	}
	if (
		compliance === "at-risk" ||
		compliance === "action-required" ||
		status === "action-required" ||
		status === "pending-review"
	) {
		return "at_risk";
	}
	if (compliance === "compliant" || status === "active") return "compliant";
	return "pending";
}

function asStringList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === "string" && value.trim()) return [value];
	return [];
}

function normalizeToken(value: string): string {
	return value.toLowerCase().replace(/[_-]+/g, " ").trim();
}

function matchesAny(needles: string[] | undefined, value?: string): boolean {
	if (!needles?.length || !value) return false;
	const hay = normalizeToken(value);
	return needles.some((needle) => normalizeToken(needle) === hay);
}

function includesKeyword(haystack: string, keyword: string): boolean {
	const needle = keyword.toLowerCase().trim();
	if (!needle) return false;
	if (needle.includes(" ")) return haystack.includes(needle);
	const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}
