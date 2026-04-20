import { z } from "zod";

/** Safe default when AI is unavailable or output is invalid — never use config array order. */
export const DEFAULT_FALLBACK_CONTRACT_TYPE_ID = "vendor";

export type ContractTypeSuggestionResult = {
	primaryTypeId: string;
	confidence: number;
	alternates: Array<{ typeId: string; confidence?: number }>;
	rationale: string;
};

const alternateSchema = z.object({
	typeId: z.coerce.string(),
	confidence: z.coerce.number().min(0).max(1).optional(),
});

const rawSuggestionSchema = z.object({
	primaryTypeId: z.coerce.string(),
	confidence: z.coerce.number().min(0).max(1).optional(),
	alternates: z.array(alternateSchema).max(2).optional(),
	rationale: z.string().max(2000).optional(),
});

export type ContractTypeIdSource = { id: string; label: string };

/** Strip markdown fences and grab the outermost JSON object if the model adds noise. */
export function extractJsonObjectFromModelText(raw: string): string {
	let t = raw.trim();
	const fence = /^```(?:json)?\s*\n?([\s\S]*?)```/m.exec(t);
	if (fence) t = fence[1].trim();
	const start = t.indexOf("{");
	const end = t.lastIndexOf("}");
	if (start >= 0 && end > start) return t.slice(start, end + 1);
	return t;
}

function compactAlphanumeric(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Map model output (canonical id, variant casing, human label, etc.) to a config id.
 */
export function resolveContractTypeId(
	raw: string,
	validIds: readonly string[],
	configs: readonly ContractTypeIdSource[],
): string | null {
	const t = raw.trim();
	if (!t) return null;

	if (validIds.includes(t)) return t;

	const tl = t.toLowerCase();
	for (const id of validIds) {
		if (id.toLowerCase() === tl) return id;
	}

	const underscored = tl.replace(/\s+/g, "_").replace(/-/g, "_");
	for (const id of validIds) {
		if (id.toLowerCase() === underscored) return id;
	}

	const compactT = compactAlphanumeric(t);
	for (const id of validIds) {
		if (compactAlphanumeric(id) === compactT) return id;
	}
	for (const c of configs) {
		if (compactAlphanumeric(c.label) === compactT) return c.id;
	}

	return null;
}

export function buildContractTypeFallbackResult(
	rationale: string,
): ContractTypeSuggestionResult {
	return {
		primaryTypeId: DEFAULT_FALLBACK_CONTRACT_TYPE_ID,
		confidence: 0,
		alternates: [],
		rationale,
	};
}

/**
 * Parse model JSON text and enforce allow-list + dedupe. Returns fallback if anything is invalid.
 * Pass `configs` so labels / near-matches from the model map to real ids (otherwise everything
 * invalid fell through to DEFAULT_FALLBACK_CONTRACT_TYPE_ID = vendor).
 */
export function parseContractTypeSuggestionJson(
	rawJson: string,
	validIds: readonly string[],
	configs: readonly ContractTypeIdSource[],
): ContractTypeSuggestionResult {
	const allow = new Set(validIds);
	let parsed: unknown;
	try {
		parsed = JSON.parse(extractJsonObjectFromModelText(rawJson)) as unknown;
	} catch {
		return buildContractTypeFallbackResult(
			"We could not read the suggestion. Pick a type below or browse all contract types.",
		);
	}

	const zod = rawSuggestionSchema.safeParse(parsed);
	if (!zod.success) {
		return buildContractTypeFallbackResult(
			"The suggestion was unclear. Pick a type below or browse all contract types.",
		);
	}

	const { primaryTypeId: rawPrimary, confidence, alternates, rationale } =
		zod.data;
	const primaryTypeId = resolveContractTypeId(
		rawPrimary,
		validIds,
		configs,
	);
	if (!primaryTypeId || !allow.has(primaryTypeId)) {
		return buildContractTypeFallbackResult(
			"The suggested type was not recognized. Pick a type below or browse all contract types.",
		);
	}

	const altIn: Array<{ typeId: string; confidence?: number }> =
		alternates ?? [];
	const seen = new Set<string>([primaryTypeId]);
	const alternatesOut: Array<{ typeId: string; confidence?: number }> = [];
	for (const a of altIn) {
		const rid = resolveContractTypeId(a.typeId, validIds, configs);
		if (!rid || !allow.has(rid) || seen.has(rid)) continue;
		seen.add(rid);
		alternatesOut.push({
			typeId: rid,
			...(a.confidence !== undefined ? { confidence: a.confidence } : {}),
		});
		if (alternatesOut.length >= 2) break;
	}

	return {
		primaryTypeId,
		confidence: confidence ?? 0.5,
		alternates: alternatesOut,
		rationale: (rationale ?? "").trim(),
	};
}
