import type { ClauseCategory } from "@/types/clauses";

export const DEVIATION_VERDICTS = ["pass", "deviate", "no_standard"] as const;
export const DEVIATION_SEVERITIES = ["low", "medium", "high"] as const;

export type DeviationVerdict = (typeof DEVIATION_VERDICTS)[number];
export type DeviationSeverity = (typeof DEVIATION_SEVERITIES)[number];

export type ExtractedClauseInput = {
	id?: string;
	title?: string;
	category?: ClauseCategory;
	body: string;
};

export type DeviationCompareResult = {
	verdict: "pass" | "deviate";
	severity: DeviationSeverity;
	rationale: string;
	differingPoints: string[];
};

export type ClauseDeviation = {
	extractedId?: string;
	extractedTitle?: string;
	extractedCategory?: ClauseCategory;
	standardId: string | null;
	standardFamilyId: string | null;
	standardVersion: number | null;
	standardTitle: string | null;
	verdict: DeviationVerdict;
	severity: DeviationSeverity;
	rationale: string;
	differingPoints: string[];
};

export type DeviationReport = {
	deviations: ClauseDeviation[];
	summary: {
		passCount: number;
		deviateCount: number;
		noStandardCount: number;
	};
};

export type DeviationCompareFn = (
	extracted: ExtractedClauseInput,
	standard: {
		$id: string;
		title: string;
		category: ClauseCategory;
		body: string;
	},
) => Promise<DeviationCompareResult> | DeviationCompareResult;
