import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "@/lib/roadmap/platform-readiness-catalog";
import { linkedPrNumbersForPrdSection } from "@/lib/roadmap/platform-readiness/prd-pr-batches";
import {
	diffUnguardedAgainstBaseline,
	getUnguardedRoutes,
	loadApiAuthzBaseline,
	scanApiAuthzMatrix,
} from "@/lib/rbac/api-authz-matrix";

/** Pre–section 2 grandfather count (must not return). */
const BASELINE_BEFORE_SECTION_2 = 119;

describe("PRD 2.5 CI ratchet on the unguarded list", () => {
	const routes = scanApiAuthzMatrix();
	const baseline = loadApiAuthzBaseline();
	const diff = diffUnguardedAgainstBaseline(routes, baseline);

	it("baseline shrank from the section-2 starting count", () => {
		expect(baseline.unguarded.length).toBeLessThan(BASELINE_BEFORE_SECTION_2);
		expect(baseline.unguarded.length).toBe(
			getUnguardedRoutes(routes).length,
		);
	});

	it("ratchet forbids new unguarded routes without baseline review", () => {
		expect(diff.newUnguarded).toEqual([]);
	});

	it("documents the before/after delta for reviewers", () => {
		const note = readFileSync(
			join(process.cwd(), "docs/internal/api-permission-coverage-note.md"),
			"utf8",
		);
		expect(note).toMatch(/119/);
		expect(note).toMatch(/65/);
		expect(note).toMatch(/pnpm test:api-authz/);
	});

	it("links the note from the Platform Readiness section source", () => {
		const section = PLATFORM_READINESS_ROADMAP_CATALOG.find(
			(s) => s.sectionNumber === 2,
		);
		expect(section?.sourceRef).toMatch(
			/docs\/internal\/api-permission-coverage-note\.md/,
		);
	});

	it("section 2 is linked to batch PR 182", () => {
		const section = PLATFORM_READINESS_ROADMAP_CATALOG.find(
			(s) => s.sectionNumber === 2,
		);
		expect(section?.linkedPrNumbers).toEqual(
			linkedPrNumbersForPrdSection(2),
		);
		expect(section?.linkedPrNumbers).toContain(182);
	});
});
