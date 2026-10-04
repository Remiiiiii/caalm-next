import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "@/lib/roadmap/platform-readiness-catalog";

describe("PRD 1.4 sales and support isolation note", () => {
	it("ships the internal note with honest scope language", () => {
		const note = readFileSync(
			join(process.cwd(), "docs/internal/workspace-isolation-note.md"),
			"utf8",
		);
		expect(note).toMatch(/org filter/i);
		expect(note).toMatch(/two[- ]orgs/i);
		expect(note).not.toMatch(/SOC 2 certified/i);
	});

	it("links the note from the Platform Readiness section source", () => {
		const section = PLATFORM_READINESS_ROADMAP_CATALOG.find(
			(s) => s.sectionNumber === 1,
		);
		expect(section?.sourceRef).toMatch(
			/docs\/internal\/workspace-isolation-note\.md/,
		);
	});
});
