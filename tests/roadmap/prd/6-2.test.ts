import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "@/lib/roadmap/platform-readiness-catalog";
import { linkedPrNumbersForPrdSection } from "@/lib/roadmap/platform-readiness/prd-pr-batches";

describe("PRD 6.2 security questionnaire starter", () => {
	it("internal starter exists and does not claim SOC 2", () => {
		const doc = readFileSync(
			join(process.cwd(), "docs/internal/security-questionnaire-starter.md"),
			"utf8",
		);
		expect(doc).toMatch(/RBAC/);
		expect(doc).toMatch(/SOC 2.*Not claimed/i);
		expect(doc).not.toMatch(/SOC 2 Type II certified/i);
	});

	it("Enterprise pricing FAQ mentions vendor security review", () => {
		const pricing = readFileSync(
			join(process.cwd(), "public/PRICING.md"),
			"utf8",
		);
		expect(pricing).toMatch(/Vendor security review\?/);
		expect(pricing).toMatch(/do \*\*not\*\* claim SOC 2/i);
	});

	it("section 6 links internal docs and PR 183", () => {
		const section = PLATFORM_READINESS_ROADMAP_CATALOG.find(
			(s) => s.sectionNumber === 6,
		);
		expect(section?.sourceRef).toMatch(
			/security-questionnaire-starter\.md/,
		);
		expect(section?.linkedPrNumbers).toEqual(
			linkedPrNumbersForPrdSection(6),
		);
		expect(section?.linkedPrNumbers).toContain(183);
	});
});
