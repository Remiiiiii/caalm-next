import { describe, expect, it } from "vitest";
import {
	extractJsonObjectFromModelText,
	parseContractTypeSuggestionJson,
	resolveContractTypeId,
} from "@/lib/ai/contractTypeSuggestionSchema";

const MIN_CONFIGS = [
	{ id: "employment", label: "Employment Contract" },
	{ id: "vendor", label: "Vendor/Service Agreement" },
	{ id: "lease", label: "Lease Agreement" },
	{ id: "grant", label: "Grant Agreement" },
] as const;

const VALID_IDS = MIN_CONFIGS.map((c) => c.id);

describe("extractJsonObjectFromModelText", () => {
	it("strips markdown fences", () => {
		const raw = '```json\n{"primaryTypeId":"lease"}\n```';
		expect(extractJsonObjectFromModelText(raw)).toBe(
			'{"primaryTypeId":"lease"}',
		);
	});

	it("extracts first object from surrounding text", () => {
		const raw =
			'Here you go: {"primaryTypeId":"grant","confidence":0.9} trailing';
		expect(extractJsonObjectFromModelText(raw)).toBe(
			'{"primaryTypeId":"grant","confidence":0.9}',
		);
	});
});

describe("resolveContractTypeId", () => {
	it("accepts exact ids", () => {
		expect(resolveContractTypeId("lease", VALID_IDS, MIN_CONFIGS)).toBe(
			"lease",
		);
	});

	it("matches case-insensitive id", () => {
		expect(resolveContractTypeId("LEASE", VALID_IDS, MIN_CONFIGS)).toBe(
			"lease",
		);
	});

	it("maps display labels to ids", () => {
		expect(
			resolveContractTypeId("Employment Contract", VALID_IDS, MIN_CONFIGS),
		).toBe("employment");
		expect(
			resolveContractTypeId("Vendor/Service Agreement", VALID_IDS, MIN_CONFIGS),
		).toBe("vendor");
	});

	it("returns null for unknown strings", () => {
		expect(
			resolveContractTypeId("Totally Unknown", VALID_IDS, MIN_CONFIGS),
		).toBeNull();
	});
});

describe("parseContractTypeSuggestionJson", () => {
	it("resolves label primaryTypeId to canonical id", () => {
		const json = JSON.stringify({
			primaryTypeId: "Lease Agreement",
			confidence: 0.88,
			alternates: [{ typeId: "Grant Agreement" }],
			rationale: "Based on property context.",
		});
		const out = parseContractTypeSuggestionJson(json, VALID_IDS, MIN_CONFIGS);
		expect(out.primaryTypeId).toBe("lease");
		expect(out.confidence).toBe(0.88);
		expect(out.alternates[0]?.typeId).toBe("grant");
	});

	it("falls back to vendor on invalid JSON", () => {
		const out = parseContractTypeSuggestionJson(
			"not json",
			VALID_IDS,
			MIN_CONFIGS,
		);
		expect(out.primaryTypeId).toBe("vendor");
		expect(out.confidence).toBe(0);
	});
});
