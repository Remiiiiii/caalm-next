import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "@/lib/roadmap/platform-readiness-catalog";
import { linkedPrNumbersForPrdSection } from "@/lib/roadmap/platform-readiness/prd-pr-batches";

/**
 * Two-org regression: if all_org ever drops orgId, CI fails here.
 */
describe("PRD 1.3 automated two-org regression", () => {
	it("fails CI when all_org query drops orgId", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/rbac/data-scope.ts"),
			"utf8",
		);
		// Pre-fix bug was: case "all_org": return [hidden];
		expect(source).not.toMatch(
			/case "all_org":\s*return \[\s*hidden\s*\]/,
		);
		expect(source).toMatch(
			/case "all_org":\s*return \[\s*hidden\s*,\s*orgFilter\s*\]/,
		);
	});

	it("section 1 is linked to batch PR 180 on the Platform Readiness board", () => {
		const section = PLATFORM_READINESS_ROADMAP_CATALOG.find(
			(s) => s.sectionNumber === 1,
		);
		expect(section?.linkedPrNumbers).toEqual(
			linkedPrNumbersForPrdSection(1),
		);
		expect(section?.linkedPrNumbers).toContain(180);
	});
});
