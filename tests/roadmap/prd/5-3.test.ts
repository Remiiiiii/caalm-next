import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "@/lib/roadmap/platform-readiness-catalog";
import { linkedPrNumbersForPrdSection } from "@/lib/roadmap/platform-readiness/prd-pr-batches";

describe("PRD 5.3 storage and monitoring truth", () => {
	it("storage metrics API has no fabricated platform estimates or silent mock", () => {
		const api = readFileSync(
			join(process.cwd(), "src/app/api/it/storage-metrics/route.ts"),
			"utf8",
		);
		expect(api).toMatch(/requireITRole/);
		expect(api).toMatch(/configured:\s*false/);
		expect(api).not.toMatch(/~\s*10%\s*larger|platformBreakdown/);

		const page = readFileSync(
			join(process.cwd(), "src/app/(root)/dashboard/it/storage/page.tsx"),
			"utf8",
		);
		expect(page).not.toMatch(/getMockMetrics/);
		expect(page).toMatch(/Not configured/);
	});

	it("system health uses live checks and honesty labels", () => {
		const source = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/dashboard/it/monitoring/system-health/page.tsx",
			),
			"utf8",
		);
		expect(source).toMatch(/\/api\/it\/dashboard/);
		expect(source).toMatch(/Connectivity only|connectivity/i);
		expect(source).toMatch(/SampleDataBadge/);
	});

	it("documents section 5 and links PR 184", () => {
		const note = readFileSync(
			join(process.cwd(), "docs/internal/it-portal-credibility-note.md"),
			"utf8",
		);
		expect(note).toMatch(/Not configured/);
		expect(note).toMatch(/PR #184|PR 184/);

		const section = PLATFORM_READINESS_ROADMAP_CATALOG.find(
			(s) => s.sectionNumber === 5,
		);
		expect(section?.sourceRef).toMatch(
			/docs\/internal\/it-portal-credibility-note\.md/,
		);
		expect(section?.linkedPrNumbers).toEqual(
			linkedPrNumbersForPrdSection(5),
		);
		expect(section?.linkedPrNumbers).toContain(184);
	});
});
