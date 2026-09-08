import { describe, expect, it } from "vitest";
import { scorePlaybookDeviations } from "@/lib/playbook/deviation-scoring";
import { ROADMAP_CATALOG } from "@/lib/roadmap/catalog";
import type { Clause } from "@/types/clauses";

function clause(overrides: Partial<Clause> = {}): Clause {
	return {
		$id: "std_1",
		$createdAt: "2026-08-01T00:00:00.000Z",
		$updatedAt: "2026-08-01T00:00:00.000Z",
		orgId: "org_a",
		familyId: "fam_1",
		version: 1,
		isCurrent: true,
		title: "Confidentiality",
		category: "confidentiality",
		body: "Keep secrets.",
		status: "active",
		createdBy: "user_1",
		updatedBy: "user_1",
		...overrides,
	};
}

describe("roadmap task 5.3 playbook deviation scoring", () => {
	const section = ROADMAP_CATALOG.find((row) => row.sectionNumber === 5);
	const task = section?.tasks.find((row) => row.taskCode === "5.3");

	it("is catalogued against PR 69", () => {
		expect(task).toBeDefined();
		expect(task?.linkedPrNumber).toBe(69);
		expect(task?.title).toMatch(/playbook deviation/i);
		expect(
			task?.acceptanceCriteria.some((line) => /off-standard/i.test(line)),
		).toBe(true);
		expect(
			task?.acceptanceCriteria.some((line) => /matching standard/i.test(line)),
		).toBe(true);
	});

	it("flags an off-standard clause and passes a matching standard", async () => {
		const report = await scorePlaybookDeviations({
			extractedClauses: [
				{ category: "confidentiality", body: "Keep secrets." },
				{
					category: "confidentiality",
					title: "Confidentiality",
					body: "Either party may publish confidential information.",
				},
			],
			standards: [clause()],
			compare: async (_extracted, standard) => ({
				verdict: "deviate",
				severity: "high",
				rationale: `Differs from ${standard.title}.`,
				differingPoints: ["Allows publication"],
			}),
		});

		expect(report.summary.passCount).toBe(1);
		expect(report.summary.deviateCount).toBe(1);
		expect(report.deviations.map((row) => row.verdict)).toEqual([
			"pass",
			"deviate",
		]);
	});
});
