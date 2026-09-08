import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROADMAP_CATALOG } from "@/lib/roadmap/catalog";
import { SECTION_7_SCOPE } from "@/lib/roadmap/section-scopes/9-negotiation-workspace";

describe("roadmap task 7.1 build-vs-partner decision", () => {
	const section = ROADMAP_CATALOG.find((row) => row.sectionNumber === 7);
	const task = section?.tasks.find((row) => row.taskCode === "7.1");

	it("is catalogued under Negotiation & Authoring Workspace with PR 62", () => {
		expect(section?.linkedPrNumbers).toContain(62);
		expect(task).toBeDefined();
		expect(task?.title).toMatch(/build-vs-partner/i);
		expect(task?.description).toMatch(/007-native-negotiation-workspace/);
		expect(
			task?.acceptanceCriteria.some((line) => /decision artifact/i.test(line)),
		).toBe(true);
	});

	it("records the native decision on the section scope and ADR file", () => {
		expect(SECTION_7_SCOPE.sectionNumber).toBe(7);
		expect(SECTION_7_SCOPE.decisionArtifact).toBe(
			"docs/adr/007-native-negotiation-workspace.md",
		);
		expect(
			existsSync(resolve(process.cwd(), SECTION_7_SCOPE.decisionArtifact)),
		).toBe(true);
	});
});
