import { describe, expect, it } from "vitest";
import { ROADMAP_CATALOG } from "@/lib/roadmap/catalog";

describe("roadmap task 5.5 guided contract wizard", () => {
	const section = ROADMAP_CATALOG.find((row) => row.sectionNumber === 5);
	const task = section?.tasks.find((row) => row.taskCode === "5.5");

	it("is catalogued under Clause Library, Templates & AI Playbooks", () => {
		expect(task).toBeDefined();
		expect(task?.linkedPrNumber).toBe(71);
		expect(task?.title).toMatch(/guided contract/i);
		expect(
			task?.acceptanceCriteria.some((line) => /new contract/i.test(line)),
		).toBe(true);
		expect(task?.acceptanceCriteria.some((line) => /inject/i.test(line))).toBe(
			true,
		);
	});
});
