import { describe, expect, it } from "vitest";
import { scoreOrgContractDeviations } from "@/lib/playbook/score-org-contract";
import type { Clause } from "@/types/clauses";

function clause(): Clause {
	return {
		$id: "std_conf",
		$createdAt: "2026-08-01T00:00:00.000Z",
		$updatedAt: "2026-08-01T00:00:00.000Z",
		orgId: "org_a",
		familyId: "fam_conf",
		version: 1,
		isCurrent: true,
		title: "Confidentiality",
		category: "confidentiality",
		body: "Keep secrets.",
		status: "active",
		createdBy: "user_1",
		updatedBy: "user_1",
	};
}

describe("scoreOrgContractDeviations", () => {
	it("loads org standards and scores provided clauses", async () => {
		const report = await scoreOrgContractDeviations({
			orgId: "org_a",
			clauses: [{ category: "confidentiality", body: "Keep secrets." }],
			listStandards: async () => [clause()],
			compare: () => {
				throw new Error("exact match should skip compare");
			},
		});
		expect(report.summary.passCount).toBe(1);
	});

	it("extracts clauses from content when none are provided", async () => {
		const report = await scoreOrgContractDeviations({
			orgId: "org_a",
			content: "A long contract about payment.",
			listStandards: async () => [clause()],
			extractClauses: async () => [
				{ category: "termination", body: "Either party may walk away." },
			],
			compare: () => ({
				verdict: "deviate",
				severity: "medium",
				rationale: "unused",
				differingPoints: [],
			}),
		});
		expect(report.summary.noStandardCount).toBe(1);
	});
});
