import { z } from "zod";
import {
	type ContractTypeIdSource,
	extractJsonObjectFromModelText,
	resolveContractTypeId,
} from "./contractTypeSuggestionSchema";

/** Safe default when AI is unavailable or output is invalid — never use config array order. */
export const DEFAULT_FALLBACK_LICENSE_TYPE_ID = "nonprofit-corporate";

export type LicenseTypeSuggestionResult = {
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

export function buildLicenseTypeFallbackResult(
	rationale: string,
): LicenseTypeSuggestionResult {
	return {
		primaryTypeId: DEFAULT_FALLBACK_LICENSE_TYPE_ID,
		confidence: 0,
		alternates: [],
		rationale,
	};
}

/**
 * Parse model JSON text and enforce allow-list + dedupe. Returns fallback if
 * anything is invalid. Reuses the id-resolution logic from the contract
 * quiz's schema module (same fuzzy-match behavior, different id space).
 */
export function parseLicenseTypeSuggestionJson(
	rawJson: string,
	validIds: readonly string[],
	configs: readonly ContractTypeIdSource[],
): LicenseTypeSuggestionResult {
	const allow = new Set(validIds);
	let parsed: unknown;
	try {
		parsed = JSON.parse(extractJsonObjectFromModelText(rawJson)) as unknown;
	} catch {
		return buildLicenseTypeFallbackResult(
			"We could not read the suggestion. Pick a type below or browse all license types.",
		);
	}

	const zod = rawSuggestionSchema.safeParse(parsed);
	if (!zod.success) {
		return buildLicenseTypeFallbackResult(
			"The suggestion was unclear. Pick a type below or browse all license types.",
		);
	}

	const {
		primaryTypeId: rawPrimary,
		confidence,
		alternates,
		rationale,
	} = zod.data;
	const primaryTypeId = resolveContractTypeId(rawPrimary, validIds, configs);
	if (!primaryTypeId || !allow.has(primaryTypeId)) {
		return buildLicenseTypeFallbackResult(
			"The suggested type was not recognized. Pick a type below or browse all license types.",
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
