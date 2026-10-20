import { z } from "zod";
import { extractJsonObjectFromModelText } from "@/lib/ai/contractTypeSuggestionSchema";
import { model } from "@/lib/ai/gemini";
import {
	CFCE_EVIDENCE_MATCH_RULES,
	contractCandidate,
	heuristicRecordMatches,
	licenseCandidate,
} from "./evidence-coverage";
import {
	catalogForRecordKind,
	type EvidenceRecordKind,
} from "./evidence-map.seed";

export interface EvidenceTagSuggestion {
	requirementId: string;
	label: string;
	confidence: number;
	rationale: string;
	source: "ai" | "fallback";
}

export interface RecommendTagsInput {
	kind: EvidenceRecordKind;
	title: string;
	type?: string;
	category?: string;
	division?: string;
	description?: string;
	vendor?: string;
}

const suggestionSchema = z.object({
	suggestions: z
		.array(
			z.object({
				requirementId: z.string(),
				confidence: z.coerce.number().min(0).max(1).optional(),
				rationale: z.string().max(400).optional(),
			}),
		)
		.max(12)
		.optional(),
});

export async function recommendEvidenceTags(
	input: RecommendTagsInput,
): Promise<EvidenceTagSuggestion[]> {
	const catalog = catalogForRecordKind(input.kind);
	if (catalog.length === 0) return [];

	if (process.env.GOOGLE_API_KEY) {
		try {
			const fromAi = await recommendWithGemini(input, catalog);
			if (fromAi.length > 0) return fromAi;
		} catch (error) {
			console.warn(
				"[SERVER] recommendEvidenceTags: Gemini failed, using fallback",
				error instanceof Error ? error.message : error,
			);
		}
	}

	return fallbackSuggestions(input, catalog);
}

function fallbackSuggestions(
	input: RecommendTagsInput,
	catalog: ReturnType<typeof catalogForRecordKind>,
): EvidenceTagSuggestion[] {
	const candidate =
		input.kind === "license"
			? licenseCandidate({
					$id: "preview",
					licenseName: input.title,
					licenseType: input.type,
					category: input.category,
					division: input.division,
					notes: input.description,
					vendor: input.vendor,
				})
			: contractCandidate({
					$id: "preview",
					contractName: input.title,
					contractType: input.type,
					division: input.division,
					description: input.description,
					vendor: input.vendor,
				});

	return catalog
		.filter((row) =>
			heuristicRecordMatches(
				candidate,
				row.caalmModule,
				CFCE_EVIDENCE_MATCH_RULES[row.requirementId],
			),
		)
		.map((row) => ({
			requirementId: row.requirementId,
			label: row.label,
			confidence: 0.45,
			rationale: "Suggested from the record name and type.",
			source: "fallback" as const,
		}));
}

async function recommendWithGemini(
	input: RecommendTagsInput,
	catalog: ReturnType<typeof catalogForRecordKind>,
): Promise<EvidenceTagSuggestion[]> {
	const allowList = catalog
		.map((row) => `- ${row.requirementId}: ${row.label}`)
		.join("\n");
	const prompt = `You recommend which audit evidence-map requirements a CAALM ${input.kind} satisfies.
Return ONE JSON object only: {"suggestions":[{"requirementId":"...","confidence":0-1,"rationale":"..."}]}.
Use only requirementId values from this allow-list. Omit if unsure. Do not invent ids.

Allow-list:
${allowList}

Record:
kind: ${input.kind}
title: ${input.title}
type: ${input.type || ""}
category: ${input.category || ""}
division: ${input.division || ""}
vendor: ${input.vendor || ""}
description: ${(input.description || "").slice(0, 800)}`;

	const result = await model.generateContent(prompt);
	const raw = extractJsonObjectFromModelText(result.response.text());
	const parsed = suggestionSchema.safeParse(JSON.parse(raw));
	if (!parsed.success) return [];

	const byId = new Map(catalog.map((row) => [row.requirementId, row]));
	const seen = new Set<string>();
	const suggestions: EvidenceTagSuggestion[] = [];
	for (const item of parsed.data.suggestions ?? []) {
		const row = byId.get(item.requirementId);
		if (!row || seen.has(row.requirementId)) continue;
		seen.add(row.requirementId);
		suggestions.push({
			requirementId: row.requirementId,
			label: row.label,
			confidence: item.confidence ?? 0.6,
			rationale: item.rationale || "Suggested by AI from the record fields.",
			source: "ai",
		});
	}
	return suggestions;
}
