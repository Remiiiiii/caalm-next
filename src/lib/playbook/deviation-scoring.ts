import { isClauseCategory } from "@/lib/clauses/clause-library.service";
import type { Clause } from "@/types/clauses";
import type {
	ClauseDeviation,
	DeviationCompareFn,
	DeviationCompareResult,
	DeviationReport,
	DeviationSeverity,
	DeviationVerdict,
	ExtractedClauseInput,
} from "@/types/playbook-deviations";
import { DEVIATION_SEVERITIES } from "@/types/playbook-deviations";
import { extractJsonObjectFromModelText } from "@/lib/ai/contractTypeSuggestionSchema";

const MAX_RATIONALE = 800;
const MAX_POINT = 280;
const MAX_POINTS = 8;

export function normalizeClauseBody(text: string): string {
	return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function titleKey(value: string | undefined): string {
	return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Pick the org standard for an extracted clause: category first, then title. */
export function pickStandardForClause(
	extracted: ExtractedClauseInput,
	standards: Clause[],
): Clause | null {
	const published = standards.filter(
		(row) => row.status === "active" && row.isCurrent,
	);
	if (!published.length) return null;

	if (extracted.category) {
		const inCategory = published.filter(
			(row) => row.category === extracted.category,
		);
		if (inCategory.length === 1) return inCategory[0];
		if (inCategory.length > 1) {
			const titled = inCategory.find(
				(row) => titleKey(row.title) === titleKey(extracted.title),
			);
			return titled ?? inCategory[0];
		}
	}

	if (extracted.title?.trim()) {
		const byTitle = published.find(
			(row) => titleKey(row.title) === titleKey(extracted.title),
		);
		if (byTitle) return byTitle;
	}

	return null;
}

function isCompareVerdict(value: unknown): value is "pass" | "deviate" {
	return value === "pass" || value === "deviate";
}

function isSeverity(value: unknown): value is DeviationSeverity {
	return (
		typeof value === "string" &&
		(DEVIATION_SEVERITIES as readonly string[]).includes(value)
	);
}

export function parseDeviationCompareResult(
	raw: unknown,
): DeviationCompareResult {
	let parsed: unknown = raw;
	if (typeof raw === "string") {
		try {
			parsed = JSON.parse(extractJsonObjectFromModelText(raw));
		} catch {
			return {
				verdict: "deviate",
				severity: "medium",
				rationale: "The comparison result was not valid JSON.",
				differingPoints: [],
			};
		}
	}

	if (!parsed || typeof parsed !== "object") {
		return {
			verdict: "deviate",
			severity: "medium",
			rationale: "The comparison result was empty.",
			differingPoints: [],
		};
	}

	const row = parsed as Record<string, unknown>;
	const verdict = isCompareVerdict(row.verdict) ? row.verdict : "deviate";
	const severity = isSeverity(row.severity) ? row.severity : "medium";
	const rationale =
		typeof row.rationale === "string" && row.rationale.trim()
			? row.rationale.trim().slice(0, MAX_RATIONALE)
			: verdict === "pass"
				? "Matches the published playbook wording."
				: "The extracted clause differs from the playbook standard.";

	const points = Array.isArray(row.differingPoints)
		? row.differingPoints
				.filter((item): item is string => typeof item === "string")
				.map((item) => item.trim())
				.filter(Boolean)
				.slice(0, MAX_POINTS)
				.map((item) => item.slice(0, MAX_POINT))
		: [];

	return { verdict, severity, rationale, differingPoints: points };
}

function toDeviation(input: {
	extracted: ExtractedClauseInput;
	standard: Clause | null;
	verdict: DeviationVerdict;
	severity: DeviationSeverity;
	rationale: string;
	differingPoints: string[];
}): ClauseDeviation {
	return {
		extractedId: input.extracted.id,
		extractedTitle: input.extracted.title,
		extractedCategory: input.extracted.category,
		standardId: input.standard?.$id ?? null,
		standardFamilyId: input.standard?.familyId ?? null,
		standardVersion: input.standard?.version ?? null,
		standardTitle: input.standard?.title ?? null,
		verdict: input.verdict,
		severity: input.severity,
		rationale: input.rationale,
		differingPoints: input.differingPoints,
	};
}

export async function scorePlaybookDeviations(input: {
	extractedClauses: ExtractedClauseInput[];
	standards: Clause[];
	compare: DeviationCompareFn;
}): Promise<DeviationReport> {
	const deviations: ClauseDeviation[] = [];

	for (const extracted of input.extractedClauses) {
		const body = extracted.body?.trim() ?? "";
		if (!body) continue;

		const standard = pickStandardForClause(extracted, input.standards);
		if (!standard) {
			deviations.push(
				toDeviation({
					extracted,
					standard: null,
					verdict: "no_standard",
					severity: "medium",
					rationale:
						"No published playbook standard matches this clause category.",
					differingPoints: [],
				}),
			);
			continue;
		}

		if (normalizeClauseBody(body) === normalizeClauseBody(standard.body)) {
			deviations.push(
				toDeviation({
					extracted,
					standard,
					verdict: "pass",
					severity: "low",
					rationale: "Matches the published playbook wording.",
					differingPoints: [],
				}),
			);
			continue;
		}

		const compared = parseDeviationCompareResult(
			await input.compare(extracted, standard),
		);
		deviations.push(
			toDeviation({
				extracted,
				standard,
				verdict: compared.verdict,
				severity: compared.severity,
				rationale: compared.rationale,
				differingPoints: compared.differingPoints,
			}),
		);
	}

	return {
		deviations,
		summary: {
			passCount: deviations.filter((row) => row.verdict === "pass").length,
			deviateCount: deviations.filter((row) => row.verdict === "deviate")
				.length,
			noStandardCount: deviations.filter((row) => row.verdict === "no_standard")
				.length,
		},
	};
}

export function parseExtractedClauses(raw: unknown): ExtractedClauseInput[] {
	let parsed: unknown = raw;
	if (typeof raw === "string") {
		try {
			parsed = JSON.parse(extractJsonObjectFromModelText(raw));
		} catch {
			return [];
		}
	}

	const list = Array.isArray(parsed)
		? parsed
		: parsed && typeof parsed === "object"
			? (parsed as Record<string, unknown>).clauses
			: null;
	if (!Array.isArray(list)) return [];

	const clauses: ExtractedClauseInput[] = [];
	for (const item of list) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const body = typeof row.body === "string" ? row.body.trim() : "";
		if (!body) continue;
		clauses.push({
			id: typeof row.id === "string" ? row.id : undefined,
			title: typeof row.title === "string" ? row.title.trim() : undefined,
			category: isClauseCategory(row.category) ? row.category : undefined,
			body,
		});
	}
	return clauses;
}
