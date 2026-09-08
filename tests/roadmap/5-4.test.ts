import { describe, expect, it } from "vitest";
import { buildSeededDeviationReport } from "@/lib/playbook/seeded-deviations";
import { ROADMAP_CATALOG } from "@/lib/roadmap/catalog";

describe("roadmap task 5.4 surface deviations in review UI", () => {
	const section = ROADMAP_CATALOG.find((row) => row.sectionNumber === 5);
	const task = section?.tasks.find((row) => row.taskCode === "5.4");

	it("is catalogued against PR 70", () => {
		expect(task).toBeDefined();
		expect(task?.linkedPrNumber).toBe(70);
		expect(task?.title).toMatch(/surface deviations/i);
		expect(
			task?.acceptanceCriteria.some((line) => /severity/i.test(line)),
		).toBe(true);
		expect(
			task?.acceptanceCriteria.some((line) => /seeded deviations/i.test(line)),
		).toBe(true);
	});

	it("seeds a report with severity for off-standard clauses", () => {
		const report = buildSeededDeviationReport();
		expect(report.summary.passCount).toBe(1);
		expect(report.summary.deviateCount).toBe(1);
		expect(report.summary.noStandardCount).toBe(1);

		const deviate = report.deviations.find((row) => row.verdict === "deviate");
		expect(deviate?.severity).toBe("high");
		expect(deviate?.rationale.length).toBeGreaterThan(0);

		const pass = report.deviations.find((row) => row.verdict === "pass");
		expect(pass?.severity).toBe("low");
	});
});
