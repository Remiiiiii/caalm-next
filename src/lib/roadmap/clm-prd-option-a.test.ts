import { describe, expect, it } from "vitest";
import { ROADMAP_CATALOG } from "./catalog";
import { executionTrackedSectionNumbers } from "./catalog-query";
import { computeUnlocked, lockReasonForTask } from "./locking";
import { buildSeedSnapshot } from "./store";

describe("CLM Option A — execution tracked on PRD", () => {
	it("marks CLM sections 1 and 2 as PRD pointers", () => {
		expect(executionTrackedSectionNumbers(ROADMAP_CATALOG)).toEqual([1, 2]);
		const sec1 = ROADMAP_CATALOG.find((s) => s.sectionNumber === 1);
		expect(sec1?.executionTrackedOn).toBe("prd");
		expect(sec1?.linkedPrNumbers ?? []).toEqual([]);
		expect(sec1?.tasks[0]?.description).toMatch(/Platform Readiness — Option A/);
	});

	it("prior-section gate skips execution-tracked §1–2 once section 0 is complete", () => {
		let { sections, tasks } = buildSeedSnapshot("clm");
		const sec0 = sections.find((s) => s.sectionNumber === 0)!;
		for (const row of tasks.filter((t) => t.sectionId === sec0.$id)) {
			row.status = "complete";
		}
		sec0.status = "complete";
		const { snapshot } = computeUnlocked({
			sections,
			tasks,
			executionTrackedSectionNumbers: [1, 2],
		});
		const sec3 = snapshot.sections.find((s) => s.sectionNumber === 3);
		expect(sec3?.status).not.toBe("locked");
	});

	it("shows PRD lock reason on pointer tasks", () => {
		const { sections, tasks } = buildSeedSnapshot("clm");
		const task11 = tasks.find((t) => t.taskCode === "1.1");
		expect(task11?.status).toBe("locked");
		const reason = lockReasonForTask(task11!, {
			sections,
			tasks,
			executionTrackedSectionNumbers: [1, 2],
		});
		expect(reason).toMatch(/Platform Readiness/);
	});
});
