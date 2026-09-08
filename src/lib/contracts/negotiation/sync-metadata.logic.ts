/**
 * Pure parse/map for negotiation → Contracts row sync.
 * Commit happens on Send for review; Accept only refreshes snapshot MetaCard.
 */

import type { NegotiationSnapshotMetadata } from "./docx-snapshot";

export type NegotiatedContractPatch = {
	contractName?: string;
	vendor?: string;
	department?: string;
	amount?: number;
	currencyCode?: string;
	startDate?: string;
	contractExpiryDate?: string;
	daysUntilExpiry?: number;
};

/** Match wizard.service mappedDepartment allowlist. */
const CONTRACT_DEPARTMENTS = [
	"IT",
	"Finance",
	"Legal",
	"Operations",
	"Sales",
	"Marketing",
	"Executive",
	"Engineering",
	"Administration",
] as const;

const EMPTY = /^(—|--|-|n\/a|na|none|tbd|\.+\s*)?$/i;

/** Canonical MetaCard labels → Contracts fields. */
const LABEL_CANON: Record<string, string> = {
	"other party": "otherParty",
	"grantee / other party": "otherParty",
	counterparty: "otherParty",
	vendor: "otherParty",
	grantee: "otherParty",
	department: "department",
	value: "value",
	"grant / contract value": "value",
	amount: "value",
	"effective date": "effectiveDate",
	start: "effectiveDate",
	"start date": "effectiveDate",
	"expiry date": "expiryDate",
	expiry: "expiryDate",
	"end date": "expiryDate",
};

function normalizeLabel(label: string): string {
	return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isBlankMetaValue(value: string | undefined | null): boolean {
	if (value == null) return true;
	return EMPTY.test(value.trim());
}

export function parseMetadataEntries(
	text: string,
): NegotiationSnapshotMetadata[] {
	const entries: NegotiationSnapshotMetadata[] = [];
	for (const line of text.split("\n")) {
		const match = /^\s*-\s+([^:]+):\s*(.+)\s*$/.exec(line);
		if (!match) continue;
		entries.push({ label: match[1].trim(), value: match[2].trim() });
	}
	return entries;
}

export function parseDocumentTitle(text: string): string | undefined {
	for (const line of text.split("\n")) {
		const match = /^#\s+(.+)\s*$/.exec(line.trim());
		if (match) {
			const title = match[1].trim();
			if (title && !isBlankMetaValue(title)) return title.slice(0, 128);
			return undefined;
		}
	}
	return undefined;
}

/** Appwrite datetime columns — noon UTC ISO from YYYY-MM-DD or parseable date. */
export function toContractDatetime(
	dateStr: string | undefined,
): string | undefined {
	if (!dateStr?.trim() || isBlankMetaValue(dateStr)) return undefined;
	const raw = dateStr.trim();
	if (raw.includes("T")) {
		const parsed = new Date(raw);
		return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	if (match) {
		return new Date(
			Date.UTC(
				Number(match[1]),
				Number(match[2]) - 1,
				Number(match[3]),
				12,
				0,
				0,
			),
		).toISOString();
	}
	// Common display forms: Sep 7, 2026 / 09/07/2026
	const parsed = new Date(raw);
	if (Number.isNaN(parsed.getTime())) return undefined;
	return new Date(
		Date.UTC(
			parsed.getFullYear(),
			parsed.getMonth(),
			parsed.getDate(),
			12,
			0,
			0,
		),
	).toISOString();
}

export function mappedCurrency(code: string): string {
	const raw = (code || "USD").trim();
	if (raw.toLowerCase() === "other") return "other";
	const upper = raw.toUpperCase();
	if (["USD", "EUR", "GBP", "CAD", "MXN", "JPY", "AUD"].includes(upper)) {
		return upper;
	}
	return "USD";
}

export function mappedDepartment(department: string): string {
	const trimmed = department.trim();
	if ((CONTRACT_DEPARTMENTS as readonly string[]).includes(trimmed)) {
		return trimmed;
	}
	return "Administration";
}

export function parseValueField(raw: string): {
	amount?: number;
	currencyCode?: string;
} {
	if (isBlankMetaValue(raw)) return {};
	const text = raw.trim();
	const currencyMatch = text.match(/\b(USD|EUR|GBP|CAD|MXN|JPY|AUD|other)\b/i);
	const currencyCode = currencyMatch
		? mappedCurrency(currencyMatch[1])
		: undefined;
	const numeric = text.replace(/[^0-9.]/g, "");
	if (!numeric) return currencyCode ? { currencyCode } : {};
	const amount = Number(numeric);
	if (!Number.isFinite(amount)) {
		return currencyCode ? { currencyCode } : {};
	}
	return { amount, currencyCode: currencyCode || "USD" };
}

export function calculateDaysUntilExpiry(
	expiryDate: string,
): number | undefined {
	if (!expiryDate) return undefined;
	try {
		const expiryStr = expiryDate.split("T")[0];
		const [year, month, day] = expiryStr.split("-").map(Number);
		const expiry = new Date(year, month - 1, day);
		expiry.setHours(0, 0, 0, 0);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
	} catch {
		return undefined;
	}
}

type FactKey =
	| "otherParty"
	| "department"
	| "value"
	| "effectiveDate"
	| "expiryDate";

function factsFromEntries(
	entries: NegotiationSnapshotMetadata[],
): Partial<Record<FactKey, string>> {
	const facts: Partial<Record<FactKey, string>> = {};
	for (const entry of entries) {
		const key = LABEL_CANON[normalizeLabel(entry.label)];
		if (!key || isBlankMetaValue(entry.value)) continue;
		facts[key as FactKey] = entry.value.trim();
	}
	return facts;
}

/** Body lines like `Effective Date: 2026-09-10` (common after redlines). */
export function extractBodyFacts(
	text: string,
): Partial<Record<FactKey, string>> {
	const facts: Partial<Record<FactKey, string>> = {};
	const patterns: Array<{ key: FactKey; re: RegExp }> = [
		{
			key: "effectiveDate",
			re: /\bEffective\s+Date\s*[:-]\s*([^\n|]+)/gi,
		},
		{
			key: "expiryDate",
			re: /\b(?:Expiry|Expiration)\s+Date\s*[:-]\s*([^\n|]+)/gi,
		},
		{
			key: "department",
			re: /\bDepartment\s*[:-]\s*([^\n|]+)/gi,
		},
		{
			key: "otherParty",
			re: /\b(?:Other\s+party|Counterparty|Vendor|Grantee(?:\s+Name)?)\s*[:-]\s*([^\n|]+)/gi,
		},
		{
			key: "value",
			re: /\b(?:Grant\s+Amount|Contract\s+Value|Total\s+Value|Amount)\s*[:-]\s*([^\n|]+)/gi,
		},
	];
	for (const { key, re } of patterns) {
		let last: string | undefined;
		for (const match of text.matchAll(re)) {
			const value = match[1].trim().replace(/\*\*/g, "").replace(/_+/g, "");
			if (!isBlankMetaValue(value)) last = value;
		}
		// Last hit wins: MetaCard sits at the top; redlines land in later body lines.
		if (last) facts[key] = last;
	}
	return facts;
}

/**
 * Prefer body values when both MetaCard and body have a fact (redlines hit body).
 * MetaCard fills gaps.
 */
export function mergeNegotiatedFacts(
	card: Partial<Record<FactKey, string>>,
	body: Partial<Record<FactKey, string>>,
): Partial<Record<FactKey, string>> {
	const keys: FactKey[] = [
		"otherParty",
		"department",
		"value",
		"effectiveDate",
		"expiryDate",
	];
	const merged: Partial<Record<FactKey, string>> = {};
	for (const key of keys) {
		const bodyVal = body[key];
		const cardVal = card[key];
		if (bodyVal && !isBlankMetaValue(bodyVal)) {
			merged[key] = bodyVal;
		} else if (cardVal && !isBlankMetaValue(cardVal)) {
			merged[key] = cardVal;
		}
	}
	return merged;
}

export function buildContractPatchFromFacts(
	facts: Partial<Record<FactKey, string>>,
	title?: string,
): NegotiatedContractPatch {
	const patch: NegotiatedContractPatch = {};
	if (title && !isBlankMetaValue(title)) {
		patch.contractName = title.slice(0, 128);
	}
	if (facts.otherParty) {
		patch.vendor = facts.otherParty.slice(0, 50);
	}
	if (facts.department) {
		patch.department = mappedDepartment(facts.department);
	}
	if (facts.value) {
		const parsed = parseValueField(facts.value);
		if (parsed.amount != null) patch.amount = parsed.amount;
		if (parsed.currencyCode) patch.currencyCode = parsed.currencyCode;
	}
	const start = toContractDatetime(facts.effectiveDate);
	if (start) patch.startDate = start;
	const expiry = toContractDatetime(facts.expiryDate);
	if (expiry) {
		patch.contractExpiryDate = expiry;
		const days = calculateDaysUntilExpiry(expiry);
		if (days != null) patch.daysUntilExpiry = days;
	}
	return patch;
}

/** Full pipeline: version text → Contracts partial update (no empty overwrites). */
export function buildNegotiatedContractPatch(
	extractedText: string,
): NegotiatedContractPatch {
	const card = factsFromEntries(parseMetadataEntries(extractedText));
	const body = extractBodyFacts(extractedText);
	const facts = mergeNegotiatedFacts(card, body);
	const title = parseDocumentTitle(extractedText);
	return buildContractPatchFromFacts(facts, title);
}

/**
 * Refresh MetaCard entries after a redline so the next snapshot stays honest.
 * Starts from the post-redline text, then overlays body-extracted facts.
 */
export function refreshSnapshotMetadata(
	nextExtractedText: string,
	priorEntries?: NegotiationSnapshotMetadata[],
): NegotiationSnapshotMetadata[] {
	const fromText = parseMetadataEntries(nextExtractedText);
	const base =
		fromText.length > 0
			? fromText
			: (priorEntries || []).map((row) => ({ ...row }));
	const body = extractBodyFacts(nextExtractedText);
	const byCanon = new Map<string, number>();
	base.forEach((entry, index) => {
		const canon = LABEL_CANON[normalizeLabel(entry.label)];
		if (canon) byCanon.set(canon, index);
	});

	const ensure = (canon: FactKey, label: string, value: string) => {
		if (isBlankMetaValue(value)) return;
		const idx = byCanon.get(canon);
		if (idx != null) {
			base[idx] = { ...base[idx], value };
			return;
		}
		base.push({ label, value });
		byCanon.set(canon, base.length - 1);
	};

	if (body.otherParty) ensure("otherParty", "Other party", body.otherParty);
	if (body.department) ensure("department", "Department", body.department);
	if (body.value) ensure("value", "Value", body.value);
	if (body.effectiveDate) {
		ensure("effectiveDate", "Effective date", body.effectiveDate);
	}
	if (body.expiryDate) ensure("expiryDate", "Expiry date", body.expiryDate);

	return base;
}

/**
 * Rewrite `- Label: value` lines in a snapshot using refreshed MetaCard entries.
 * Used when Accept applies text-only (DOCX miss) so the card matches the body.
 */
export function withRefreshedMetadataBlock(
	text: string,
	metadata: NegotiationSnapshotMetadata[],
): string {
	if (metadata.length === 0) return text;
	const byLabel = new Map(
		metadata.map((entry) => [normalizeLabel(entry.label), entry.value.trim()]),
	);
	const byCanon = new Map<string, string>();
	for (const entry of metadata) {
		const canon = LABEL_CANON[normalizeLabel(entry.label)];
		if (canon && !isBlankMetaValue(entry.value)) {
			byCanon.set(canon, entry.value.trim());
		}
	}

	return text
		.split("\n")
		.map((line) => {
			const match = /^\s*-\s+([^:]+):\s*(.+)\s*$/.exec(line);
			if (!match) return line;
			const label = match[1].trim();
			const key = normalizeLabel(label);
			const canon = LABEL_CANON[key];
			const value =
				byLabel.get(key) || (canon ? byCanon.get(canon) : undefined);
			if (value == null || isBlankMetaValue(value)) return line;
			return `- ${label}: ${value}`;
		})
		.join("\n");
}
