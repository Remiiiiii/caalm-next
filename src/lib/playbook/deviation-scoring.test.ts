import { describe, expect, it } from "vitest";
import {
	normalizeClauseBody,
	parseDeviationCompareResult,
	parseExtractedClauses,
	pickStandardForClause,
	scorePlaybookDeviations,
} from "@/lib/playbook/deviation-scoring";
import type { Clause } from "@/types/clauses";

function clause(overrides: Partial<Clause> = {}): Clause {
	return {
		$id: "std_conf",
		$createdAt: "2026-08-01T00:00:00.000Z",
		$updatedAt: "2026-08-01T00:00:00.000Z",
		orgId: "org_a",
		familyId: "fam_conf",
		version: 2,
		isCurrent: true,
		title: "Confidentiality",
		category: "confidentiality",
		body: "Each party shall keep confidential information secret.",
		status: "active",
		createdBy: "user_1",
		updatedBy: "user_1",
		...overrides,
	};
}

describe("normalizeClauseBody", () => {
	it("collapses whitespace and casing so identical wording matches", () => {
		expect(
			normalizeClauseBody("  Each Party SHALL keep\nconfidential information secret. "),
		).toBe(normalizeClauseBody("Each party shall keep confidential information secret."));
	});
});

describe("pickStandardForClause", () => {
	it("prefers category, then title", () => {
		const standards = [
			clause(),
			clause({
				$id: "std_pay",
				familyId: "fam_pay",
				title: "Payment",
				category: "payment",
				body: "Net 30.",
			}),
		];
		expect(
			pickStandardForClause(
				{ category: "payment", body: "Pay later." },
				standards,
			)?.$id,
		).toBe("std_pay");
		expect(
			pickStandardForClause(
				{ title: "Confidentiality", body: "Keep secrets." },
				standards,
			)?.$id,
		).toBe("std_conf");
	});

	it("ignores draft and non-current rows", () => {
		expect(
			pickStandardForClause(
				{ category: "confidentiality", body: "Keep secrets." },
				[clause({ status: "draft" }), clause({ isCurrent: false })],
			),
		).toBeNull();
	});
});

describe("parseDeviationCompareResult", () => {
	it("allow-lists verdict and severity and strips junk keys", () => {
		const parsed = parseDeviationCompareResult({
			verdict: "deviate",
			severity: "high",
			rationale: "Cap is missing.",
			differingPoints: ["No liability cap"],
			extra: true,
		});
		expect(parsed).toEqual({
			verdict: "deviate",
			severity: "high",
			rationale: "Cap is missing.",
			differingPoints: ["No liability cap"],
		});
	});

	it("falls back to deviate/medium on invalid JSON", () => {
		const parsed = parseDeviationCompareResult("not json");
		expect(parsed.verdict).toBe("deviate");
		expect(parsed.severity).toBe("medium");
	});

	it("parses JSON wrapped in markdown fences", () => {
		const parsed = parseDeviationCompareResult(`\`\`\`json
{"verdict":"pass","severity":"low","rationale":"Same effect.","differingPoints":[]}
\`\`\``);
		expect(parsed.verdict).toBe("pass");
	});
});

describe("parseExtractedClauses", () => {
	it("keeps only rows with a body and a known category", () => {
		const clauses = parseExtractedClauses({
			clauses: [
				{ title: "Confidentiality", category: "confidentiality", body: "Keep secrets." },
				{ title: "Skip", category: "not-a-category", body: "x" },
				{ title: "Empty", category: "payment", body: "  " },
			],
		});
		expect(clauses).toEqual([
			{
				title: "Confidentiality",
				category: "confidentiality",
				body: "Keep secrets.",
			},
			{ title: "Skip", category: undefined, body: "x" },
		]);
	});
});

describe("scorePlaybookDeviations", () => {
	it("passes an exact match without calling compare", async () => {
		let compareCalls = 0;
		const report = await scorePlaybookDeviations({
			extractedClauses: [
				{
					id: "ex1",
					category: "confidentiality",
					title: "Confidentiality",
					body: "Each party shall keep confidential information secret.",
				},
			],
			standards: [clause()],
			compare: () => {
				compareCalls += 1;
				return {
					verdict: "deviate",
					severity: "high",
					rationale: "should not run",
					differingPoints: [],
				};
			},
		});
		expect(compareCalls).toBe(0);
		expect(report.summary).toEqual({
			passCount: 1,
			deviateCount: 0,
			noStandardCount: 0,
		});
		expect(report.deviations[0]?.verdict).toBe("pass");
		expect(report.deviations[0]?.standardId).toBe("std_conf");
	});

	it("flags an off-standard clause from compare()", async () => {
		const report = await scorePlaybookDeviations({
			extractedClauses: [
				{
					category: "confidentiality",
					body: "Either party may share confidential information freely.",
				},
			],
			standards: [clause()],
			compare: () => ({
				verdict: "deviate",
				severity: "high",
				rationale: "The extracted clause removes the secrecy duty.",
				differingPoints: ["Allows free disclosure"],
			}),
		});
		expect(report.summary.deviateCount).toBe(1);
		expect(report.deviations[0]).toMatchObject({
			verdict: "deviate",
			severity: "high",
			standardFamilyId: "fam_conf",
			standardVersion: 2,
		});
	});

	it("marks a clause with no matching standard", async () => {
		const report = await scorePlaybookDeviations({
			extractedClauses: [
				{
					category: "termination",
					body: "Either party may terminate for convenience.",
				},
			],
			standards: [clause()],
			compare: () => {
				throw new Error("should not compare without a standard");
			},
		});
		expect(report.summary.noStandardCount).toBe(1);
		expect(report.deviations[0]?.verdict).toBe("no_standard");
		expect(report.deviations[0]?.severity).toBe("medium");
		expect(report.deviations[0]?.standardId).toBeNull();
	});
});
