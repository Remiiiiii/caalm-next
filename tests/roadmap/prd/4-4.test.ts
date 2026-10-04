import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "@/lib/roadmap/platform-readiness-catalog";
import { linkedPrNumbersForPrdSection } from "@/lib/roadmap/platform-readiness/prd-pr-batches";

describe("PRD 4.4 compliance tab honesty", () => {
	it("domain tabs show a banner when illustrative merge is active", () => {
		const tab = readFileSync(
			join(process.cwd(), "src/components/audits/AuditDomainTabContent.tsx"),
			"utf8",
		);
		expect(tab).toMatch(/getDomainHonestyNotice/);
		expect(tab).toMatch(/honesty\.show/);
		expect(tab).toMatch(/SampleDataBadge/);

		const helper = readFileSync(
			join(process.cwd(), "src/lib/audits/merge-live-data.ts"),
			"utf8",
		);
		expect(helper).toMatch(/getDomainHonestyNotice/);
		expect(helper).toMatch(/illustrative sample data/i);
	});

	it("analytics compliance tab keeps an honesty notice", () => {
		const source = readFileSync(
			join(process.cwd(), "src/components/analytics/AnalyticsComplianceTab.tsx"),
			"utf8",
		);
		expect(source).toMatch(/live data/);
		expect(source).toMatch(/USE_AUDIT_MOCK_DATA/);
	});

	it("live audit log page does not import mock domain merge", () => {
		const logPage = readFileSync(
			join(process.cwd(), "src/app/(root)/audits/audit/page.tsx"),
			"utf8",
		);
		expect(logPage).not.toMatch(/mergeDomainWithLiveData/);
		expect(logPage).not.toMatch(/USE_AUDIT_MOCK_DATA/);
	});

	it("documents section 4 and links PR 181", () => {
		const note = readFileSync(
			join(process.cwd(), "docs/internal/honest-dashboards-note.md"),
			"utf8",
		);
		expect(note).toMatch(/Sample data/);
		expect(note).toMatch(/NEXT_PUBLIC_AUDIT_MOCK_DATA/);

		const section = PLATFORM_READINESS_ROADMAP_CATALOG.find(
			(s) => s.sectionNumber === 4,
		);
		expect(section?.sourceRef).toMatch(
			/docs\/internal\/honest-dashboards-note\.md/,
		);
		expect(section?.linkedPrNumbers).toEqual(
			linkedPrNumbersForPrdSection(4),
		);
		expect(section?.linkedPrNumbers).toContain(181);
	});
});
